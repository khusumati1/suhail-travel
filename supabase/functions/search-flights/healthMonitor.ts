// supabase/functions/search-flights/healthMonitor.ts
// ─────────────────────────────────────────────────────────
// Health Monitor — Provider health, auto-healing, chaos testing
// Reliability dashboard + anomaly detection
// ─────────────────────────────────────────────────────────
/// <reference path="../deno.d.ts" />

type Provider = 'amadeus' | 'kiwi' | 'cloudfares';

interface ProviderHealth {
  successes: number;
  failures: number;
  timeouts: number;
  totalLatencyMs: number;
  lastError?: string;
  lastErrorAt?: string;
  disabledUntil: number;
}

// ═══════════════════════════════════════════════════════════
// Provider Health Tracking
// ═══════════════════════════════════════════════════════════

const healthWindow = 300_000; // 5 min rolling window
const providers: Record<Provider, ProviderHealth> = {
  amadeus: { successes: 0, failures: 0, timeouts: 0, totalLatencyMs: 0, disabledUntil: 0 },
  kiwi: { successes: 0, failures: 0, timeouts: 0, totalLatencyMs: 0, disabledUntil: 0 },
  cloudfares: { successes: 0, failures: 0, timeouts: 0, totalLatencyMs: 0, disabledUntil: 0 },
};

// Time-windowed events for precise calculation
const events: Array<{ provider: Provider; type: 'ok' | 'fail' | 'timeout'; ts: number; ms: number }> = [];

export function recordProviderSuccess(provider: Provider, latencyMs: number): void {
  events.push({ provider, type: 'ok', ts: Date.now(), ms: latencyMs });
  providers[provider].successes++;
  providers[provider].totalLatencyMs += latencyMs;
  cleanupEvents();
}

export function recordProviderFailure(provider: Provider, error: string, isTimeout = false): void {
  const p = providers[provider];
  events.push({ provider, type: isTimeout ? 'timeout' : 'fail', ts: Date.now(), ms: 0 });
  if (isTimeout) p.timeouts++;
  else p.failures++;
  p.lastError = error;
  p.lastErrorAt = new Date().toISOString();
  cleanupEvents();

  // Auto-disable if health drops below 20%
  const health = getProviderHealthScore(provider);
  if (health < 20 && p.disabledUntil < Date.now()) {
    p.disabledUntil = Date.now() + 60_000; // Disable for 60s
    console.warn(JSON.stringify({
      ts: new Date().toISOString(), level: 'warn', event: 'provider_disabled',
      provider, health, disabledFor: '60s',
    }));
  }
}

export function isProviderEnabled(provider: Provider): boolean {
  return providers[provider].disabledUntil < Date.now();
}

function getProviderHealthScore(provider: Provider): number {
  const now = Date.now();
  const recent = events.filter(e => e.provider === provider && e.ts > now - healthWindow);
  if (recent.length === 0) return 100; // No data = assume healthy
  const ok = recent.filter(e => e.type === 'ok').length;
  return Math.round((ok / recent.length) * 100);
}

// ═══════════════════════════════════════════════════════════
// Auto-Healing Rules
// ═══════════════════════════════════════════════════════════

export interface HealingAction {
  type: 'reroute' | 'reduce_concurrency' | 'extend_timeout' | 'skip_provider';
  provider: Provider;
  reason: string;
}

export function getHealingActions(): HealingAction[] {
  const actions: HealingAction[] = [];

  for (const p of ['amadeus', 'kiwi', 'cloudfares'] as Provider[]) {
    const health = getProviderHealthScore(p);
    const h = providers[p];

    // Rule 1: Provider disabled → skip
    if (h.disabledUntil > Date.now()) {
      actions.push({ type: 'skip_provider', provider: p, reason: `Health ${health}% — disabled until recovery` });
    }

    // Rule 2: High timeout rate → extend timeout
    const now = Date.now();
    const recentTimeouts = events.filter(e => e.provider === p && e.type === 'timeout' && e.ts > now - 60_000).length;
    if (recentTimeouts >= 2) {
      actions.push({ type: 'extend_timeout', provider: p, reason: `${recentTimeouts} timeouts in last 60s` });
    }

    // Rule 3: Amadeus down → reroute to Kiwi + CloudFares
    if (p === 'amadeus' && health < 30) {
      actions.push({ type: 'reroute', provider: 'amadeus', reason: `Amadeus health ${health}% — promoting fallback providers` });
    }

    // Rule 4: High failure rate → reduce concurrency
    if (health < 50 && health >= 20) {
      actions.push({ type: 'reduce_concurrency', provider: p, reason: `Health ${health}% — reducing load` });
    }
  }

  return actions;
}

// ═══════════════════════════════════════════════════════════
// Reliability Dashboard
// ═══════════════════════════════════════════════════════════

