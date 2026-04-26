// supabase/functions/search-flights/amadeus.ts
// ─────────────────────────────────────────────────────────
// Amadeus — Global Scale
// OAuth2 + Search + Pricing + Circuit Breakers
// + Redis Rate Limiter + Redis Pricing Cache + Cost Tracking
// ─────────────────────────────────────────────────────────
/// <reference path="../deno.d.ts" />

import { ConfirmedOffer, PricingResult } from "./types.ts";
import { redisIncr, isRedisEnabled } from "./redis.ts";
import { getPricingFromRedis, setPricingInRedis } from "./cache.ts";

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

let amadeusToken: string | null = null;
let tokenExpiresAt = 0;
let refreshPromise: Promise<string> | null = null;

// ═══════════════════════════════════════════════════════════
// Search Circuit Breaker
// ═══════════════════════════════════════════════════════════
let circuitState: CircuitState = 'CLOSED';
let failureCount = 0;
let nextRetryAt = 0;
const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 60_000;

// ═══════════════════════════════════════════════════════════
// Pricing Circuit Breaker (separate)
// ═══════════════════════════════════════════════════════════
let pricingCircuit: CircuitState = 'CLOSED';
let pricingFailures = 0;
let pricingNextRetry = 0;
const PRICING_FAILURE_THRESHOLD = 3;
const PRICING_COOLDOWN_MS = 30_000;

// ═══════════════════════════════════════════════════════════
// Rate Limiter — Redis (distributed) + local fallback
// ═══════════════════════════════════════════════════════════
const LOCAL_RATE_LIMIT_MAX = 5;
const localRateLimitTimestamps: number[] = [];

async function acquireRateLimit(): Promise<boolean> {
  // ── Try Redis first (global distributed) ──
  if (isRedisEnabled()) {
    try {
      const key = `rl:amadeus:pricing:${Math.floor(Date.now() / 1000)}`;
      const count = await redisIncr(key, 2); // 2s TTL
      if (count > LOCAL_RATE_LIMIT_MAX) {
        console.warn(`[RATE_LIMIT] Redis: ${count}/${LOCAL_RATE_LIMIT_MAX} — throttled`);
        return false;
      }
      return true;
    } catch {
      // Fallback to local
    }
  }

  // ── Local fallback ──
  const now = Date.now();
  while (localRateLimitTimestamps.length > 0 && localRateLimitTimestamps[0] < now - 1000) {
    localRateLimitTimestamps.shift();
  }
  if (localRateLimitTimestamps.length >= LOCAL_RATE_LIMIT_MAX) {
    return false;
  }
  localRateLimitTimestamps.push(now);
  return true;
}

async function waitForRateLimit(): Promise<void> {
  for (let i = 0; i < 20; i++) {
    if (await acquireRateLimit()) return;
    await sleep(100);
  }
  // Safety valve: proceed after 2s regardless
}

// ═══════════════════════════════════════════════════════════
// Concurrency Queue — max 2 concurrent pricing calls
// ═══════════════════════════════════════════════════════════
const MAX_CONCURRENT = 2;
let activeCalls = 0;
const queue: Array<{ resolve: (v: PricingResult) => void; rawOffers: any[] }> = [];

function processQueue(): void {
  while (queue.length > 0 && activeCalls < MAX_CONCURRENT) {
    const item = queue.shift()!;
    activeCalls++;
    executeConfirmPricing(item.rawOffers)
      .then(r => item.resolve(r))
      .finally(() => { activeCalls--; processQueue(); });
  }
}

// ═══════════════════════════════════════════════════════════
// Cost Tracker
// ═══════════════════════════════════════════════════════════
export interface CostMetrics {
  search_calls: number;
  pricing_calls: number;
  pricing_cached: number;
  pricing_failed: number;
  total_api_calls: number;
  redis_hits: number;
}

let cost: CostMetrics = resetCost();
function resetCost(): CostMetrics {
  return { search_calls: 0, pricing_calls: 0, pricing_cached: 0, pricing_failed: 0, total_api_calls: 0, redis_hits: 0 };
}
export function startCostTracking(): void { cost = resetCost(); }
export function getCostMetrics(): CostMetrics {
  cost.total_api_calls = cost.search_calls + cost.pricing_calls;
  return { ...cost };
}

