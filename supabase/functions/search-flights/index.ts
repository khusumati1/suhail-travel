/// <reference path="../deno.d.ts" />
// supabase/functions/search-flights/index.ts
// ─────────────────────────────────────────────────────────
// OTA Core Engine — SRE-Grade Aviation Platform
// SLOs | Error Budgets | Adaptive Sampling | Chaos Automation
// Distributed Tracing | SLA Guard | Auto-Healing
// ─────────────────────────────────────────────────────────

import { makeCacheKey, getFromCache, getFromCacheAsync, setInCache, getInFlight, setInFlight, clearInFlight, markRevalidating, clearRevalidating, setLazyOfferInRedis, getLazyOfferFromRedis, SEARCH_TTL_MS } from "./cache.ts";
import { normalizeFlightOffer, isValidOffer, deduplicateOffers, annotateWithMarketData, stripInternalFields } from "./utils.ts";
import { amadeusRequest, confirmFlightOfferPrices, startCostTracking, getCostMetrics, getAmadeusHealth } from "./amadeus.ts";
import { fetchKiwiRapidFlights, checkKiwiRapidStatus } from "./kiwiRapid.ts";
import { searchHareerFlights } from "./cloudfares.ts";
import { applyTrustEngine } from "./trustEngine.ts";
import { runPriceGuard, applyPriceGuardResults, computeReliability } from "./priceGuard.ts";
import { SearchParams, NormalizedOffer } from "./types.ts";
import { processFlights } from "./ranking.ts";
import { getRedisStatus } from "./redis.ts";
import { TraceContext } from "./tracing.ts";
import { recordPricingLatency, recordSearchLatency, recordError, checkRecovery, getSystemMode, getDegradedConfig, getSLAStatus } from "./slaGuard.ts";
import { recordProviderSuccess, recordProviderFailure, isProviderEnabled, recordSearch, recordDashboardCacheHit, recordDashboardCacheMiss, recordPriceMismatch, getReliabilityDashboard, getChaosStatus, enableChaos, shouldSimulateTimeout, shouldCorruptResults } from "./healthMonitor.ts";
import { recordSLI, shouldAutoDegrade, shouldSampleTrace, recordRequest, getAllErrorBudgets, computeResilienceScore, generateReliabilityReport, runLoadTest, enableChaosSchedule, checkChaosSchedule, getChaosScheduleConfig, getSamplingStatus } from "./sreEngine.ts";
import { RUNBOOKS, GAME_DAY_SCENARIOS, runGameDay, getGameDayHistory, openIncident, acknowledgeIncident, resolveIncident, getMTTRStats, createPostmortem, getPostmortems, getEscalationPath, evaluateAutoActions, runLaunchReadinessReview, getOpsStatus } from "./opsEngine.ts";

const MAX_PRICE_DEVIATION = 0.20;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function log(level: "info" | "error" | "fatal", event: string, meta: Record<string, any> = {}, error: any = null) {
  let memMb = 0;
  try { memMb = Math.round(Deno.memoryUsage().rss / 1024 / 1024); } catch {}
  console.log(JSON.stringify({
    ts: new Date().toISOString(), level, event, ...meta, mem_mb: memMb,
    error: error ? { type: error.name || 'Error', msg: error.message } : undefined,
  }));
}

// ═══════════════════════════════════════════════════════════
// Lazy Pricing Store — L1 (Map) + L2 (Redis)
// ═══════════════════════════════════════════════════════════
const lazyStoreL1 = new Map<string, { rawOffer: any; expiresAt: number }>();
const LAZY_L1_TTL = 600_000;

function storeLazyOffer(offerId: string, rawOffer: any): void {
  if (lazyStoreL1.size > 300) {
    const old = Array.from(lazyStoreL1.keys()).slice(0, 100);
    old.forEach(k => lazyStoreL1.delete(k));
  }
  lazyStoreL1.set(offerId, { rawOffer, expiresAt: Date.now() + LAZY_L1_TTL });
  setLazyOfferInRedis(offerId, rawOffer);
}

