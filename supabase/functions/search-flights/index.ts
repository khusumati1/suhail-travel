/// <reference path="../deno.d.ts" />
// supabase/functions/search-flights/index.ts
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const body = await req.json();
    const { origin, destination, departure_date } = body;

    // Basic validation
    if (!origin || !destination || !departure_date) {
      return new Response(JSON.stringify({ error: "INVALID_PARAMS", message: "Origin, destination, and departure_date are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Search request received: ${origin} -> ${destination} on ${departure_date}`);

    // Return empty results as requested, ready for new scraper integration
    return new Response(JSON.stringify({
      offers: [],
      total: 0,
      requestId: crypto.randomUUID(),
      status: "ready_for_integration",
      message: "External providers stripped. Awaiting new scraper implementation."
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (e: any) {
    return new Response(JSON.stringify({ error: "INTERNAL_ERROR", message: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});