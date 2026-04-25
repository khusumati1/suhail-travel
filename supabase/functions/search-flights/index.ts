// @ts-ignore - Deno import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { makeCacheKey, getFromCache, setInCache, getInFlight, setInFlight, clearInFlight } from "../../../src/lib/flight/cache.ts";
import { normalizeFlightOffer, isValidOffer, deduplicateOffers } from "../../../src/lib/flight/flightUtils.ts";
// Simulator removed permanently – production only

// Helper to safely read env variables
function getEnv(key: string): string | undefined {
  return (globalThis as any).Deno?.env?.get(key);
}

// Simple in-memory rate limiter (per IP, 10 req/min)
const RATE_LIMIT = 10;
const WINDOW_MS = 60_000;
const rateMap = new Map<string, { count: number; reset: number }>();

function checkRateLimit(req: Request): Response | null {
  const ip = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip') ?? 'anonymous';
  const now = Date.now();
  const entry = rateMap.get(ip) ?? { count: 0, reset: now + WINDOW_MS };
  if (now > entry.reset) {
    entry.count = 0;
    entry.reset = now + WINDOW_MS;
  }
  if (entry.count >= RATE_LIMIT) {
    return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  entry.count += 1;
  rateMap.set(ip, entry);
  return null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// --- Amadeus Auth ---
let amadeusToken: string | null = null;
let tokenExpiresAt = 0;

async function getAmadeusToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && amadeusToken && now < tokenExpiresAt - 60_000) return amadeusToken;

  console.log('[search-flights] Fetching new Amadeus token...');
  const clientId = getEnv('AMADEUS_CLIENT_ID');
  const clientSecret = getEnv('AMADEUS_CLIENT_SECRET');
  if (!clientId || !clientSecret) {
    console.error('[search-flights] Amadeus credentials not configured');
    throw new Error('Amadeus credentials not configured');
  }

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const isProduction = clientId !== 'ClGqIyNpegB0F26hf19bUquZfqsemvX5' && getEnv('AMADEUS_ENV') === 'production';
  const tokenUrl = isProduction ? "https://api.amadeus.com/v1/security/oauth2/token" : "https://test.api.amadeus.com/v1/security/oauth2/token";

  const resp = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('[search-flights] Amadeus auth failed:', resp.status, errText);
    throw new Error(`Amadeus auth failed: ${resp.status} ${errText}`);
  }

  const data = await resp.json();
  amadeusToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;
  console.log('[search-flights] Amadeus token refreshed. Expires in:', data.expires_in);
  return amadeusToken!;
}

// Helper to safely fetch from Amadeus API
async function amadeusFetch(url: string, options?: RequestInit, retryCount = 0): Promise<any> {
  const token = await getAmadeusToken(retryCount > 0);
  const resp = await fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
  });
  
  if (!resp.ok) {
    if (resp.status === 401 && retryCount === 0) {
      console.warn('[search-flights] Amadeus token expired or invalid, retrying auth...');
      return amadeusFetch(url, options, 1);
    }
    const errorData = await resp.json().catch(() => ({}));
    console.error(`[search-flights] Amadeus API error: ${resp.status}`, errorData);
    throw new Error(`Amadeus API error: ${resp.status}`, { cause: errorData });
  }
  return resp.json();
}

