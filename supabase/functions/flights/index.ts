// @ts-ignore - Deno import
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple in-memory cache for Deno runtime (Edge Functions are ephemeral, but can persist across warm requests)
const CACHE = new Map<string, { data: any; expiry: number }>();
const CACHE_DURATION_MS = 5 * 60 * 1000; // 5 minutes

function getEnv(key: string): string | undefined {
  return (globalThis as any).Deno?.env?.get(key);
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const type = url.searchParams.get('type') || 'timetable'; // 'timetable' or 'status'
    const iataCode = url.searchParams.get('iataCode') || 'AMM';
    const flightNumber = url.searchParams.get('flight_number');
    const airline = url.searchParams.get('airline');

    const apiKey = getEnv('AVIATIONSTACK_API_KEY');
    if (!apiKey) {
      console.error("AVIATIONSTACK_API_KEY is missing");
      return new Response(
        JSON.stringify({ success: false, error: "API configuration error on server" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cacheKey = `${type}-${iataCode}-${flightNumber}-${airline}`;
    const cached = CACHE.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      console.log(`[flights] Returning cached data for ${cacheKey}`);
      return new Response(JSON.stringify({ success: true, flights: cached.data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let aviationUrl = '';
    if (type === 'status' && flightNumber) {
      aviationUrl = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&flight_iata=${flightNumber}`;
    } else {
      // Default to timetable (arrivals/departures)
      const depOrArr = url.searchParams.get('mode') === 'arrival' ? 'arr_iata' : 'dep_iata';
      aviationUrl = `http://api.aviationstack.com/v1/flights?access_key=${apiKey}&${depOrArr}=${iataCode}`;
      if (airline) aviationUrl += `&airline_name=${airline}`;
    }

    console.log(`[flights] Fetching: ${aviationUrl.replace(apiKey, 'REDACTED')}`);
    
    const response = await fetch(aviationUrl);
    if (!response.ok) {
      throw new Error(`Aviation API responded with ${response.status}`);
    }

    const rawData = await response.json();

    if (rawData.error) {
      return new Response(
        JSON.stringify({ success: false, error: rawData.error.message || "Upstream API error" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Normalize response
    const flights = (rawData.data || []).map((f: any) => ({
      flight_number: f.flight?.iata || f.flight?.number,
      airline: f.airline?.name,
      departure: {
        airport: f.departure?.airport,
        iata: f.departure?.iata,
        scheduled: f.departure?.scheduled,
        estimated: f.departure?.estimated,
        actual: f.departure?.actual,
        terminal: f.departure?.terminal,
        gate: f.departure?.gate,
      },
      arrival: {
        airport: f.arrival?.airport,
        iata: f.arrival?.iata,
        scheduled: f.arrival?.scheduled,
        estimated: f.arrival?.estimated,
        actual: f.arrival?.actual,
        terminal: f.arrival?.terminal,
        gate: f.arrival?.gate,
      },
      status: f.flight_status, // scheduled, active, landed, cancelled, incident, diverted
    }));

    // Cache the result
    CACHE.set(cacheKey, { data: flights, expiry: Date.now() + CACHE_DURATION_MS });

    return new Response(JSON.stringify({ success: true, flights }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("[flights] Fatal Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || "Internal Server Error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
