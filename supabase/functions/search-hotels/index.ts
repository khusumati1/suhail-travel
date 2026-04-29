/// <reference path="../deno.d.ts" />
// supabase/functions/search-hotels/index.ts
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const body = await req.json();
    const { cityName, checkin, checkout } = body;

    // Basic validation
    if (!cityName || !checkin || !checkout) {
      return new Response(JSON.stringify({ error: "INVALID_PARAMS", message: "City name, checkin, and checkout dates are required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    console.log(`Hotel search request received for: ${cityName}`);

    // Return empty results as requested, ready for new scraper integration
    return new Response(JSON.stringify({
      hotels: [],
      totalCount: 0,
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