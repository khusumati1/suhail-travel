// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

declare const Deno: any;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { name, lat, lng, city = "" } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");

    // --- CACHE CHECK (but ignore if previously stored fallback) ---
    const { data: cached } = await supabase.from("hotel_images").select("*").eq("hotel_name", name).maybeSingle();
    if (cached && cached.images?.length && cached.source !== "fallback") {
      console.error(`CACHE HIT (real): ${name}`);
      return new Response(JSON.stringify(cached), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    console.error(`START SEARCH: ${name} (${city})`);
    const fsqKey = Deno.env.get("FOURSQUARE_API_KEY");
    const clientId = Deno.env.get("FOURSQUARE_CLIENT_ID");
    const clientSecret = Deno.env.get("FOURSQUARE_CLIENT_SECRET");

    let images: string[] = [];
    let source = "fallback"; // default fallback
    let address = "";

    const cleanName = name.replace(/هتل|فندق|hotel|resort/gi, "").trim();
    const queries = [name, cleanName, `${cleanName} ${city}`];
    const radius = 5000; // broaden search radius a bit

    // Helper to fetch photos from a venue ID (v2)
    const fetchV2Photos = async (venueId: string) => {
      const pRes = await fetch(`https://api.foursquare.com/v2/venues/${venueId}/photos?client_id=${clientId}&client_secret=${clientSecret}&v=20231010&limit=10`);
      const pData = await pRes.json();
      const photos = pData.response?.photos?.items || pData.response?.photos?.groups?.flatMap((g: any) => g.items || []) || [];
      return photos;
    };

    // 1️⃣ Try Foursquare V3 (usually better localisation)
    if (fsqKey) {
      for (const q of queries) {
        if (images.length) break;
        try {
          const searchRes = await fetch(`https://api.foursquare.com/v3/places/search?query=${encodeURIComponent(q)}&ll=${lat},${lng}&radius=${radius}&limit=5`, {
            headers: { Authorization: fsqKey, "Accept-Language": "ar,en" },
          });
          const searchData = await searchRes.json();
          if (searchData.results?.length) {
            const venue = searchData.results[0];
            const photosRes = await fetch(`https://api.foursquare.com/v3/places/${venue.fsq_id}/photos?limit=10`, {
              headers: { Authorization: fsqKey },
            });
            const photos = await photosRes.json();
            if (photos?.length) {
              images = photos.map((p: any) => `${p.prefix}800x600${p.suffix}`);
              source = "foursquare_v3";
              address = venue.location?.formatted_address || "";
            }
          }
        } catch (e: any) {
          console.error(`V3 error (${q}): ${e.message}`);
        }
      }
    }

    // 2️⃣ If V3 gave nothing, try V2 (using provided client ID/secret)
    if (images.length === 0 && clientId && clientSecret) {
      for (const q of queries) {
        if (images.length) break;
        try {
          const v = "20231010";
          const searchRes = await fetch(`https://api.foursquare.com/v2/venues/search?client_id=${clientId}&client_secret=${clientSecret}&v=${v}&ll=${lat},${lng}&query=${encodeURIComponent(q)}&radius=${radius}&limit=5`);
          const searchData = await searchRes.json();
          const venues = searchData.response?.venues || [];
          if (venues.length) {
            const venue = venues[0];
            const photos = await fetchV2Photos(venue.id);
            if (photos.length) {
              images = photos.map((p: any) => `${p.prefix}800x600${p.suffix}`);
              source = "foursquare_v2";
              address = venue.location?.formatted_address || venue.location?.address || "";
            }
          }
        } catch (e: any) {
          console.error(`V2 error (${q}): ${e.message}`);
        }
      }
    }

    // 3️⃣ Category based search as a last resort (any hotel near location)
    if (images.length === 0 && fsqKey) {
      try {
        const catRes = await fetch(`https://api.foursquare.com/v3/places/search?categories=19014&ll=${lat},${lng}&radius=500&limit=1`, {
          headers: { Authorization: fsqKey },
        });
        const catData = await catRes.json();
        if (catData.results?.length) {
          const venue = catData.results[0];
          const photosRes = await fetch(`https://api.foursquare.com/v3/places/${venue.fsq_id}/photos?limit=10`, {
            headers: { Authorization: fsqKey },
          });
          const photos = await photosRes.json();
          if (photos?.length) {
            images = photos.map((p: any) => `${p.prefix}800x600${p.suffix}`);
            source = "foursquare_category";
            address = venue.location?.formatted_address || "";
          }
        }
      } catch (e: any) { console.error(`Category search error: ${e.message}`); }
    }

    // 4️⃣ Smart Unsplash fallback – dynamic query using hotel name & city.
    if (images.length === 0) {
      const query = encodeURIComponent(`${cleanName} ${city} hotel`);
      // Use Unsplash Source API for a random but relevant image.
      images = [
        `https://source.unsplash.com/featured/800x600?${query}&sig=1`,
        `https://source.unsplash.com/featured/800x600?${query}&sig=2`,
        `https://source.unsplash.com/featured/800x600?${query}&sig=3`,
      ];
      source = "unsplash_dynamic";
    }

    const responseData = {
      hotel_name: name,
      images,
      address,
      city,
      is_fallback: source.startsWith("unsplash"),
      source,
    };

    // Upsert – this will overwrite any previous placeholder.
    await supabase.from("hotel_images").upsert(responseData, { onConflict: "hotel_name" });

    return new Response(JSON.stringify(responseData), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error: any) {
    console.error(`CRITICAL ERROR: ${error.message}`);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});