// @ts-ignore - Deno import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Helper to safely read env variables (works in Deno runtime)
function getEnv(key: string): string | undefined {
  return (globalThis as any).Deno?.env?.get(key);
}

// Simple in‑memory rate limiter (10 req/min per IP)
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
      headers: { "Content-Type": "application/json" },
    });
  }
  entry.count += 1;
  rateMap.set(ip, entry);
  return null;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// --- Amadeus Auth ---
let amadeusToken: string | null = null;
let tokenExpiresAt = 0;

async function getAmadeusToken(forceRefresh = false): Promise<string> {
  const now = Date.now();
  if (!forceRefresh && amadeusToken && now < tokenExpiresAt - 60_000) return amadeusToken;

  console.log('[search-places] Fetching new Amadeus token...');
  // DEV ONLY fallback credentials. Preferred method is via Supabase Secrets.
  const clientId = getEnv('AMADEUS_CLIENT_ID') || 'ClGqIyNpegB0F26hf19bUquZfqsemvX5';
  const clientSecret = getEnv('AMADEUS_CLIENT_SECRET') || 'zrFD1G88PqNfgQxL';

  const body = new URLSearchParams({
    grant_type: "client_credentials",
    client_id: clientId,
    client_secret: clientSecret,
  });

  const resp = await fetch("https://test.api.amadeus.com/v1/security/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error('[search-places] Amadeus auth failed:', resp.status, errText);
    throw new Error(`Amadeus auth failed: ${resp.status} ${errText}`);
  }

  const data = await resp.json();
  amadeusToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;
  console.log('[search-places] Amadeus token refreshed. Expires in:', data.expires_in);
  return amadeusToken!;
}

// Helper to safely fetch from Amadeus
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
      console.warn('[search-places] Amadeus token expired or invalid, retrying auth...');
      return amadeusFetch(url, options, 1);
    }
    const errorData = await resp.json().catch(() => ({}));
    console.error(`[search-places] Amadeus API error: ${resp.status}`, errorData);
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
    console.log(`[search-places] ${req.method} request received. URL: ${req.url}`);
    
    const url = new URL(req.url);
    let query = url.searchParams.get('query') || url.searchParams.get('keyword');

    if (req.method === 'POST') {
      try {
        const bodyText = await req.text();
        if (bodyText) {
          const body = JSON.parse(bodyText);
          if (body.keyword) query = body.keyword;
          else if (body.query) query = body.query;
          console.log(`[search-places] Parsed POST body:`, body);
        }
      } catch (e) {
        console.warn("[search-places] Invalid POST body or empty", e);
      }
    }

    if (!query || query.length < 2) {
      console.log('[search-places] Query too short or missing, returning empty array.');
      return new Response(
        JSON.stringify({ places: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const queryLower = query.toLowerCase();
    
    // Manual fallbacks for common Arabic searches to ensure great UX
    const manualFallbacks = [
      { name: "عمان، الأردن", iata_code: "AMM", city_name: "Amman", country_name: "Jordan", type: "airport" },
      { name: "بغداد، العراق", iata_code: "BGW", city_name: "Baghdad", country_name: "Iraq", type: "airport" },
      { name: "البصرة، العراق", iata_code: "BSR", city_name: "Basra", country_name: "Iraq", type: "airport" },
      { name: "أربيل، العراق", iata_code: "EBL", city_name: "Erbil", country_name: "Iraq", type: "airport" },
      { name: "النجف، العراق", iata_code: "NJF", city_name: "Najaf", country_name: "Iraq", type: "airport" },
      { name: "السليمانية، العراق", iata_code: "ISU", city_name: "Sulaymaniyah", country_name: "Iraq", type: "airport" },
    ];

    const matchedFallbacks = manualFallbacks.filter(f => 
      f.name.includes(query) || 
      f.city_name.toLowerCase().includes(queryLower) ||
      f.country_name.toLowerCase().includes(queryLower)
    );

    console.log(`[search-places] Final query string: "${query}"`);

    const endpoint = `https://test.api.amadeus.com/v1/reference-data/locations?subType=AIRPORT,CITY&keyword=${encodeURIComponent(query)}&page[limit]=10`;
    let data;
    try {
      // Add timeout protection
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 seconds timeout
      
      data = await amadeusFetch(endpoint, { signal: controller.signal });
      clearTimeout(timeoutId);
      console.log(`[search-places] Amadeus response received. Found ${data.data?.length || 0} places.`);
    } catch (apiError: any) {
      console.warn("[search-places] Amadeus API error (likely unsupported characters or timeout):", apiError.message);
      // If Amadeus fails (e.g. 400 Bad Request due to Arabic query), return empty places
      return new Response(
        JSON.stringify({ places: [], error: 'Upstream API error', details: apiError.message }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform Amadeus places
    const apiPlaces = (data?.data || []).map((place: any) => ({
      id: place.id,
      name: place.name || place.iataCode,
      iata_code: place.iataCode,
      iata_city_code: place.address?.cityCode,
      city_name: place.address?.cityName || place.name,
      country_name: place.address?.countryName,
      type: place.subType?.toLowerCase() || 'city',
      latitude: place.geoCode?.latitude,
      longitude: place.geoCode?.longitude,
      airports: []
    }));

    // Combine and remove duplicates by IATA code
    const combined = [...matchedFallbacks, ...apiPlaces];
    const seen = new Set();
    const places = combined.filter(p => {
      if (!p.iata_code) return true;
      const duplicate = seen.has(p.iata_code);
      seen.add(p.iata_code);
      return !duplicate;
    }).slice(0, 10);

    return new Response(
      JSON.stringify({ places }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('[search-places] Unhandled Error:', error, error.cause || error.stack);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        error: errorMessage, 
        details: error.cause || error.stack || undefined 
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } // 400 instead of 500
    );
  }
});

