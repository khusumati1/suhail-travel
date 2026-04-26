/// <reference path="../deno.d.ts" />
import { makeCacheKey, getFromCache, setInCache, getInFlight, setInFlight, clearInFlight } from "./cache.ts";
import { normalizeFlightOffer, isValidOffer, deduplicateOffers, annotateWithMarketData } from "./utils.ts";
import { amadeusRequest } from "./amadeus.ts";
import { fetchKiwiRapidFlights, checkKiwiRapidStatus } from "./kiwiRapid.ts";
import { SearchParams } from "./types.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

/**
 * Structured Logging Utility
 */
function log(level: "info" | "error" | "fatal", event: string, metadata: Record<string, any> = {}, error: any = null) {
  const mem = Deno.memoryUsage();
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    event,
    metadata: { 
      ...metadata, 
      mem_rss_mb: Math.round(mem.rss / 1024 / 1024) 
    },
    error: error ? { 
      type: error.name || 'Error', 
      message: error.message 
    } : null
  };
  console.log(JSON.stringify(entry));
}

Deno.serve(async (req: Request) => {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();

  // 1. Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 2. Explicit Auth Header Check (Hardened)
  const authHeader = req.headers.get("authorization");
  if (!authHeader) {
    log('error', 'missing_auth', { requestId });
    return new Response(JSON.stringify({
      success: false,
      error: "MISSING_AUTH_HEADER",
      message: "Authorization header is required (User JWT or Anon Key)"
    }), { 
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // --- Debug Endpoint Handling ---
  const url = new URL(req.url);
  if (url.pathname.includes('/debug/kiwi-status')) {
    const diagnostic = await checkKiwiRapidStatus();
    return new Response(JSON.stringify({
      success: diagnostic.isValid,
      error: diagnostic.isValid ? null : "INVALID_RAPIDAPI_KEY",
      message: diagnostic.isValid 
        ? "RapidAPI configuration is valid and connected." 
        : "RapidAPI key is missing, invalid, or rejected.",
      debug: diagnostic,
      requestId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });
  }

  try {
    // 2. Validate Method
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'METHOD_NOT_ALLOWED' }), { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 3. Safe Body Parsing
    const body: SearchParams = await req.json().catch(() => ({}));
    if (!body.origin || !body.destination || !body.departure_date) {
      return new Response(JSON.stringify({ error: 'INVALID_PARAMS', details: 'origin, destination, and departure_date are required' }), { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    const route = `${body.origin.toUpperCase()}-${body.destination.toUpperCase()}`;
    const cacheKey = makeCacheKey(body);
    
    // 4. Cache Strategy (L1 Memory)
    const cached = getFromCache(cacheKey);
    if (cached) {
      log('info', 'cache_hit', { requestId, route });
      return new Response(JSON.stringify({ ...cached, from_cache: true, requestId }), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 5. Request Coalescing (In-flight protection)
    const inflight = getInFlight(cacheKey);
    if (inflight) {
      log('info', 'request_coalesced', { requestId, route });
      const result = await inflight;
      return new Response(JSON.stringify(result), { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    // 6. Resilient Fetch Task
    const task = (async () => {
      try {
        const amadeusParams = new URLSearchParams({
          originLocationCode: body.origin.toUpperCase(),
          destinationLocationCode: body.destination.toUpperCase(),
          departureDate: body.departure_date,
          adults: String(body.passengers?.adults || 1),
          currencyCode: 'USD',
        });

        if (body.return_date) amadeusParams.append('returnDate', body.return_date);
        if (body.cabin_class && body.cabin_class.toLowerCase() !== 'economy') {
          amadeusParams.append('travelClass', body.cabin_class.toUpperCase());
        }

        // Fetch both providers in parallel
        const [amadeusData, kiwiOffers] = await Promise.all([
          amadeusRequest(`/v2/shopping/flight-offers?${amadeusParams.toString()}`, {
            retries: 2,
            timeoutMs: 15000
          }).catch(err => {
            log('error', 'amadeus_skip', { requestId, route, error: err.message });
            return null;
          }),
          fetchKiwiRapidFlights(body).catch(err => {
            log('error', 'kiwi_rapid_skip', { requestId, route, error: err.message });
            return [];
          })
        ]);

        const dict = amadeusData?.dictionaries || {};
        const rawAmadeusOffers = amadeusData?.data || [];
        
        // Normalize Amadeus Results
        const amadeusNormalized = rawAmadeusOffers.map((o: any) => normalizeFlightOffer(o, {
          origin: body.origin,
          destination: body.destination,
          carriers: dict.carriers || {},
          aircraftMap: dict.aircraft || {},
          cabin_class: body.cabin_class
        })).filter(isValidOffer);

        // Kiwi results are already normalized by kiwiRapid.ts
        const kiwiNormalized = (kiwiOffers || []).filter(isValidOffer);

        // Deduplicate and then Annotate with Market Comparison
        const baseOffers = deduplicateOffers([...amadeusNormalized, ...kiwiNormalized]);
        const annotatedOffers = annotateWithMarketData(baseOffers, kiwiOffers || []);
        const finalOffers = annotatedOffers.map(({ _carrierCode, ...rest }) => rest);

        const diagnostic = await checkKiwiRapidStatus();

        const isGuest = authHeader?.includes(Deno.env.get('SUPABASE_ANON_KEY') || 'never-match');

        const result = { 
          offers: finalOffers, 
          total: finalOffers.length, 
          status: 'success',
          authMode: isGuest ? 'guest' : 'user',
          trust_message: finalOffers.length > 0 
            ? "تم جلب البيانات من مزودين عالميين معتمدين" 
            : `لم نجد رحلات حقيقية حالياً. (المصدر 1: ${amadeusData ? 'متصل' : 'خطأ'}, المصدر 2: ${kiwiOffers.length > 0 ? 'متصل' : 'خطأ'})`,
          debug: finalOffers.length === 0 ? diagnostic : undefined,
          requestId
        };

        if (finalOffers.length > 0) {
          setInCache(cacheKey, result);
        }
        return result;

      } catch (e: any) {
        log('error', 'upstream_failure', { requestId, route }, e);
        throw e;
      } finally {
        clearInFlight(cacheKey);
      }
    })();

    setInFlight(cacheKey, task);
    const finalResult = await task;

    return new Response(JSON.stringify(finalResult), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (err: any) {
    const msg = err.message || "";
    const isUpstream = msg.includes('FETCH') || 
                       msg.includes('AMADEUS') || 
                       msg.includes('KIWI') || 
                       msg.includes('API_') || 
                       msg.includes('UPSTREAM_');
    
    log('fatal', 'handler_crash', { requestId, isUpstream, msg }, err);
    
    const diagnostic = await checkKiwiRapidStatus();

    return new Response(JSON.stringify({ 
      status: 'error',
      error: isUpstream ? 'UPSTREAM_SERVICE_ERROR' : 'INTERNAL_SERVER_ERROR',
      message: msg,
      debug: diagnostic,
      requestId 
    }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });
  }
});
