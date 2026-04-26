// supabase/functions/search-flights/kiwiRapid.ts
// Kiwi.com Cheap Flights — RapidAPI Provider
// Endpoint: kiwi-com-cheap-flights.p.rapidapi.com

import { SearchParams, NormalizedOffer, FlightSegment } from "./types.ts";

const RAPIDAPI_HOST = "kiwi-com-cheap-flights.p.rapidapi.com";
const TIMEOUT_MS = 15_000;

// ---- Diagnostics ----

export interface KiwiRapidDiagnostic {
  keyPresent: boolean;
  keyLength: number;
  isValid: boolean;
  isPlaceholder: boolean;
  apiStatus?: number;
  apiMessage?: string;
}

export async function checkKiwiRapidStatus(): Promise<KiwiRapidDiagnostic> {
  const apiKey = Deno.env.get("RAPIDAPI_KEY");
  const diag: KiwiRapidDiagnostic = {
    keyPresent: !!apiKey,
    keyLength: apiKey?.length || 0,
    isValid: false,
    isPlaceholder: !apiKey || apiKey === "YOUR_RAPIDAPI_KEY" || apiKey.length < 20,
  };

  if (diag.isPlaceholder) return diag;

  try {
    // Lightweight probe — one-way search with limit=1 to validate key
    const probeUrl = `https://${RAPIDAPI_HOST}/one-way?` + new URLSearchParams({
      fly_from: "JFK",
      fly_to: "LHR",
      date_from: "01/01/2027",
      date_to: "01/01/2027",
      adults: "1",
      curr: "USD",
      limit: "1",
    });

    const resp = await fetch(probeUrl, {
      headers: {
        "X-RapidAPI-Key": apiKey!,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
      signal: AbortSignal.timeout(5000),
    });

    diag.apiStatus = resp.status;
    diag.isValid = resp.ok;
    diag.apiMessage = resp.ok ? "Connection successful" : await resp.text().catch(() => "Unknown error");
  } catch (err: any) {
    diag.apiMessage = err.message;
  }

  return diag;
}

// ---- Helper: parse ISO duration (PT2H30M) → human-readable ----

function formatDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `PT${h}H${m}M`;
}

// ---- Helper: format date for Kiwi (DD/MM/YYYY) ----

function toKiwiDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-");
  return `${d}/${m}/${y}`;
}

// ---- Normalize a single Kiwi itinerary into the system NormalizedOffer format ----