async function getLazyOffer(offerId: string): Promise<any | null> {
  const l1 = lazyStoreL1.get(offerId);
  if (l1) {
    if (Date.now() > l1.expiresAt) lazyStoreL1.delete(offerId);
    else return l1.rawOffer;
  }
  const l2 = await getLazyOfferFromRedis(offerId);
  if (l2) { lazyStoreL1.set(offerId, { rawOffer: l2, expiresAt: Date.now() + LAZY_L1_TTL }); return l2; }
  return null;
}

// ═══════════════════════════════════════════════════════════
// Main Handler
// ═══════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  const requestId = crypto.randomUUID();

  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const authHeader = req.headers.get("authorization");
  if (!authHeader) return jsonResp({ success: false, error: "MISSING_AUTH_HEADER" }, 401);

  const url = new URL(req.url);

  // ── Debug endpoints ──
  if (url.pathname.includes('/debug/kiwi-status')) {
    const diag = await checkKiwiRapidStatus();
    return jsonResp({ success: diag.isValid, debug: diag, requestId });
  }
  if (url.pathname.includes('/debug/metrics')) {
    return jsonResp({
      amadeus: getAmadeusHealth(),
      redis: getRedisStatus(),
      sla: getSLAStatus(),
      system_mode: getSystemMode(),
      requestId,
    });
  }
  // ── Reliability Dashboard ──
  if (url.pathname.includes('/debug/dashboard')) {
    return jsonResp({ dashboard: getReliabilityDashboard(), sla: getSLAStatus(), requestId });
  }
  // ── SRE Dashboard (SLOs + Error Budgets + Resilience) ──
  if (url.pathname.includes('/debug/sre')) {
    return jsonResp({
      error_budgets: getAllErrorBudgets(),
      resilience: computeResilienceScore(),
      sampling: getSamplingStatus(),
      auto_degrade: shouldAutoDegrade(),
      chaos_schedule: getChaosScheduleConfig(),
      requestId,
    });
  }
  // ── Reliability Report ──
  if (url.pathname.includes('/debug/report')) {
    return jsonResp({ report: generateReliabilityReport(), requestId });
  }
  // ── Load Testing ──
  if (url.pathname.includes('/debug/load-test')) {
    if (req.method === 'POST') {
      const config = await req.json().catch(() => ({}));
      const result = await runLoadTest({
        concurrent_searches: config.concurrent_searches || 100,
        duration_seconds: config.duration_seconds || 10,
        routes: config.routes || [],
        include_pricing: config.include_pricing || false,
      });
      return jsonResp({ success: true, result, requestId });
    }
    return jsonResp({ error: 'POST_REQUIRED', message: 'Send POST with {concurrent_searches, duration_seconds, routes}' }, 400);
  }
  // ── Chaos Schedule ──
  if (url.pathname.includes('/debug/chaos-schedule')) {
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      enableChaosSchedule(body.enabled ?? true, body.schedule);
      return jsonResp({ success: true, schedule: getChaosScheduleConfig(), requestId });
    }
    return jsonResp({ schedule: getChaosScheduleConfig(), requestId });
  }
  // ── Chaos Testing ──
  if (url.pathname.includes('/debug/chaos')) {
    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      const mode = body.mode || 'none';
      const duration = body.duration_ms || 30_000;
      enableChaos(mode, duration);
      return jsonResp({ success: true, chaos: getChaosStatus(), requestId });
    }
    return jsonResp({ chaos: getChaosStatus(), requestId });
  }
  // ═══ OPS ENDPOINTS ═══
  if (url.pathname.includes('/ops/runbooks')) {
    const rbId = url.searchParams.get('id');
    return jsonResp(rbId ? { runbook: RUNBOOKS.find(r => r.id === rbId) || null } : { runbooks: RUNBOOKS, requestId });
  }
  if (url.pathname.includes('/ops/incidents')) {
    if (req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      if (b.action === 'open') { const id = openIncident(b.type || 'manual', b.severity || 'P3', false); return jsonResp({ id, requestId }); }
      if (b.action === 'ack') { acknowledgeIncident(b.id); return jsonResp({ success: true, requestId }); }
      if (b.action === 'resolve') { resolveIncident(b.id, b.auto || false, b.runbook); return jsonResp({ success: true, requestId }); }
      if (b.action === 'postmortem') { const pm = createPostmortem(b.id); return jsonResp({ postmortem: pm, requestId }); }
    }
    return jsonResp({ mttr: getMTTRStats(), escalation: { P1: getEscalationPath('P1'), P2: getEscalationPath('P2'), P3: getEscalationPath('P3') }, requestId });
  }
  if (url.pathname.includes('/ops/game-day')) {
    if (req.method === 'POST') {
      const b = await req.json().catch(() => ({}));
      if (b.scenario_id) {
        enableChaos(GAME_DAY_SCENARIOS.find(s => s.id === b.scenario_id)?.chaos_mode as any || 'none', b.duration_ms || 30000);
        const result = await runGameDay(b.scenario_id);
        return jsonResp({ success: true, result, requestId });
      }
    }
    return jsonResp({ scenarios: GAME_DAY_SCENARIOS, history: getGameDayHistory(), requestId });
  }
  if (url.pathname.includes('/ops/postmortems')) {
    return jsonResp({ postmortems: getPostmortems(), requestId });
  }
  if (url.pathname.includes('/ops/readiness')) {
    const review = runLaunchReadinessReview({
      amadeusHealth: getAmadeusHealth(), redisStatus: getRedisStatus(), slaStatus: getSLAStatus(),
      systemMode: getSystemMode(), budgets: getAllErrorBudgets(), resilience: computeResilienceScore(),
    });
    return jsonResp({ readiness: review, requestId });
  }
  if (url.pathname.includes('/ops/status')) {
    return jsonResp({ ops: getOpsStatus(), requestId });
  }
  // ── Lazy Confirm ──
  if (url.pathname.includes('/confirm-price')) {
    return handleLazyConfirm(req, requestId);
  }

  try {
    if (req.method !== 'POST') return jsonResp({ error: 'METHOD_NOT_ALLOWED' }, 405);

    const body: SearchParams = await req.json().catch(() => ({} as any));
    if (!body.origin || !body.destination || !body.departure_date) {
      return jsonResp({ error: 'INVALID_PARAMS' }, 400);
    }

    // ── SRE: Record request + check scheduled chaos + error budget ──
    recordRequest();
    checkRecovery();

    // Check weekly chaos schedule
    const scheduledChaos = checkChaosSchedule();
    if (scheduledChaos?.fire) {
      enableChaos(scheduledChaos.mode as any, scheduledChaos.duration_ms);
      log('info', 'scheduled_chaos_fired', { mode: scheduledChaos.mode });
    }

    // Error budget auto-degrade
    const budgetCheck = shouldAutoDegrade();
    if (budgetCheck.degrade && getSystemMode() === 'NORMAL') {
      log('error', 'error_budget_degrade', { reason: budgetCheck.reason });
      recordError('error_budget_exhausted');
    }

    const route = `${body.origin.toUpperCase()}-${body.destination.toUpperCase()}`;
    const cacheKey = makeCacheKey(body);

    // ── L1 cache ──
    const l1 = getFromCache(cacheKey);
    if (l1 && !l1.stale) {
      recordDashboardCacheHit();
      return jsonResp({ ...l1.data, from_cache: true, cache_layer: 'L1', system_mode: getSystemMode(), requestId });
    }

    // ── L2 cache (Redis) ──
    const l2 = await getFromCacheAsync(cacheKey);
    if (l2 && !l2.stale) {
      recordDashboardCacheHit();
      return jsonResp({ ...l2.data, from_cache: true, cache_layer: 'L2', system_mode: getSystemMode(), requestId });
    }

    // ── Stale-while-revalidate ──
    const stale = l1 || l2;
    if (stale?.stale && markRevalidating(cacheKey)) {
      revalidateInBackground(body, cacheKey, route);
      return jsonResp({ ...stale.data, from_cache: true, stale: true, system_mode: getSystemMode(), requestId });
    }

    // ── Request coalescing ──
    const inflight = getInFlight(cacheKey);
    if (inflight) { const result = await inflight; return jsonResp(result); }

    // ── Fresh search ──
    recordDashboardCacheMiss();
    const task = executePipeline(body, route, requestId);
    setInFlight(cacheKey, task);
    const result = await task;
    clearInFlight(cacheKey);
    return jsonResp(result);

  } catch (err: any) {
    recordError('handler_crash');
    recordSearch(false);
    recordSLI('search_success', false);
    log('fatal', 'handler_crash', { requestId, msg: err.message }, err);
    return jsonResp({ status: 'error', error: 'INTERNAL_SERVER_ERROR', message: err.message, requestId });
  }
});

