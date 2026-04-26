// supabase/functions/search-flights/slaGuard.ts
// ─────────────────────────────────────────────────────────
// SLA Guard — Latency-aware auto-degradation
// Monitors pricing latency → auto degrade mode if SLA breached
// + Alert webhook + anomaly detection
// ─────────────────────────────────────────────────────────
/// <reference path="../deno.d.ts" />

const PRICING_SLA_MS       = 5000;   // 5s threshold
const SEARCH_SLA_MS        = 10000;  // 10s threshold
const DEGRADE_WINDOW       = 60_000; // 1 min window
const DEGRADE_THRESHOLD    = 3;      // 3 SLA breaches → degrade
const RECOVERY_WINDOW      = 120_000;// 2 min before auto-recovery
const ANOMALY_THRESHOLD    = 0.30;   // 30% error rate = anomaly

type SystemMode = 'NORMAL' | 'DEGRADED' | 'EMERGENCY';

// ── State ──
let mode: SystemMode = 'NORMAL';
let degradedSince = 0;
const recentPricingLatencies: { ms: number; ts: number }[] = [];
const recentSearchLatencies: { ms: number; ts: number }[] = [];
const recentErrors: { ts: number; type: string }[] = [];
const alertHistory: { ts: number; type: string }[] = [];

const ALERT_WEBHOOK = Deno.env.get('ALERT_WEBHOOK_URL') || '';
const ALERT_COOLDOWN_MS = 300_000; // 5 min between same alerts

// ═══════════════════════════════════════════════════════════
// Record Metrics
// ═══════════════════════════════════════════════════════════

export function recordPricingLatency(ms: number): void {
  cleanup();
  recentPricingLatencies.push({ ms, ts: Date.now() });

  if (ms > PRICING_SLA_MS) {
    checkForDegrade('PRICING_SLA_BREACH', ms);
  }
}

export function recordSearchLatency(ms: number): void {
  cleanup();
  recentSearchLatencies.push({ ms, ts: Date.now() });

  if (ms > SEARCH_SLA_MS) {
    checkForDegrade('SEARCH_SLA_BREACH', ms);
  }
}

export function recordError(type: string): void {
  cleanup();
  recentErrors.push({ ts: Date.now(), type });
  checkForAnomalies();
}

// ═══════════════════════════════════════════════════════════
// Degrade Mode Engine
// ═══════════════════════════════════════════════════════════

function checkForDegrade(reason: string, latencyMs: number): void {
  const now = Date.now();
  const recentBreaches = recentPricingLatencies
    .filter(l => l.ts > now - DEGRADE_WINDOW && l.ms > PRICING_SLA_MS).length
    + recentSearchLatencies
    .filter(l => l.ts > now - DEGRADE_WINDOW && l.ms > SEARCH_SLA_MS).length;

  if (recentBreaches >= DEGRADE_THRESHOLD && mode === 'NORMAL') {
    mode = 'DEGRADED';
    degradedSince = now;
    console.error(JSON.stringify({
      ts: new Date().toISOString(), level: 'error', event: 'sla_degrade',
      reason, latencyMs, breaches: recentBreaches, mode: 'DEGRADED',
    }));
    sendAlert('SLA_DEGRADE', { reason, breaches: recentBreaches, latencyMs });
  }
}

function checkForAnomalies(): void {
  const now = Date.now();
  const windowErrors = recentErrors.filter(e => e.ts > now - DEGRADE_WINDOW).length;
  const windowSearches = recentSearchLatencies.filter(l => l.ts > now - DEGRADE_WINDOW).length || 1;
  const errorRate = windowErrors / windowSearches;

  if (errorRate > ANOMALY_THRESHOLD && mode !== 'EMERGENCY') {
    mode = 'EMERGENCY';
    degradedSince = now;
    console.error(JSON.stringify({
      ts: new Date().toISOString(), level: 'fatal', event: 'anomaly_detected',
      errorRate: (errorRate * 100).toFixed(1) + '%', errors: windowErrors, searches: windowSearches,
    }));
    sendAlert('ANOMALY_DETECTED', { errorRate, errors: windowErrors });
  }
}

/** Auto-recovery check — called on every request */
export function checkRecovery(): void {
  if (mode === 'NORMAL') return;

  const now = Date.now();
  if (now - degradedSince > RECOVERY_WINDOW) {
    // Check if recent latencies are healthy
    const recentOk = recentPricingLatencies
      .filter(l => l.ts > now - 30_000)
      .every(l => l.ms < PRICING_SLA_MS);

    const recentErrorRate = recentErrors.filter(e => e.ts > now - 30_000).length;

    if (recentOk && recentErrorRate < 2) {
      const prevMode = mode;
      mode = 'NORMAL';
      console.info(JSON.stringify({
        ts: new Date().toISOString(), level: 'info', event: 'sla_recovered',
        prevMode, recoveryMs: now - degradedSince,
      }));
      sendAlert('SLA_RECOVERED', { prevMode, recoveryMs: now - degradedSince });
    }
  }
}