// ═══════════════════════════════════════════════════════════
// Utils
// ═══════════════════════════════════════════════════════════
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
function backoff(attempt: number) {
  return Math.min(1000 * 2 ** attempt, 8000) + Math.random() * 300;
}
function getBaseUrl(): string {
  return Deno.env.get('AMADEUS_ENV') === 'production'
    ? "https://api.amadeus.com" : "https://test.api.amadeus.com";
}

// ═══════════════════════════════════════════════════════════
// Token Manager (Anti-Stampede)
// ═══════════════════════════════════════════════════════════
async function getAuthToken(): Promise<string> {
  if (amadeusToken && Date.now() < tokenExpiresAt - 60_000) return amadeusToken;
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const clientId = Deno.env.get('AMADEUS_CLIENT_ID');
    const clientSecret = Deno.env.get('AMADEUS_CLIENT_SECRET');
    if (!clientId || !clientSecret) throw new Error('AMADEUS_CREDENTIALS_MISSING');

    const resp = await fetch(`${getBaseUrl()}/v1/security/oauth2/token`, {
      method: "POST",
      body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: clientSecret }),
    });
    if (!resp.ok) { const e = await resp.text(); throw new Error(`AUTH_FAIL_${resp.status}: ${e}`); }
    const data = await resp.json();
    amadeusToken = data.access_token;
    tokenExpiresAt = Date.now() + data.expires_in * 1000;
    return amadeusToken!;
  })();

  try { return await refreshPromise; }
  finally { refreshPromise = null; }
}

// ═══════════════════════════════════════════════════════════
// Search (GET) — Circuit Breaker + Dedup
// ═══════════════════════════════════════════════════════════
const inFlightReqs = new Map<string, Promise<any>>();

export async function amadeusRequest(
  endpoint: string,
  options: { retries?: number; timeoutMs?: number } = {}
): Promise<any> {
  const { retries = 3, timeoutMs = 20_000 } = options;

  if (circuitState === 'OPEN') {
    if (Date.now() > nextRetryAt) circuitState = 'HALF_OPEN';
    else throw new Error('CIRCUIT_OPEN');
  }
  if (inFlightReqs.has(endpoint)) return inFlightReqs.get(endpoint)!;

  cost.search_calls++;

  const task = (async () => {
    let attempt = 0;
    while (attempt <= retries) {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), timeoutMs);
      try {
        const token = await getAuthToken();
        const res = await fetch(`${getBaseUrl()}${endpoint}`, {
          signal: ctrl.signal,
          headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
        });
        if (!res.ok) {
          const body = await res.text().catch(() => '');
          if (res.status === 401 && attempt < retries) { amadeusToken = null; attempt++; continue; }
          if (res.status >= 500) throw new Error(`UPSTREAM_${res.status}`);
          throw new Error(`API_${res.status}: ${body}`);
        }
        const data = await res.json();
        if (circuitState === 'HALF_OPEN') circuitState = 'CLOSED';
        failureCount = 0;
        return data;
      } catch (err: any) {
        failureCount++;
        if (failureCount >= FAILURE_THRESHOLD) { circuitState = 'OPEN'; nextRetryAt = Date.now() + COOLDOWN_MS; }
        if (attempt >= retries) throw err;
        await sleep(backoff(attempt));
        attempt++;
      } finally { clearTimeout(to); }
    }
  })();

  inFlightReqs.set(endpoint, task);
  try { return await task; }
  finally { inFlightReqs.delete(endpoint); }
}

// ═══════════════════════════════════════════════════════════
// Pricing API — Public: queue + Redis cache + CB
// ═══════════════════════════════════════════════════════════

