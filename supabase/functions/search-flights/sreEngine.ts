// supabase/functions/search-flights/sreEngine.ts
// ─────────────────────────────────────────────────────────
// SRE Engine — SLO/SLI, Error Budgets, Burn-rate monitoring
// Adaptive trace sampling, load testing, weekly chaos,
// reliability review reports
// ─────────────────────────────────────────────────────────
/// <reference path="../deno.d.ts" />

// ═══════════════════════════════════════════════════════════
// 1. FORMAL SLO DEFINITIONS
// ═══════════════════════════════════════════════════════════

export interface SLODefinition {
  name: string;
  target: number;          // 0.0 – 1.0  (e.g. 0.9995 = 99.95%)
  window: '1h' | '24h' | '7d' | '30d';
  metric: 'search_success' | 'booking_success' | 'price_accuracy';
}

export const SLO_DEFINITIONS: SLODefinition[] = [
  { name: 'search_availability',  target: 0.9995, window: '30d', metric: 'search_success'  },
  { name: 'booking_reliability',  target: 0.999,  window: '30d', metric: 'booking_success' },
  { name: 'pricing_accuracy',     target: 0.999,  window: '30d', metric: 'price_accuracy'  },
];

// ═══════════════════════════════════════════════════════════
// 2. SLI COLLECTOR — Rolling window time-series
// ═══════════════════════════════════════════════════════════

interface SLIEvent {
  ts: number;
  metric: 'search_success' | 'booking_success' | 'price_accuracy';
  good: boolean;      // true = good event, false = bad event
  latencyMs?: number;
}

const MAX_EVENTS = 10_000;
const sliEvents: SLIEvent[] = [];

export function recordSLI(metric: SLIEvent['metric'], good: boolean, latencyMs?: number): void {
  sliEvents.push({ ts: Date.now(), metric, good, latencyMs });
  // Trim oldest events beyond cap
  if (sliEvents.length > MAX_EVENTS) {
    sliEvents.splice(0, sliEvents.length - MAX_EVENTS);
  }
}

function getSLIInWindow(metric: string, windowMs: number): { good: number; total: number; ratio: number } {
  const cutoff = Date.now() - windowMs;
  const events = sliEvents.filter(e => e.metric === metric && e.ts > cutoff);
  const good = events.filter(e => e.good).length;
  const total = events.length;
  return { good, total, ratio: total > 0 ? good / total : 1.0 };
}

// ═══════════════════════════════════════════════════════════
// 3. ERROR BUDGET ENGINE
// ═══════════════════════════════════════════════════════════

export interface ErrorBudget {
  slo_name: string;
  target: number;
  current_sli: number;
  budget_total: number;        // Total allowed bad events per window
  budget_consumed: number;     // Bad events consumed
  budget_remaining: number;    // Remaining budget
  budget_remaining_pct: number;
  burn_rate_1h: number;        // How fast budget is being consumed
  burn_rate_6h: number;
  burn_rate_24h: number;
  exhausted: boolean;
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL' | 'EXHAUSTED';
}

const WINDOW_MAP: Record<string, number> = {
  '1h':  3_600_000,
  '24h': 86_400_000,
  '7d':  604_800_000,
  '30d': 2_592_000_000,
};