function normalizeKiwiItinerary(itinerary: any): NormalizedOffer | null {
  try {
    // The "Kiwi.com Cheap Flights" RapidAPI returns itineraries with
    // outbound/inbound sector segments. Handle both structures.
    const outboundSectors = itinerary.outbound?.sectorSegments || [];
    const inboundSectors = itinerary.inbound?.sectorSegments || [];

    const firstOutbound = outboundSectors[0]?.segment;
    const lastOutbound = outboundSectors[outboundSectors.length - 1]?.segment;
    const firstInbound = inboundSectors[0]?.segment;

    // If no outbound segment at all, skip
    if (!firstOutbound) return null;

    const price = Number(itinerary.price?.amount ?? itinerary.price ?? 0);
    if (price <= 0) return null;

    const carrierName = firstOutbound.carrier?.name || firstOutbound.carrier?.code || "Unknown";
    const carrierCode = firstOutbound.carrier?.code || firstOutbound.carrierCode || "";

    const originCode =
      firstOutbound.source?.station?.code ||
      firstOutbound.source?.iata ||
      firstOutbound.origin ||
      "";

    const destCode =
      (lastOutbound || firstOutbound).destination?.station?.code ||
      (lastOutbound || firstOutbound).destination?.iata ||
      (lastOutbound || firstOutbound).destination ||
      "";

    const departTime =
      firstOutbound.source?.localTime ||
      firstOutbound.departure?.localTime ||
      firstOutbound.local_departure ||
      firstOutbound.departing_at ||
      "";

    const arriveTime =
      (lastOutbound || firstOutbound).destination?.localTime ||
      (lastOutbound || firstOutbound).arrival?.localTime ||
      (lastOutbound || firstOutbound).local_arrival ||
      (lastOutbound || firstOutbound).arriving_at ||
      "";

    const flightNumber = firstOutbound.code || `${carrierCode}${firstOutbound.number || ""}`;

    // Build segments array
    const segments: FlightSegment[] = outboundSectors
      .filter((s: any) => s.segment)
      .map((s: any) => {
        const seg = s.segment;
        return {
          carrier: seg.carrier?.name || seg.carrier?.code || carrierCode,
          flight_number: seg.code || `${seg.carrier?.code || ""}${seg.number || ""}`,
          aircraft: seg.aircraft?.name || seg.aircraft?.code || "",
          origin: seg.source?.station?.code || seg.source?.iata || "",
          destination: seg.destination?.station?.code || seg.destination?.iata || "",
          departing_at: seg.source?.localTime || seg.departure?.localTime || "",
          arriving_at: seg.destination?.localTime || seg.arrival?.localTime || "",
          duration: formatDuration(seg.duration) || "",
        };
      });

    // Booking URL
    const bookingUrl =
      itinerary.bookingOptions?.edges?.[0]?.node?.bookingUrl ||
      itinerary.booking_link ||
      itinerary.deep_link ||
      null;

    // Duration
    const durationSec = itinerary.outbound?.duration || itinerary.duration?.total || itinerary.fly_duration || 0;

    return {
      id: itinerary.id || `kiwi-rapid-${crypto.randomUUID()}`,
      airline: carrierName,
      airline_logo: carrierCode
        ? `https://images.kiwi.com/airlines/64/${carrierCode}.png`
        : "",
      from: originCode.toUpperCase(),
      to: destCode.toUpperCase(),
      depart: departTime,
      arrive: arriveTime,
      duration: typeof durationSec === "number" ? formatDuration(durationSec) : String(durationSec),
      price: price.toFixed(2),
      currency: itinerary.price?.currency || "USD",
      stops: Math.max(0, outboundSectors.length - 1),
      cabin_class: itinerary.cabin_class || "economy",
      segments,
      source: "kiwi",
      _carrierCode: carrierCode,
      // Extended fields (kept on object, stripped later if needed)
      ...(bookingUrl ? { booking_url: bookingUrl } : {}),
      ...(firstInbound
        ? {
            return_departure: firstInbound.source?.localTime || "",
            return_arrival: firstInbound.destination?.localTime || "",
          }
        : {}),
    } as NormalizedOffer;
  } catch (err) {
    console.error("[KIWI_RAPID] Normalization error:", err);
    return null;
  }
}

// ---- Fallback normalizer for flat Kiwi v2-style responses ----

function normalizeKiwiFlat(item: any): NormalizedOffer | null {
  try {
    const price = Number(item.price ?? 0);
    if (price <= 0) return null;

    const carrierCode = item.airlines?.[0] || "";
    const segments: FlightSegment[] = (item.route || []).map((r: any) => ({
      carrier: r.airline || carrierCode,
      flight_number: `${r.airline || ""}${r.flight_no || ""}`,
      aircraft: "",
      origin: r.flyFrom || "",
      destination: r.flyTo || "",
      departing_at: r.local_departure || "",
      arriving_at: r.local_arrival || "",
      duration: "",
    }));

    return {
      id: item.id || `kiwi-rapid-${crypto.randomUUID()}`,
      airline: carrierCode || "Unknown",
      airline_logo: carrierCode
        ? `https://images.kiwi.com/airlines/64/${carrierCode}.png`
        : "",
      from: (item.flyFrom || "").toUpperCase(),
      to: (item.flyTo || "").toUpperCase(),
      depart: item.local_departure || "",
      arrive: item.local_arrival || "",
      duration: item.fly_duration || "",
      price: price.toFixed(2),
      currency: "USD",
      stops: Math.max(0, (item.route?.length || 1) - 1),
      cabin_class: "economy",
      segments,
      source: "kiwi",
      _carrierCode: carrierCode,
      ...(item.deep_link ? { booking_url: item.deep_link } : {}),
    } as NormalizedOffer;
  } catch (err) {
    console.error("[KIWI_RAPID] Flat normalization error:", err);
    return null;
  }
}