// ═══════════════════════════════════════════════════════════
// Public API
// ═══════════════════════════════════════════════════════════

export function getSystemMode(): SystemMode { return mode; }

/** Get degraded pricing config */
export function getDegradedConfig() {
  switch (mode) {
    case 'DEGRADED':
      return {
        mode: 'DEGRADED',
        maxEagerPricing: 5,         // Reduce from 10 → 5
        pricingBatchSize: 3,        // Reduce from 5 → 3
        pricingTimeoutMs: 8000,     // Reduce from 12s → 8s
        skipBackgroundPricing: true, // Don't waste resources
      };
    case 'EMERGENCY':
      return {
        mode: 'EMERGENCY',
        maxEagerPricing: 3,         // Only top 3
        pricingBatchSize: 2,
        pricingTimeoutMs: 5000,
        skipBackgroundPricing: true,
      };
    default:
      return {
        mode: 'NORMAL',
        maxEagerPricing: 10,
        pricingBatchSize: 5,
        pricingTimeoutMs: 12000,
        skipBackgroundPricing: false,
      };
  }
}

export function getSLAStatus() {
  const now = Date.now();
  const window = DEGRADE_WINDOW;
  const pricingInWindow = recentPricingLatencies.filter(l => l.ts > now - window);
  const searchInWindow = recentSearchLatencies.filter(l => l.ts > now - window);
  const errorsInWindow = recentErrors.filter(e => e.ts > now - window);

  const avgPricing = pricingInWindow.length > 0
    ? Math.round(pricingInWindow.reduce((s, l) => s + l.ms, 0) / pricingInWindow.length) : 0;
  const avgSearch = searchInWindow.length > 0
    ? Math.round(searchInWindow.reduce((s, l) => s + l.ms, 0) / searchInWindow.length) : 0;
  const p95Pricing = pricingInWindow.length > 0
    ? pricingInWindow.sort((a, b) => a.ms - b.ms)[Math.floor(pricingInWindow.length * 0.95)]?.ms || 0 : 0;
  const p95Search = searchInWindow.length > 0
    ? searchInWindow.sort((a, b) => a.ms - b.ms)[Math.floor(searchInWindow.length * 0.95)]?.ms || 0 : 0;

  return {
    mode,
    degraded_since: mode !== 'NORMAL' ? new Date(degradedSince).toISOString() : null,
    pricing: {
      sla_threshold_ms: PRICING_SLA_MS,
      avg_ms: avgPricing,
      p95_ms: p95Pricing,
      samples: pricingInWindow.length,
      breaches: pricingInWindow.filter(l => l.ms > PRICING_SLA_MS).length,
    },
    search: {
      sla_threshold_ms: SEARCH_SLA_MS,
      avg_ms: avgSearch,
      p95_ms: p95Search,
      samples: searchInWindow.length,
      breaches: searchInWindow.filter(l => l.ms > SEARCH_SLA_MS).length,
    },
    errors: {
      count: errorsInWindow.length,
      rate: searchInWindow.length > 0
        ? (errorsInWindow.length / searchInWindow.length * 100).toFixed(1) + '%' : '0%',
      types: [...new Set(errorsInWindow.map(e => e.type))],
    },
  };
}

// ═══════════════════════════════════════════════════════════
// Cleanup + Alerts
// ═══════════════════════════════════════════════════════════

function cleanup(): void {
  const cutoff = Date.now() - 300_000; // Keep 5 min of data
  while (recentPricingLatencies.length > 0 && recentPricingLatencies[0].ts < cutoff) recentPricingLatencies.shift();
  while (recentSearchLatencies.length > 0 && recentSearchLatencies[0].ts < cutoff) recentSearchLatencies.shift();
  while (recentErrors.length > 0 && recentErrors[0].ts < cutoff) recentErrors.shift();
  while (alertHistory.length > 100) alertHistory.shift();
}

async function sendAlert(type: string, data: Record<string, any>): Promise<void> {
  if (!ALERT_WEBHOOK) return;

  // Cooldown check
  const now = Date.now();
  const recent = alertHistory.find(a => a.type === type && a.ts > now - ALERT_COOLDOWN_MS);
  if (recent) return;
  alertHistory.push({ ts: now, type });

  try {
    await fetch(ALERT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert: type,
        timestamp: new Date().toISOString(),
        system: 'flight-engine',
        ...data,
      }),
      signal: AbortSignal.timeout(3000),
    });
  } catch (err: any) {
    console.error(`[ALERT] Failed to send ${type}: ${err.message}`);
  }
}