const dashboard = {
  total_searches: 0,
  successful_searches: 0,
  failed_searches: 0,
  total_bookings: 0,
  successful_bookings: 0,
  failed_bookings: 0,
  price_mismatches: 0,
  cache_hits: 0,
  cache_misses: 0,
};

export function recordSearch(success: boolean): void {
  dashboard.total_searches++;
  if (success) dashboard.successful_searches++;
  else dashboard.failed_searches++;
}

export function recordBooking(success: boolean): void {
  dashboard.total_bookings++;
  if (success) dashboard.successful_bookings++;
  else dashboard.failed_bookings++;
}

export function recordPriceMismatch(): void { dashboard.price_mismatches++; }
export function recordDashboardCacheHit(): void { dashboard.cache_hits++; }
export function recordDashboardCacheMiss(): void { dashboard.cache_misses++; }

export function getReliabilityDashboard() {
  const now = Date.now();

  const providerStatus: Record<string, any> = {};
  for (const p of ['amadeus', 'kiwi', 'cloudfares'] as Provider[]) {
    const recent = events.filter(e => e.provider === p && e.ts > now - healthWindow);
    const ok = recent.filter(e => e.type === 'ok');
    const avgLatency = ok.length > 0 ? Math.round(ok.reduce((s, e) => s + e.ms, 0) / ok.length) : 0;

    providerStatus[p] = {
      health: getProviderHealthScore(p),
      enabled: isProviderEnabled(p),
      successes: ok.length,
      failures: recent.filter(e => e.type === 'fail').length,
      timeouts: recent.filter(e => e.type === 'timeout').length,
      avg_latency_ms: avgLatency,
      last_error: providers[p].lastError,
      last_error_at: providers[p].lastErrorAt,
    };
  }

  return {
    uptime: {
      search_success_pct: dashboard.total_searches > 0
        ? (dashboard.successful_searches / dashboard.total_searches * 100).toFixed(2) + '%' : 'N/A',
      booking_success_pct: dashboard.total_bookings > 0
        ? (dashboard.successful_bookings / dashboard.total_bookings * 100).toFixed(2) + '%' : 'N/A',
      price_mismatch_pct: dashboard.total_searches > 0
        ? (dashboard.price_mismatches / dashboard.total_searches * 100).toFixed(2) + '%' : '0%',
      cache_hit_pct: (dashboard.cache_hits + dashboard.cache_misses) > 0
        ? (dashboard.cache_hits / (dashboard.cache_hits + dashboard.cache_misses) * 100).toFixed(1) + '%' : 'N/A',
    },
    counters: { ...dashboard },
    providers: providerStatus,
    healing_actions: getHealingActions(),
  };
}

// ═══════════════════════════════════════════════════════════
// Chaos Testing Suite
// ═══════════════════════════════════════════════════════════

type ChaosMode = 'none' | 'redis_outage' | 'rate_limit_storm' | 'provider_timeout' | 'partial_corruption';

let chaosMode: ChaosMode = 'none';
let chaosExpires = 0;

export function enableChaos(mode: ChaosMode, durationMs: number = 30_000): void {
  chaosMode = mode;
  chaosExpires = Date.now() + durationMs;
  console.warn(JSON.stringify({
    ts: new Date().toISOString(), level: 'warn', event: 'chaos_enabled',
    mode, durationMs,
  }));
}

export function getChaosMode(): ChaosMode {
  if (chaosMode !== 'none' && Date.now() > chaosExpires) {
    chaosMode = 'none';
    console.info('[CHAOS] Expired — back to normal');
  }
  return chaosMode;
}

/** Chaos: simulate Redis outage */
export function shouldSimulateRedisDown(): boolean {
  return getChaosMode() === 'redis_outage';
}

/** Chaos: simulate 429 rate limit storm */
export function shouldSimulate429(): boolean {
  return getChaosMode() === 'rate_limit_storm';
}

/** Chaos: simulate provider timeout */
export function shouldSimulateTimeout(): boolean {
  return getChaosMode() === 'provider_timeout';
}

/** Chaos: corrupt partial results */
export function shouldCorruptResults(): boolean {
  return getChaosMode() === 'partial_corruption';
}

export function getChaosStatus() {
  return {
    mode: getChaosMode(),
    expires: chaosMode !== 'none' ? new Date(chaosExpires).toISOString() : null,
    remaining_ms: chaosMode !== 'none' ? Math.max(0, chaosExpires - Date.now()) : 0,
  };
}

// ═══════════════════════════════════════════════════════════
// Cleanup
// ═══════════════════════════════════════════════════════════

function cleanupEvents(): void {
  const cutoff = Date.now() - healthWindow;
  while (events.length > 0 && events[0].ts < cutoff) events.shift();
  if (events.length > 1000) events.splice(0, events.length - 500); // Safety cap
}