export async function confirmFlightOfferPrices(rawOffers: any[]): Promise<PricingResult> {
  if (!rawOffers || rawOffers.length === 0) return { confirmedOffers: [], failed: true };

  // ── Pricing Circuit Breaker ──
  if (pricingCircuit === 'OPEN') {
    if (Date.now() > pricingNextRetry) pricingCircuit = 'HALF_OPEN';
    else { cost.pricing_failed++; return { confirmedOffers: [], failed: true }; }
  }

  // ── Check Redis cache first ──
  const uncached: any[] = [];
  const cached: ConfirmedOffer[] = [];

  for (const offer of rawOffers) {
    const id = offer.id || '';
    const redisResult = await getPricingFromRedis(id);
    if (redisResult) {
      cached.push(redisResult as ConfirmedOffer);
      cost.pricing_cached++;
      cost.redis_hits++;
    } else {
      uncached.push(offer);
    }
  }

  if (uncached.length === 0) return { confirmedOffers: cached, failed: false };

  // ── Queue the call ──
  const result = await new Promise<PricingResult>((resolve) => {
    queue.push({ resolve, rawOffers: uncached });
    processQueue();
  });

  if (!result.failed) {
    return { confirmedOffers: [...cached, ...result.confirmedOffers], failed: false };
  }
  if (cached.length > 0) return { confirmedOffers: cached, failed: false };
  return result;
}

// ═══════════════════════════════════════════════════════════
// Pricing API — Internal HTTP call
// ═══════════════════════════════════════════════════════════

async function executeConfirmPricing(rawOffers: any[]): Promise<PricingResult> {
  try {
    await waitForRateLimit();
    cost.pricing_calls++;

    const token = await getAuthToken();
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), 12_000);

    try {
      const resp = await fetch(`${getBaseUrl()}/v1/shopping/flight-offers/pricing`, {
        method: "POST", signal: ctrl.signal,
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ data: { type: "flight-offers-pricing", flightOffers: rawOffers } }),
      });

      if (!resp.ok) {
        const errBody = await resp.text().catch(() => "");
        if (resp.status === 401) {
          amadeusToken = null;
          const fresh = await getAuthToken();
          const retry = await fetch(`${getBaseUrl()}/v1/shopping/flight-offers/pricing`, {
            method: "POST",
            headers: { Authorization: `Bearer ${fresh}`, "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({ data: { type: "flight-offers-pricing", flightOffers: rawOffers } }),
          });
          if (!retry.ok) { recordPricingFail(); return { confirmedOffers: [], failed: true }; }
          recordPricingOK();
          return parsePricingResponse(await retry.json());
        }
        if (resp.status === 429) await sleep(2000);
        recordPricingFail();
        return { confirmedOffers: [], failed: true };
      }

      recordPricingOK();
      return parsePricingResponse(await resp.json());
    } finally { clearTimeout(to); }

  } catch (err: any) {
    console.error("[PRICING]", err.message);
    recordPricingFail();
    cost.pricing_failed++;
    return { confirmedOffers: [], failed: true };
  }
}

function recordPricingFail(): void {
  pricingFailures++;
  if (pricingFailures >= PRICING_FAILURE_THRESHOLD) {
    pricingCircuit = 'OPEN';
    pricingNextRetry = Date.now() + PRICING_COOLDOWN_MS;
  }
}
function recordPricingOK(): void {
  if (pricingCircuit === 'HALF_OPEN') console.info('[PRICING_CB] Recovered');
  pricingCircuit = 'CLOSED';
  pricingFailures = 0;
}

function parsePricingResponse(data: any): PricingResult {
  const offers = data?.data?.flightOffers ?? [];
  const confirmed: ConfirmedOffer[] = [];

  for (const o of offers) {
    const total = Number(o.price?.grandTotal ?? o.price?.total ?? 0);
    const base = Number(o.price?.base ?? 0);
    if (total <= 0) continue;

    const c: ConfirmedOffer = {
      offerId: o.id || "", totalPrice: total, basePrice: base,
      taxes: Math.max(0, total - base), currency: o.price?.currency || "USD", available: true,
    };
    confirmed.push(c);

    // ── Cache in Redis (fire-and-forget) ──
    setPricingInRedis(c.offerId, c);
  }

  return { confirmedOffers: confirmed, failed: false };
}

// ═══════════════════════════════════════════════════════════
// Health status (for observability)
// ═══════════════════════════════════════════════════════════
export function getAmadeusHealth() {
  return {
    search_circuit: circuitState,
    search_failures: failureCount,
    pricing_circuit: pricingCircuit,
    pricing_failures: pricingFailures,
    active_pricing_calls: activeCalls,
    queued_pricing: queue.length,
  };
}