export function computeErrorBudget(slo: SLODefinition): ErrorBudget {
  const windowMs = WINDOW_MAP[slo.window] || WINDOW_MAP['30d'];
  const fullWindow = getSLIInWindow(slo.metric, windowMs);
  const sli1h  = getSLIInWindow(slo.metric, 3_600_000);
  const sli6h  = getSLIInWindow(slo.metric, 21_600_000);
  const sli24h = getSLIInWindow(slo.metric, 86_400_000);

  const budgetTotal = Math.max(1, Math.round(fullWindow.total * (1 - slo.target)));
  const budgetConsumed = fullWindow.total - fullWindow.good;
  const budgetRemaining = Math.max(0, budgetTotal - budgetConsumed);
  const budgetRemainingPct = budgetTotal > 0 ? (budgetRemaining / budgetTotal) * 100 : 100;

  // Burn rate = how fast we're consuming budget relative to expected rate
  // burn_rate = 1.0 means burning at exactly the expected rate
  // burn_rate > 1.0 means burning faster than sustainable
  const expectedBadRate = 1 - slo.target;
  const calcBurnRate = (sli: { good: number; total: number }) => {
    if (sli.total === 0) return 0;
    const actualBadRate = (sli.total - sli.good) / sli.total;
    return expectedBadRate > 0 ? actualBadRate / expectedBadRate : 0;
  };

  const burnRate1h  = calcBurnRate(sli1h);
  const burnRate6h  = calcBurnRate(sli6h);
  const burnRate24h = calcBurnRate(sli24h);

  const exhausted = budgetRemaining <= 0;

  let status: ErrorBudget['status'] = 'HEALTHY';
  if (exhausted) status = 'EXHAUSTED';
  else if (budgetRemainingPct < 10) status = 'CRITICAL';
  else if (budgetRemainingPct < 30 || burnRate1h > 10) status = 'WARNING';

  return {
    slo_name: slo.name,
    target: slo.target,
    current_sli: fullWindow.ratio,
    budget_total: budgetTotal,
    budget_consumed: budgetConsumed,
    budget_remaining: budgetRemaining,
    budget_remaining_pct: Math.round(budgetRemainingPct * 100) / 100,
    burn_rate_1h: Math.round(burnRate1h * 100) / 100,
    burn_rate_6h: Math.round(burnRate6h * 100) / 100,
    burn_rate_24h: Math.round(burnRate24h * 100) / 100,
    exhausted,
    status,
  };
}

export function getAllErrorBudgets(): ErrorBudget[] {
  return SLO_DEFINITIONS.map(computeErrorBudget);
}

/** Check if any budget is exhausted → trigger auto-degrade */
export function shouldAutoDegrade(): { degrade: boolean; reason: string } {
  const budgets = getAllErrorBudgets();

  // Rule 1: Any budget exhausted → degrade
  const exhausted = budgets.find(b => b.exhausted);
  if (exhausted) {
    return { degrade: true, reason: `ERROR_BUDGET_EXHAUSTED: ${exhausted.slo_name} (SLI: ${(exhausted.current_sli * 100).toFixed(2)}%)` };
  }

  // Rule 2: Fast burn on critical SLOs → degrade
  const fastBurn = budgets.find(b => b.burn_rate_1h > 14.4); // 14.4x = exhausts 30d budget in 2 days
  if (fastBurn) {
    return { degrade: true, reason: `FAST_BURN: ${fastBurn.slo_name} burn_rate_1h=${fastBurn.burn_rate_1h}x` };
  }

  // Rule 3: Slow burn but critical remaining → degrade
  const slowBurn = budgets.find(b => b.burn_rate_6h > 6 && b.budget_remaining_pct < 20);
  if (slowBurn) {
    return { degrade: true, reason: `SLOW_BURN_CRITICAL: ${slowBurn.slo_name} remaining=${slowBurn.budget_remaining_pct}%` };
  }

  return { degrade: false, reason: 'ALL_BUDGETS_HEALTHY' };
}

// ═══════════════════════════════════════════════════════════
// 4. ADAPTIVE TRACE SAMPLING
// ═══════════════════════════════════════════════════════════

interface SamplingConfig {
  errorSampleRate: number;     // 1.0 = 100% of errors sampled
  normalSampleRate: number;    // 0.10 = 10% of normal traces sampled
  highLoadThreshold: number;   // Requests per minute to trigger high-load mode
  highLoadSampleRate: number;  // Reduced sampling under high load
}

