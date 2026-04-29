/// <reference path="../deno.d.ts" />
// supabase/functions/search-places/index.ts
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const query = url.searchParams.get("query");

    console.log(`Place search request received: ${query}`);

    // Return empty results as requested
    return new Response(JSON.stringify({
      places: [],
      message: "External place providers stripped."
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
