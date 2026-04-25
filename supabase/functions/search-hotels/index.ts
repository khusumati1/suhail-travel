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
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-platform, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ───────── CONFIG & KEYS ─────────
// @ts-ignore: Deno is available in Supabase Edge Functions runtime
const GEOAPIFY_KEY = getEnv('GEOAPIFY_KEY') || "2d43924f3c6c49e8998a4a728a082162";

// ───────── HIGH-RES HOTEL IMAGES FOR PLACEHOLDING ─────────
const UNSPLASH_IMAGES = [
  "https://images.pexels.com/photos/164595/pexels-photo-164595.jpeg?auto=compress&cs=tinysrgb&w=800",
  "https://images.pexels.com/photos/258154/pexels-photo-258154.jpeg?auto=compress&cs=tinysrgb&w=800",
  "https://images.pexels.com/photos/338504/pexels-photo-338504.jpeg?auto=compress&cs=tinysrgb&w=800",
  "https://images.pexels.com/photos/271618/pexels-photo-271618.jpeg?auto=compress&cs=tinysrgb&w=800",
  "https://images.pexels.com/photos/262048/pexels-photo-262048.jpeg?auto=compress&cs=tinysrgb&w=800",
  "https://images.pexels.com/photos/189296/pexels-photo-189296.jpeg?auto=compress&cs=tinysrgb&w=800"
];
// Helper to extract the best available image URL from Geoapify place properties
function extractHotelImage(props: any): string | null {
  const candidates = [
    props?.preview?.source,
    props?.preview?.url,
    props?.thumbnail?.source,
    props?.thumbnail?.url,
    props?.image,
    props?.images?.[0]?.source,
    props?.images?.[0]?.url,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === 'string' && /^https?:\/\//.test(candidate)) {
      return candidate;
    }
  }

  return null;
}


const safeResponse = (data: unknown) =>
  new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const safeFetch = async (url: string, timeout = 9500) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeout);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(t);
    return res.ok ? await res.json() : null;
  } catch {
    clearTimeout(t);
    return null;
  }
};

// Amadeus OAuth token cache (in‑memory)
let amadeusToken: string | null = null;
let tokenExpiresAt = 0; // epoch ms
async function getAmadeusToken(): Promise<string | null> {
  const now = Date.now();
  if (amadeusToken && now < tokenExpiresAt - 60_000) return amadeusToken; // refresh 1 min before expiry
  const clientId = getEnv('AMADEUS_CLIENT_ID') ?? "";
  const clientSecret = getEnv('AMADEUS_CLIENT_SECRET') ?? "";
  if (!clientId || !clientSecret) return null;
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
  if (!resp.ok) return null;
  const data = await resp.json();
  amadeusToken = data.access_token;
  tokenExpiresAt = now + data.expires_in * 1000;
  return amadeusToken;
}

// Helper to call Amadeus APIs with Authorization header and timeout handling
async function amadeusFetch(url: string): Promise<any> {
  const token = await getAmadeusToken();
  if (!token) return null;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9500);
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      signal: controller.signal,
    });
    clearTimeout(timeout);
    return resp.ok ? await resp.json() : null;
  } catch {
    return null;
  }
}

