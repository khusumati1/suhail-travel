/// <reference path="../deno.d.ts" />
// supabase/functions/hotel-images/index.ts
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });

  try {
    const { name } = await req.json();

    console.log(`Hotel image request received for: ${name}`);

    // Return empty results as requested
    return new Response(JSON.stringify({
      hotel_name: name,
      images: [],
      source: "none",
      message: "External image providers stripped."
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