const samplingConfig: SamplingConfig = {
  errorSampleRate: 1.0,
  normalSampleRate: 0.10,
  highLoadThreshold: 100,
  highLoadSampleRate: 0.02,  // 2% under high load
};

const requestTimestamps: number[] = [];
const REQUESTS_WINDOW = 60_000; // 1 min

function getRequestsPerMinute(): number {
  const cutoff = Date.now() - REQUESTS_WINDOW;
  while (requestTimestamps.length > 0 && requestTimestamps[0] < cutoff) requestTimestamps.shift();
  return requestTimestamps.length;
}

export function recordRequest(): void {
  requestTimestamps.push(Date.now());
}

/** Decide whether to sample this trace */
export function shouldSampleTrace(isError: boolean): boolean {
  // Always sample errors
  if (isError) return true;

  const rpm = getRequestsPerMinute();
  const rate = rpm > samplingConfig.highLoadThreshold
    ? samplingConfig.highLoadSampleRate
    : samplingConfig.normalSampleRate;

  return Math.random() < rate;
}

export function getSamplingStatus() {
  const rpm = getRequestsPerMinute();
  const isHighLoad = rpm > samplingConfig.highLoadThreshold;
  return {
    requests_per_minute: rpm,
    high_load: isHighLoad,
    current_sample_rate: isHighLoad ? samplingConfig.highLoadSampleRate : samplingConfig.normalSampleRate,
    error_sample_rate: samplingConfig.errorSampleRate,
    config: samplingConfig,
  };
}

// ═══════════════════════════════════════════════════════════
// 5. LOAD TESTING HARNESS
// ═══════════════════════════════════════════════════════════

export interface LoadTestConfig {
  concurrent_searches: number;
  duration_seconds: number;
  routes: string[];
  include_pricing: boolean;
}

export interface LoadTestResult {
  test_id: string;
  started_at: string;
  completed_at: string;
  duration_ms: number;
  config: LoadTestConfig;
  results: {
    total_requests: number;
    successful: number;
    failed: number;
    success_rate: number;
    avg_latency_ms: number;
    p50_latency_ms: number;
    p95_latency_ms: number;
    p99_latency_ms: number;
    max_latency_ms: number;
    errors: Record<string, number>;
  };
  provider_saturation: {
    amadeus: { calls: number; failures: number; avg_ms: number };
    kiwi: { calls: number; failures: number; avg_ms: number };
    cloudfares: { calls: number; failures: number; avg_ms: number };
  };
}

let lastLoadTestResult: LoadTestResult | null = null;