// Pseudo-random number generator based on string hash to ensure consistent pricing
function hashString(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generatePrice(hotelName: string, checkin: string, checkout: string, adults: number) {
  const hash = hashString(hotelName);
  
  // Base price between 80 and 400
  const minPrice = 80;
  const maxPrice = 400;
  let basePrice = minPrice + (hash % (maxPrice - minPrice + 1));

  let isWeekend = false;
  if (checkin) {
    const d = new Date(checkin);
    const day = d.getDay();
    if (day === 5 || day === 6) isWeekend = true; // Friday or Saturday
  }

  // Multiply by weekend spike
  if (isWeekend) basePrice *= 1.25;

  // Multiply by adults
  const guestMultiplier = adults ? Math.max(1, adults * 0.7) : 1;
  basePrice *= guestMultiplier;

  return Math.floor(basePrice);
}

serve(async (req: Request) => {
  // Rate limiting
  const rlResponse = checkRateLimit(req);
  if (rlResponse) return rlResponse;

  // Extract optional Authorization header for debugging / future auth
  const authHeader = req.headers.get('authorization');
  if (getEnv('SUPABASE_ENV') === 'development') {
    console.log('search‑hotels auth header:', authHeader);
  }
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  
  try {
    const body = await req.json().catch(() => ({}));
    const { action, cityName, regionId, locationId, checkin, checkout, adults = 2 } = body;
  // In development, clear in‑memory caches to prevent stale placeholder images after code changes

    // ── DETAILS ENDPOINT ──
    if (locationId) {
      const detailsUrl = `https://api.geoapify.com/v2/place-details?id=${locationId}&apiKey=${GEOAPIFY_KEY}`;
      const data = await safeFetch(detailsUrl);
      
      if (!data?.features?.[0]) {
        return safeResponse({ error: "Hotel not found" });
      }

      const feature = data.features[0];
      const props = feature.properties;
      const hotelName = props.name || "فندق رائع";
      
      const price = generatePrice(hotelName, checkin, checkout, adults);
      const hash = hashString(hotelName);
      const rating = props.accommodation?.stars ? props.accommodation.stars : (3 + (hash % 3));

      // Build simulated images
      const images = [];
      for (let i = 0; i < 4; i++) {
        images.push(UNSPLASH_IMAGES[(hash + i) % UNSPLASH_IMAGES.length]);
      }

      // Try to get a real image for the main property image
      const realImage = extractHotelImage(props);
      const mainImage = realImage ?? images[0];

      const hotel = {
        id: props.place_id,
        name: hotelName,
        description: props.formatted ? `يقع ${hotelName} في ${props.formatted}. يوفر هذا الفندق إقامة مريحة مع كافة الخدمات، وموقعه مثالي للوصول إلى أبرز معالم المدينة.` : "فندق متميز ذو إطلالة رائعة وخدمات متكاملة.",
        propertyImage: mainImage,
        images,
        reviewScore: rating,
        reviewCount: 300 + (hash % 4000),
        neighborhood: props.address_line2 || props.city || "المنطقة المركزية",
        address: props.formatted,
        lat: props.lat,
        lon: props.lon,
        price,
        priceFormatted: `$${price}`,
        star: rating > 5 ? 5 : rating,
        rawContact: props.contact
      };
      return safeResponse({ hotel });
    }

    // ── REGIONS ENDPOINT ──
    if (action === "regions") {
      const query = body.query || "";
      const geoUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(query)}&type=city&limit=5&format=json&apiKey=${GEOAPIFY_KEY}`;
      const data = await safeFetch(geoUrl);
      
      const regions = data?.results?.map((r: any) => ({
        gaiaId: r.place_id,
        regionNames: {
          displayName: r.formatted,
          primaryDisplayName: r.city || r.name || query,
          secondaryDisplayName: r.country || ""
        },
        coordinates: { lat: r.lat, long: r.lon }
      })) || [];
      
      return safeResponse({ regions });
    }

    // ── SEARCH ENDPOINT ──
if (action === "search") {
  // 1️⃣ Resolve latitude/longitude via Geoapify (still used for coordinates) and placeId for fallback
  let lat: number | null = null;
  let lon: number | null = null;
  let placeId: string | null = null;

  if (regionId) {
    placeId = regionId;
    const detailUrl = `https://api.geoapify.com/v2/place-details?id=${regionId}&apiKey=${GEOAPIFY_KEY}`;
    const detailData = await safeFetch(detailUrl);
    lat = detailData?.features?.[0]?.properties?.lat;
    lon = detailData?.features?.[0]?.properties?.lon;
  } else if (cityName) {
    const geoUrl = `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(cityName)}&type=city&limit=1&format=json&apiKey=${GEOAPIFY_KEY}`;
    const geoData = await safeFetch(geoUrl);
    placeId = geoData?.results?.[0]?.place_id ?? null;
    lat = geoData?.results?.[0]?.lat;
    lon = geoData?.results?.[0]?.lon;
  }

  if (lat == null || lon == null) {
    return safeResponse({ hotels: [], error: "Unable to geocode location" });
  }

  // 2️⃣ Attempt Amadeus hotel list
  const amadeusListUrl = `https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-geocode?latitude=${lat}&longitude=${lon}`;
  const amadeusListResp = await amadeusFetch(amadeusListUrl);
  const amadeusHotels = amadeusListResp?.data ?? [];

  // Fallback to original Geoapify flow if Amadeus returns no data
  if (!Array.isArray(amadeusHotels) || amadeusHotels.length === 0) {
    // --- Geoapify fallback (same as original) ---
    const placesUrl = `https://api.geoapify.com/v2/places?categories=accommodation.hotel&filter=place:${placeId || ""}&limit=20&apiKey=${GEOAPIFY_KEY}`;
    const geoPlaces = await safeFetch(placesUrl);
    const features = geoPlaces?.features || [];
    const fallbackHotels = features.map((f: any) => {
      const props = f.properties;
      const name = props.name || `فندق ${cityName || "مجهول"}`;
      const hash = hashString(name + props.place_id);
      const price = generatePrice(name, checkin, checkout, adults);
      const rating = props.accommodation?.stars ? props.accommodation.stars : (3 + (hash % 3));
      const realImage = extractHotelImage(props);
      const propertyImage = realImage ?? UNSPLASH_IMAGES[hash % UNSPLASH_IMAGES.length];
      return {
        id: props.place_id,
        name,
        propertyImage,
        reviewScore: Number(rating.toFixed(1)),
        reviewCount: 300 + (hash % 4000),
        price,
        priceFormatted: `$${price}`,
        currency: "USD",
        star: rating > 5 ? 5 : rating,
        neighborhood: props.district || props.suburb || props.city,
        address: props.formatted,
        lat: props.lat,
        lon: props.lon,
      };
    });
    return safeResponse({ hotels: fallbackHotels, totalCount: fallbackHotels.length });
  }

  // 3️⃣ Limit number of hotels to 6 as decided
  const LIMIT = 6;
  const limited = amadeusHotels.slice(0, LIMIT);

  // 4️⃣ Batch request offers for these hotel IDs
  const hotelIds = limited.map((h: any) => h.hotelId).filter(Boolean);
  const offersUrl = `https://test.api.amadeus.com/v3/shopping/hotel-offers?hotelIds=${hotelIds.join(",")}`;
  const offersResp = await amadeusFetch(offersUrl);
  const offersMap: Record<string, any> = {};
  (offersResp?.data ?? []).forEach((o: any) => {
    const id = o?.hotel?.hotelId;
    if (id) offersMap[id] = o;
  });

  // 5️⃣ Build final hotel list, using fallback price when offer missing
  const hotels = limited.map((h: any) => {
    const priceInfo = offersMap[h.hotelId]?.offers?.[0]?.price ?? null;
    const price = priceInfo?.total ? Number(priceInfo.total) : generatePrice(h.name, checkin, checkout, adults);
    const hash = hashString(h.name + h.hotelId);
    const rating = 3 + (hash % 3); // deterministic rating fallback
    const propertyImage = UNSPLASH_IMAGES[hash % UNSPLASH_IMAGES.length]; // keep Unsplash fallback only
    return {
      id: h.hotelId,
      name: h.name,
      propertyImage,
      reviewScore: Number(rating.toFixed(1)),
      reviewCount: 300 + (hash % 4000),
      price,
      priceFormatted: `$${price}`,
      currency: "USD",
      star: rating > 5 ? 5 : rating,
      neighborhood: h.address?.cityName || "",
      address: h.address?.line1 || "",
      lat: h.geoCode?.latitude ?? lat,
      lon: h.geoCode?.longitude ?? lon,
    };
  });

  // 6️⃣ Sort by price ascending
  const sorted = hotels.sort((a, b) => a.price - b.price);

  return safeResponse({ hotels: sorted, totalCount: sorted.length });
}

    return safeResponse({ error: "Invalid action" });

  } catch (err) {
    return safeResponse({ hotels: [], error: String(err) });
  }
});