serve(async (req: Request) => {
  // Rate limiting
  const rlResponse = checkRateLimit(req);
  if (rlResponse) return rlResponse;

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.text();
    let body: any = {};
    try {
      body = rawBody ? JSON.parse(rawBody) : {};
    } catch (e) {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    // ---- latency start ----
    const startTime = Date.now();

    const { origin, destination, departure_date, return_date, passengers, cabin_class } = body;

    if (!origin || !destination || !departure_date) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: origin, destination, departure_date' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // ---- cache key generation ----
    const cacheKey = makeCacheKey({ origin, destination, departure_date, return_date, passengers, cabin_class });

    // ---- cache hit check ----
    const cached = getFromCache<any>(cacheKey);
    if (cached) {
      console.log('[FLIGHT SEARCH] cache hit', { cacheKey });
      const latencyMs = Date.now() - startTime;
      console.log('[FLIGHT SEARCH]', { cache: 'hit', latencyMs });
      return new Response(JSON.stringify(cached), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ---- request coalescing ----
    const inflight = getInFlight<any>(cacheKey);
    if (inflight) {
      console.log('[FLIGHT SEARCH] request coalesced', { cacheKey });
      const result = await inflight;
      const latencyMs = Date.now() - startTime;
      console.log('[FLIGHT SEARCH]', { cache: 'coalesced', latencyMs });
      return new Response(JSON.stringify(result), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let travelClass = cabin_class ? cabin_class.toUpperCase() : 'ECONOMY';
    if (travelClass === 'PREMIUM_ECONOMY') travelClass = 'PREMIUM_ECONOMY';
    
    const params = new URLSearchParams({
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate: departure_date,
      adults: String(passengers?.adults || 1),
      max: '15'
    });

    if (return_date) params.append('returnDate', return_date);
    if (passengers?.children) params.append('children', String(passengers.children));
    if (passengers?.infants) params.append('infants', String(passengers.infants));
    if (travelClass) params.append('travelClass', travelClass);

    // Environment detection
    const clientId = getEnv('AMADEUS_CLIENT_ID') || 'ClGqIyNpegB0F26hf19bUquZfqsemvX5';
    const IS_PRODUCTION = clientId !== 'ClGqIyNpegB0F26hf19bUquZfqsemvX5' && getEnv('AMADEUS_ENV') === 'production';
    const baseUrl = IS_PRODUCTION ? "https://api.amadeus.com" : "https://test.api.amadeus.com";

    const endpoint = `${baseUrl}/v2/shopping/flight-offers?${params.toString()}`;
    console.log('[search-flights] Fetching from Amadeus:', endpoint);

    // Track promise for coalescing
    const fetchPromise = (async () => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); 
        const data = await amadeusFetch(endpoint, { signal: controller.signal });
        clearTimeout(timeoutId);
        return data;
    })();
    setInFlight(cacheKey, fetchPromise);

    let amadeusData: any;
    try {
      amadeusData = await fetchPromise;
    } catch (apiError: any) {
      console.error("[search-flights] Upstream API error:", apiError.message);
      amadeusData = { data: [] };
    } finally {
      clearInFlight(cacheKey);
    }

    let rawOffers = amadeusData.data || [];

    // SMART HYBRID SYSTEM TRIGGER
    // No simulator fallback – production only

    const dictionaries = amadeusData.dictionaries || {};
    const carriers = dictionaries.carriers || {};
    const aircraftMap = dictionaries.aircraft || {};

    // Transform offers to the simplified format
    const offers = rawOffers.map((offer: any) =>
        normalizeFlightOffer(offer, {
          origin,
          destination,
          carriers,
          aircraftMap,
          cabin_class,
        })
      );
      const validOffers = offers.filter(isValidOffer);
      const dedupedOffers = deduplicateOffers(validOffers);
      // Strip internal _carrierCode before responding
      const safeOffers = dedupedOffers.map(({ _carrierCode, ...rest }) => rest);

    const latencyMs = Date.now() - startTime;
    // ---- cache store (only successful 200) ----
    if (safeOffers.length > 0) {
        const payload = { offers: safeOffers, total: safeOffers.length };
        setInCache(cacheKey, payload);
        console.log('[FLIGHT SEARCH]', { cache: 'miss', rawCount: rawOffers.length, filteredCount: safeOffers.length, finalCount: safeOffers.length, latencyMs });
        return new Response(JSON.stringify(payload), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    } else {
        console.log('[FLIGHT SEARCH]', { cache: 'miss', rawCount: rawOffers.length, filteredCount: 0, finalCount: 0, latencyMs });
        return new Response(JSON.stringify({ error: 'No flights found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
  } catch (error: any) {
    console.error('[search-flights] Fatal Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal Server Error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