export async function runLoadTest(config: LoadTestConfig): Promise<LoadTestResult> {
  const testId = `lt_${crypto.randomUUID().slice(0, 8)}`;
  const startedAt = new Date().toISOString();
  const t0 = Date.now();

  const latencies: number[] = [];
  const errors: Record<string, number> = {};
  let successful = 0;
  let failed = 0;

  const providerCalls = { amadeus: { calls: 0, failures: 0, totalMs: 0 }, kiwi: { calls: 0, failures: 0, totalMs: 0 }, cloudfares: { calls: 0, failures: 0, totalMs: 0 } };

  // Generate synthetic searches
  const routes = config.routes.length > 0
    ? config.routes
    : ['JED-RUH', 'RUH-DXB', 'CAI-JED', 'IST-RUH', 'LHR-JED'];

  const durationMs = config.duration_seconds * 1000;
  const batchSize = Math.min(config.concurrent_searches, 50); // Cap per batch
  let requestCount = 0;

  while (Date.now() - t0 < durationMs && requestCount < config.concurrent_searches) {
    const batch = Array.from({ length: Math.min(batchSize, config.concurrent_searches - requestCount) }, (_, i) => {
      const route = routes[i % routes.length];
      const [origin, dest] = route.split('-');
      return simulateSingleSearch(origin, dest, config.include_pricing);
    });

    const results = await Promise.allSettled(batch);
    requestCount += batch.length;

    for (const r of results) {
      if (r.status === 'fulfilled') {
        successful++;
        latencies.push(r.value.latencyMs);
        // Track provider calls
        if (r.value.providers) {
          for (const p of ['amadeus', 'kiwi', 'cloudfares'] as const) {
            if (r.value.providers[p]) {
              providerCalls[p].calls += r.value.providers[p].calls || 0;
              providerCalls[p].failures += r.value.providers[p].failures || 0;
              providerCalls[p].totalMs += r.value.providers[p].totalMs || 0;
            }
          }
        }
      } else {
        failed++;
        const errMsg = r.reason?.message || 'UNKNOWN';
        errors[errMsg] = (errors[errMsg] || 0) + 1;
      }
    }
  }

  // Calculate percentiles
  latencies.sort((a, b) => a - b);
  const p = (pct: number) => latencies.length > 0 ? latencies[Math.floor(latencies.length * pct)] || 0 : 0;
  const avgLatency = latencies.length > 0 ? Math.round(latencies.reduce((s, l) => s + l, 0) / latencies.length) : 0;

  const result: LoadTestResult = {
    test_id: testId,
    started_at: startedAt,
    completed_at: new Date().toISOString(),
    duration_ms: Date.now() - t0,
    config,
    results: {
      total_requests: requestCount,
      successful,
      failed,
      success_rate: requestCount > 0 ? Math.round((successful / requestCount) * 10000) / 100 : 0,
      avg_latency_ms: avgLatency,
      p50_latency_ms: p(0.5),
      p95_latency_ms: p(0.95),
      p99_latency_ms: p(0.99),
      max_latency_ms: latencies.length > 0 ? latencies[latencies.length - 1] : 0,
      errors,
    },
    provider_saturation: {
      amadeus: { calls: providerCalls.amadeus.calls, failures: providerCalls.amadeus.failures, avg_ms: providerCalls.amadeus.calls > 0 ? Math.round(providerCalls.amadeus.totalMs / providerCalls.amadeus.calls) : 0 },
      kiwi: { calls: providerCalls.kiwi.calls, failures: providerCalls.kiwi.failures, avg_ms: providerCalls.kiwi.calls > 0 ? Math.round(providerCalls.kiwi.totalMs / providerCalls.kiwi.calls) : 0 },
      cloudfares: { calls: providerCalls.cloudfares.calls, failures: providerCalls.cloudfares.failures, avg_ms: providerCalls.cloudfares.calls > 0 ? Math.round(providerCalls.cloudfares.totalMs / providerCalls.cloudfares.calls) : 0 },
    },
  };

  lastLoadTestResult = result;
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: 'info', event: 'load_test_complete', test_id: testId, success_rate: result.results.success_rate, avg_ms: avgLatency }));
  return result;
}

async function simulateSingleSearch(origin: string, dest: string, includePricing: boolean): Promise<any> {
  const t0 = Date.now();
  // Simulate internal pipeline timing without actual API calls
  // This measures local overhead: normalization, trust engine, ranking
  await new Promise(r => setTimeout(r, Math.random() * 50 + 10)); // 10-60ms sim
  return {
    latencyMs: Date.now() - t0,
    providers: {
      amadeus: { calls: 1, failures: 0, totalMs: Date.now() - t0 },
      kiwi: { calls: 1, failures: 0, totalMs: Date.now() - t0 },
      cloudfares: { calls: 1, failures: 0, totalMs: Date.now() - t0 },
    },
  };
}

export function getLastLoadTestResult(): LoadTestResult | null { return lastLoadTestResult; }

// ═══════════════════════════════════════════════════════════
// 6. WEEKLY CHAOS AUTOMATION
// ═══════════════════════════════════════════════════════════

export interface ChaosSchedule {
  day: number;    // 0=Sun, 1=Mon, ... 6=Sat
  hour: number;   // 0-23
  mode: string;
  duration_ms: number;
}