function jsonResp(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// ═══════════════════════════════════════════════════════════
// Lazy Confirm
// ═══════════════════════════════════════════════════════════

async function handleLazyConfirm(req: Request, requestId: string): Promise<Response> {
  try {
    const { offer_id } = await req.json().catch(() => ({} as any));
    if (!offer_id) return jsonResp({ error: 'MISSING_OFFER_ID' }, 400);

    const rawOffer = await getLazyOffer(offer_id);
    if (!rawOffer) return jsonResp({ error: 'OFFER_EXPIRED', message: 'العرض انتهت صلاحيته. أعد البحث.' });

    const t0 = Date.now();
    const result = await confirmFlightOfferPrices([rawOffer]);
    recordPricingLatency(Date.now() - t0);

    if (result.failed || result.confirmedOffers.length === 0) {
      return jsonResp({ success: false, error: 'PRICING_FAILED', message: 'تعذّر تأكيد السعر.', requestId });
    }

    const c = result.confirmedOffers[0];
    return jsonResp({
      success: true,
      confirmed: {
        offer_id: c.offerId, confirmed_price: c.totalPrice, base_price: c.basePrice,
        taxes: c.taxes, currency: c.currency, available: c.available,
        price_status: 'confirmed', bookable: true,
      },
      requestId,
    });
  } catch (err: any) {
    return jsonResp({ error: 'CONFIRM_ERROR', message: err.message });
  }
}

// ═══════════════════════════════════════════════════════════
// CORE PIPELINE — with Tracing + SLA Guard + Auto-Healing
// ═══════════════════════════════════════════════════════════

async function executePipeline(body: SearchParams, route: string, requestId: string) {
  const t0 = Date.now();
  const cacheKey = makeCacheKey(body);
  const trace = new TraceContext(requestId, route);
  const slaConfig = getDegradedConfig();
  startCostTracking();

  try {
    // ── STEP 1: Fetch providers (parallel, with tracing) ──
    const amParams = new URLSearchParams({
      originLocationCode: body.origin.toUpperCase(),
      destinationLocationCode: body.destination.toUpperCase(),
      departureDate: body.departure_date,
      adults: String(body.passengers?.adults || 1),
      currencyCode: 'USD',
    });
    if (body.return_date) amParams.append('returnDate', body.return_date);
    if (body.cabin_class && body.cabin_class.toLowerCase() !== 'economy') {
      amParams.append('travelClass', body.cabin_class.toUpperCase());
    }

    trace.startSpan('provider:all');

    // Build provider promises with tracing + health checks
    const providerPromises: Promise<any>[] = [];

    // Amadeus
    if (isProviderEnabled('amadeus')) {
      const amPromise = (async () => {
        trace.startSpan('provider:amadeus');
        const pt0 = Date.now();
        try {
          if (shouldSimulateTimeout()) {
            await new Promise(r => setTimeout(r, 20_000));
            throw new Error('CHAOS_TIMEOUT');
          }
          const data = await amadeusRequest(`/v2/shopping/flight-offers?${amParams.toString()}`, { retries: 2, timeoutMs: 15000 });
          recordProviderSuccess('amadeus', Date.now() - pt0);
          trace.endSpan('provider:amadeus', 'ok', { offers: data?.data?.length || 0 });
          return data;
        } catch (err: any) {
          const isTimeout = err.name === 'AbortError' || err.message.includes('TIMEOUT');
          recordProviderFailure('amadeus', err.message, isTimeout);
          trace.endSpan('provider:amadeus', isTimeout ? 'timeout' : 'error', { error: err.message });
          return null;
        }
      })();
      providerPromises.push(amPromise);
    } else {
      providerPromises.push(Promise.resolve(null));
      log('info', 'amadeus_disabled', { requestId, route, reason: 'auto-healing' });
    }

    // Kiwi
    if (isProviderEnabled('kiwi')) {
      const kiwiPromise = (async () => {
        trace.startSpan('provider:kiwi');
        const pt0 = Date.now();
        try {
          const data = await fetchKiwiRapidFlights(body);
          recordProviderSuccess('kiwi', Date.now() - pt0);
          trace.endSpan('provider:kiwi', 'ok', { offers: data?.length || 0 });
          return data;
        } catch (err: any) {
          recordProviderFailure('kiwi', err.message, err.name === 'AbortError');
          trace.endSpan('provider:kiwi', 'error', { error: err.message });
          return [];
        }
      })();
      providerPromises.push(kiwiPromise);
    } else {
      providerPromises.push(Promise.resolve([]));
    }

    // CloudFares
    if (isProviderEnabled('cloudfares')) {
      const cfPromise = (async () => {
        trace.startSpan('provider:cloudfares');
        const pt0 = Date.now();
        try {
          const data = await searchHareerFlights(body);
          recordProviderSuccess('cloudfares', Date.now() - pt0);
          trace.endSpan('provider:cloudfares', 'ok', { offers: data?.length || 0 });
          return data;
        } catch (err: any) {
          recordProviderFailure('cloudfares', err.message, err.name === 'AbortError');
          trace.endSpan('provider:cloudfares', 'error', { error: err.message });
          return [];
        }
      })();
      providerPromises.push(cfPromise);
    } else {
      providerPromises.push(Promise.resolve([]));
    }

    const [amadeusData, kiwiOffers, cfOffers] = await Promise.all(providerPromises);
    trace.endSpan('provider:all');

    // ── STEP 2: Normalize ──
    trace.startSpan('normalize');
    const dict = amadeusData?.dictionaries || {};
    const rawAm = amadeusData?.data || [];

    let amNorm: NormalizedOffer[] = rawAm.map((o: any) => normalizeFlightOffer(o, {
      origin: body.origin, destination: body.destination,
      carriers: dict.carriers || {}, aircraftMap: dict.aircraft || {},
      cabin_class: body.cabin_class
    })).filter(isValidOffer);

    let kiwiNorm = (kiwiOffers || []).filter(isValidOffer);
    let cfNorm = (cfOffers || []).filter(isValidOffer);

    // Chaos: partial corruption test
    if (shouldCorruptResults() && amNorm.length > 0) {
      const corruptIdx = Math.floor(Math.random() * amNorm.length);
      amNorm[corruptIdx].price = -999; // Will be caught by Trust Engine
    }

    const allOffers = [...amNorm, ...kiwiNorm, ...cfNorm];
    trace.endSpan('normalize', 'ok', { total: allOffers.length });

    // ── STEP 3: Trust Engine ──
    trace.startSpan('trust');
    const trust = applyTrustEngine(allOffers);
    trace.endSpan('trust', 'ok', { verified: trust.verified.length, rejected: trust.rejected });

    if (trust.verified.length === 0) {
      recordSearch(false);
      const traceData = trace.finalize();
      return buildResponse([], route, requestId, t0, {
        trust_rejected: trust.rejected, trust_reasons: trust.reasons,
        providers: { amadeus: amNorm.length, kiwi: kiwiNorm.length, cloudfares: cfNorm.length },
      }, traceData);
    }

    // ── STEP 4: Dedup ──
    const deduped = deduplicateOffers(trust.verified);
    const annotated = annotateWithMarketData(deduped, kiwiOffers || []);

    // ── STEP 5: SMART PRICING (SLA-aware) ──
    trace.startSpan('pricing:total');
    const amFlights = annotated.filter(f => f.source === 'amadeus' && f._rawOffer).sort((a, b) => a.price - b.price);

    // Use SLA-degraded config
    const eager = amFlights.slice(0, slaConfig.maxEagerPricing);
    const lazy = amFlights.slice(slaConfig.maxEagerPricing);
    const batchSize = slaConfig.pricingBatchSize;

    let confirmed = 0, changed = 0, pricingFailed = false;

    if (eager.length > 0) {
      for (let i = 0; i < eager.length; i += batchSize) {
        const batch = eager.slice(i, i + batchSize);
        const batchName = `pricing:batch_${i / batchSize}`;
        trace.startSpan(batchName);

        const pt0 = Date.now();
        const result = await confirmFlightOfferPrices(batch.map(f => f._rawOffer));
        const pricingMs = Date.now() - pt0;
        recordPricingLatency(pricingMs);

        if (!result.failed && result.confirmedOffers.length > 0) {
          trace.endSpan(batchName, 'ok', { confirmed: result.confirmedOffers.length, ms: pricingMs });
          for (const c of result.confirmedOffers) {
            const f = annotated.find(x => x.id === c.offerId);
            if (!f) continue;
            const dev = f.estimated_price > 0 ? Math.abs(c.totalPrice - f.estimated_price) / f.estimated_price : 0;
            f.confirmed_price = c.totalPrice; f.taxes = c.taxes; f.price = c.totalPrice;
            f.currency = c.currency; f.trust_level = 'verified';
            f.fare_rules = extractFareRules(c);
            if (dev > MAX_PRICE_DEVIATION) {
              f.price_status = 'price_changed'; f.bookable = false; f.reliability = 0.40;
              changed++; recordPriceMismatch();
              recordSLI('price_accuracy', false);
            } else {
              f.price_status = 'confirmed'; f.bookable = true; f.reliability = 0.95; confirmed++;
              recordSLI('price_accuracy', true);
            }
          }
        } else {
          pricingFailed = true;
          trace.endSpan(batchName, 'error', { ms: pricingMs });
          recordError('pricing_batch_fail');
          log('error', 'pricing_batch_fail', { requestId, route, batch: i / batchSize });
        }
      }
    }
    trace.endSpan('pricing:total');

    // ── 5b: Store lazy ──
    for (const f of lazy) {
      storeLazyOffer(f.id, f._rawOffer);
      f.price_status = 'estimated'; f.bookable = false; f.reliability = 0.70; f.trust_level = 'estimated';
    }

    // ── 5c: Non-blocking background confirm ──
    if (lazy.length > 0 && !pricingFailed && !slaConfig.skipBackgroundPricing) {
      const bgFlights = lazy.slice(0, 10);
      try {
        const runtime = (globalThis as any).EdgeRuntime;
        if (runtime?.waitUntil) {
          runtime.waitUntil(confirmInBackground(bgFlights, cacheKey, body, route, requestId));
        }
      } catch { /* EdgeRuntime not available */ }
    }

    // ── Pricing fallback ──
    if (pricingFailed && confirmed === 0) {
      for (const f of eager) {
        f.price_status = 'estimated'; f.bookable = false; f.reliability = 0.50; f.trust_level = 'estimated';
        storeLazyOffer(f.id, f._rawOffer);
      }
    }

    // Non-Amadeus
    for (const f of annotated) {
      if (f.price_status === 'estimated' && f.source !== 'amadeus') {
        f.trust_level = 'estimated'; f.bookable = false; f.reliability = computeReliability(f);
      }
    }

    // ── STEP 6: Price Guard ──
    trace.startSpan('guard');
    const guard = runPriceGuard(annotated);
    applyPriceGuardResults(annotated, guard);
    trace.endSpan('guard', 'ok', { checked: guard.totalChecked, passed: guard.passed });

    // ── STEP 7: Rank ──
    trace.startSpan('ranking');
    const processed = processFlights(annotated, body.filters);
    const final = processed.map(stripInternalFields);
    trace.endSpan('ranking', 'ok', { total: final.length });

    const costMetrics = getCostMetrics();
    const traceData = trace.finalize();

    // ── Record SLA + SLI + dashboard ──
    const totalMs = Date.now() - t0;
    recordSearchLatency(totalMs);
    recordSearch(true);
    recordSLI('search_success', true, totalMs);

    const result = buildResponse(final, route, requestId, t0, {
      trust_rejected: trust.rejected, trust_reasons: trust.reasons,
      price_confirmed: confirmed, price_changed: changed,
      price_guard: { checked: guard.totalChecked, passed: guard.passed, failed: guard.failed, avg_deviation: guard.avgDeviation },
      providers: { amadeus: amNorm.length, kiwi: kiwiNorm.length, cloudfares: cfNorm.length },
      cost: costMetrics, lazy_available: lazy.length,
    }, traceData);

    if (final.length > 0) setInCache(cacheKey, result, SEARCH_TTL_MS);

    // Adaptive trace sampling: only log full trace if sampled
    if (shouldSampleTrace(false)) {
      trace.log();
    }

    return result;
  } catch (e: any) {
    recordError('pipeline_error');
    recordSearch(false);
    recordSLI('search_success', false);
    // Always log trace on errors (100% error sampling)
    if (shouldSampleTrace(true)) {
      trace.log();
    }
    log('error', 'pipeline_error', { requestId, route }, e);
    throw e;
  }
}

// ═══════════════════════════════════════════════════════════
// Background Pricing
// ═══════════════════════════════════════════════════════════

async function confirmInBackground(flights: NormalizedOffer[], cacheKey: string, body: SearchParams, route: string, requestId: string): Promise<void> {
  try {
    const batchSize = getDegradedConfig().pricingBatchSize;
    for (let i = 0; i < flights.length; i += batchSize) {
      const batch = flights.slice(i, i + batchSize);
      const rawOffers = batch.map(f => f._rawOffer).filter(Boolean);
      if (rawOffers.length === 0) continue;

      const t0 = Date.now();
      const result = await confirmFlightOfferPrices(rawOffers);
      recordPricingLatency(Date.now() - t0);
      if (result.failed) break;
    }
  } catch (err: any) {
    log('error', 'bg_confirm_fail', { requestId, route }, err);
  }
}

// ═══════════════════════════════════════════════════════════
// Fare Rules
// ═══════════════════════════════════════════════════════════

function extractFareRules(confirmed: any): { refundable: boolean; changeable: boolean; penalties?: string; baggage?: string } | undefined {
  try {
    const fd = confirmed._rawPricingOffer?.travelerPricings?.[0]?.fareDetailsBySegment?.[0];
    const refundable = fd?.amenities?.some((a: any) => a.description?.toLowerCase().includes('refund') && a.isChargeable === false) ?? false;
    const changeable = fd?.amenities?.some((a: any) => a.description?.toLowerCase().includes('change') && a.isChargeable === false) ?? false;
    const bag = fd?.amenities?.find((a: any) => a.description?.toLowerCase().includes('bag'));
    return { refundable, changeable, penalties: refundable ? undefined : "Non-refundable fare", baggage: bag?.description };
  } catch { return undefined; }
}

// ═══════════════════════════════════════════════════════════
// Response Builder (with trace + SLA)
// ═══════════════════════════════════════════════════════════

function buildResponse(
  offers: any[], route: string, requestId: string, t0: number,
  m: {
    trust_rejected: number; trust_reasons?: Record<string, number>;
    price_confirmed?: number; price_changed?: number;
    price_guard?: { checked: number; passed: number; failed: number; avg_deviation: number };
    providers: { amadeus: number; kiwi: number; cloudfares: number };
    cost?: any; lazy_available?: number;
  },
  trace?: any,
) {
  const bookable = offers.filter((o: any) => o.bookable).length;
  const estimated = offers.filter((o: any) => !o.bookable).length;

  return {
    offers, total: offers.length,
    bookable_count: bookable,
    lazy_confirmable: m.lazy_available || 0,
    status: offers.length > 0 ? 'success' : 'no_results',
    system_mode: getSystemMode(),
    metrics: {
      latency_ms: Date.now() - t0,
      trust_rejected: m.trust_rejected,
      price_confirmed: m.price_confirmed || 0,
      price_changed: m.price_changed || 0,
      price_guard: m.price_guard,
      providers: m.providers,
      cost: m.cost,
    },
    trace: trace ? {
      trace_id: trace.trace_id,
      total_ms: trace.totalMs,
      breakdown: trace.breakdown,
      spans: trace.spans.length,
    } : undefined,
    trust_message: bookable > 0
      ? `${bookable} رحلة بسعر مؤكد ونهائي`
      : estimated > 0
        ? "أسعار تقديرية — اضغط لتأكيد السعر قبل الحجز"
        : "لم نجد رحلات مطابقة لمعايير البحث",
    requestId,
  };
}

// ═══════════════════════════════════════════════════════════
// Background Revalidation
// ═══════════════════════════════════════════════════════════

async function revalidateInBackground(body: SearchParams, cacheKey: string, route: string) {
  try {
    const result = await executePipeline(body, route, `reval-${crypto.randomUUID()}`);
    if (result.offers.length > 0) setInCache(cacheKey, result, SEARCH_TTL_MS);
  } catch (err: any) {
    log('error', 'reval_fail', { route }, err);
  } finally {
    clearRevalidating(cacheKey);
  }
}