// ---- Main Search Function ----

export async function fetchKiwiRapidFlights(
  params: SearchParams,
): Promise<NormalizedOffer[]> {
  const apiKey = Deno.env.get("RAPIDAPI_KEY");

  // 1. Validate key
  if (!apiKey || apiKey === "YOUR_RAPIDAPI_KEY" || apiKey.length < 20) {
    console.error(
      `[KIWI_RAPID] Key validation failed: ${!apiKey ? "missing" : apiKey.length < 20 ? "too short" : "placeholder"}`,
    );
    return [];
  }

  const origin = params.origin.toUpperCase();
  const dest = params.destination.toUpperCase();
  const depDate = toKiwiDate(params.departure_date);

  // 2. Decide endpoint: round-trip vs one-way
  const isRoundTrip = !!params.return_date;

  const queryParams: Record<string, string> = {
    fly_from: origin,
    fly_to: dest,
    date_from: depDate,
    date_to: depDate,
    adults: String(params.passengers?.adults || 1),
    curr: "USD",
    limit: "20",
    locale: "en",
  };

  if (params.passengers?.children) queryParams.children = String(params.passengers.children);
  if (params.passengers?.infants) queryParams.infants = String(params.passengers.infants);
  if (params.cabin_class && params.cabin_class.toLowerCase() !== "economy") {
    queryParams.cabinClass = params.cabin_class.toUpperCase();
  }

  if (isRoundTrip && params.return_date) {
    const retDate = toKiwiDate(params.return_date);
    queryParams.return_from = retDate;
    queryParams.return_to = retDate;
  }

  const endpoint = isRoundTrip ? "round-trip" : "one-way";
  const url = `https://${RAPIDAPI_HOST}/${endpoint}?` + new URLSearchParams(queryParams);

  console.log(`[KIWI_RAPID] Fetching ${endpoint}: ${origin} → ${dest} | key: ${apiKey.substring(0, 5)}***`);

  try {
    const resp = await fetch(url, {
      method: "GET",
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": RAPIDAPI_HOST,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "No body");
      console.error(`[KIWI_RAPID] API error: ${resp.status} — ${errText}`);
      return [];
    }

    const data = await resp.json();

    // 3. Parse response — handle multiple possible shapes
    let normalized: (NormalizedOffer | null)[] = [];

    if (data.itineraries && Array.isArray(data.itineraries)) {
      // GraphQL / structured itinerary format
      console.log(`[KIWI_RAPID] Received ${data.itineraries.length} itineraries (structured)`);
      normalized = data.itineraries.map(normalizeKiwiItinerary);
    } else if (data.data && Array.isArray(data.data)) {
      // Flat v2-style format (same as old kiwi.ts)
      console.log(`[KIWI_RAPID] Received ${data.data.length} results (flat v2)`);
      normalized = data.data.map(normalizeKiwiFlat);
    } else {
      console.warn("[KIWI_RAPID] Unexpected response shape:", Object.keys(data));
      return [];
    }

    const valid = normalized.filter((o): o is NormalizedOffer => o !== null && Number(o.price) > 0);
    console.log(`[KIWI_RAPID] Normalized ${valid.length} valid offers`);
    return valid;
  } catch (err: any) {
    console.error("[KIWI_RAPID] Fetch error:", err.message);
    return [];
  }
}