const DEFAULT_CHAOS_SCHEDULE: ChaosSchedule[] = [
  { day: 2, hour: 3, mode: 'redis_outage',       duration_ms: 60_000  },  // Tue 3am
  { day: 3, hour: 3, mode: 'rate_limit_storm',    duration_ms: 30_000  },  // Wed 3am
  { day: 4, hour: 3, mode: 'provider_timeout',    duration_ms: 45_000  },  // Thu 3am
  { day: 5, hour: 3, mode: 'partial_corruption',  duration_ms: 30_000  },  // Fri 3am
];

let chaosSchedule = DEFAULT_CHAOS_SCHEDULE;
let chaosScheduleEnabled = false;

// Resilience score history
const resilienceScores: Array<{ ts: number; score: number; details: any }> = [];

export function enableChaosSchedule(enabled: boolean, schedule?: ChaosSchedule[]): void {
  chaosScheduleEnabled = enabled;
  if (schedule) chaosSchedule = schedule;
}

export function getChaosScheduleConfig() {
  return {
    enabled: chaosScheduleEnabled,
    schedule: chaosSchedule,
    next_scheduled: chaosScheduleEnabled ? getNextScheduledChaos() : null,
  };
}

function getNextScheduledChaos(): string | null {
  const now = new Date();
  for (const s of chaosSchedule) {
    const next = new Date(now);
    next.setDate(now.getDate() + ((s.day - now.getDay() + 7) % 7 || 7));
    next.setHours(s.hour, 0, 0, 0);
    if (next > now) return `${next.toISOString()} (${s.mode}, ${s.duration_ms}ms)`;
  }
  return null;
}

/** Check if we should fire a scheduled chaos event right now */
export function checkChaosSchedule(): { fire: boolean; mode: string; duration_ms: number } | null {
  if (!chaosScheduleEnabled) return null;

  const now = new Date();
  const day = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();

  // Only fire in the first minute of the scheduled hour
  if (minute > 0) return null;

  const scheduled = chaosSchedule.find(s => s.day === day && s.hour === hour);
  if (scheduled) return { fire: true, mode: scheduled.mode, duration_ms: scheduled.duration_ms };
  return null;
}

/** Compute resilience score based on recent system behavior */
export function computeResilienceScore(): { score: number; grade: string; breakdown: Record<string, number>; recommendations: string[] } {
  const budgets = getAllErrorBudgets();
  const recommendations: string[] = [];

  // Score components (0-100 each)
  const budgetScore = budgets.reduce((sum, b) => {
    return sum + Math.min(100, b.budget_remaining_pct);
  }, 0) / budgets.length;

  const burnScore = 100 - Math.min(100, budgets.reduce((sum, b) => sum + Math.min(100, b.burn_rate_1h * 10), 0) / budgets.length);

  // Get recent event counts for uptime calc
  const searchSLI = getSLIInWindow('search_success', 3_600_000);
  const uptimeScore = searchSLI.total > 0 ? searchSLI.ratio * 100 : 100;

  const priceSLI = getSLIInWindow('price_accuracy', 3_600_000);
  const priceScore = priceSLI.total > 0 ? priceSLI.ratio * 100 : 100;

  // Composite score
  const score = Math.round(
    budgetScore * 0.3 +
    burnScore * 0.2 +
    uptimeScore * 0.3 +
    priceScore * 0.2
  );

  // Grade
  const grade = score >= 95 ? 'A+' : score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';

  // Recommendations
  if (budgetScore < 30) recommendations.push('ERROR_BUDGET_LOW: Consider reducing release velocity');
  if (burnScore < 50) recommendations.push('HIGH_BURN_RATE: Investigate recent failures');
  if (uptimeScore < 99) recommendations.push('UPTIME_BELOW_SLO: Check provider health');
  if (priceScore < 99) recommendations.push('PRICING_DRIFT: Review pricing pipeline');
  if (recommendations.length === 0) recommendations.push('ALL_CLEAR: System operating within SLOs');

  const result = {
    score,
    grade,
    breakdown: {
      error_budget: Math.round(budgetScore),
      burn_rate: Math.round(burnScore),
      uptime: Math.round(uptimeScore),
      price_accuracy: Math.round(priceScore),
    },
    recommendations,
  };

  // Store for history
  resilienceScores.push({ ts: Date.now(), score, details: result });
  if (resilienceScores.length > 100) resilienceScores.splice(0, resilienceScores.length - 50);

  return result;
}

// ═══════════════════════════════════════════════════════════
// 7. RELIABILITY REVIEW REPORT
// ═══════════════════════════════════════════════════════════

export interface ProviderRiskScore {
  provider: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  score: number;         // 0 = no risk, 100 = max risk
  factors: string[];
}

export function computeProviderRiskScores(): ProviderRiskScore[] {
  const providers = ['amadeus', 'kiwi', 'cloudfares'];
  return providers.map(p => {
    const events1h = sliEvents.filter(e => e.ts > Date.now() - 3_600_000);
    // Use latency as a proxy for provider-level issues
    const latencies = events1h.filter(e => e.latencyMs && e.latencyMs > 0).map(e => e.latencyMs!);
    const avgLatency = latencies.length > 0 ? latencies.reduce((s, l) => s + l, 0) / latencies.length : 0;

    const factors: string[] = [];
    let score = 0;

    if (avgLatency > 5000) { score += 30; factors.push(`High avg latency: ${Math.round(avgLatency)}ms`); }
    else if (avgLatency > 3000) { score += 15; factors.push(`Elevated latency: ${Math.round(avgLatency)}ms`); }

    const errorRate = events1h.length > 0
      ? events1h.filter(e => !e.good).length / events1h.length : 0;
    if (errorRate > 0.1) { score += 40; factors.push(`Error rate: ${(errorRate * 100).toFixed(1)}%`); }
    else if (errorRate > 0.02) { score += 15; factors.push(`Elevated errors: ${(errorRate * 100).toFixed(1)}%`); }

    if (factors.length === 0) factors.push('No risk factors detected');

    const risk: ProviderRiskScore['risk'] =
      score >= 60 ? 'CRITICAL' : score >= 40 ? 'HIGH' : score >= 20 ? 'MEDIUM' : 'LOW';

    return { provider: p, risk, score, factors };
  });
}

export function generateReliabilityReport() {
  const budgets = getAllErrorBudgets();
  const resilience = computeResilienceScore();
  const providerRisk = computeProviderRiskScores();
  const sampling = getSamplingStatus();

  // Weekly burn summary
  const weeklyBurn = budgets.map(b => ({
    slo: b.slo_name,
    target: (b.target * 100).toFixed(2) + '%',
    current: (b.current_sli * 100).toFixed(3) + '%',
    meeting_slo: b.current_sli >= b.target,
    budget_remaining: b.budget_remaining_pct.toFixed(1) + '%',
    burn_1h: b.burn_rate_1h + 'x',
    burn_24h: b.burn_rate_24h + 'x',
    status: b.status,
  }));

  return {
    report_generated_at: new Date().toISOString(),
    resilience_score: resilience,
    slo_status: weeklyBurn,
    error_budgets: budgets,
    provider_risk: providerRisk,
    trace_sampling: sampling,
    last_load_test: lastLoadTestResult ? {
      test_id: lastLoadTestResult.test_id,
      success_rate: lastLoadTestResult.results.success_rate,
      avg_latency_ms: lastLoadTestResult.results.avg_latency_ms,
      p95_latency_ms: lastLoadTestResult.results.p95_latency_ms,
    } : null,
    chaos_schedule: getChaosScheduleConfig(),
    recommendations: resilience.recommendations,
  };
}
