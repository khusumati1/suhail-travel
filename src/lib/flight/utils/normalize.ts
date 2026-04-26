// src/lib/flight/utils/normalize.ts
// ─────────────────────────────────────────────────────────
// Flight Data Normalization + Duration Parsing
// ─────────────────────────────────────────────────────────

import type { FlightResult, FlightSegment } from "../types";

// ── Duration Parsing ──

/** Parse ISO 8601 duration (PT5H30M) → minutes */
export function parseDuration(iso: string | number | undefined): number {
  if (typeof iso === "number") {
    // If > 600, assume seconds; otherwise minutes
    return iso > 600 ? Math.round(iso / 60) : iso;
  }
  if (!iso || typeof iso !== "string") return 0;

  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  return parseInt(match[1] || "0", 10) * 60 + parseInt(match[2] || "0", 10);
}

/** Format minutes → human-readable "2h 30m" */
export function formatDuration(minutes: number): string {
  if (minutes <= 0) return "";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

// ── Amadeus Normalizer ──

export function normalizeAmadeusOffer(
  offer: any,
  dictionaries?: any,
): FlightResult | null {
  try {
    const itinerary = offer.itineraries?.[0];
    const rawSegments = itinerary?.segments ?? [];
    const firstSeg = rawSegments[0];
    const lastSeg = rawSegments[rawSegments.length - 1];

    if (!firstSeg) return null;

    const price = Number(offer.price?.total ?? 0);
    if (price <= 0 || !isFinite(price)) return null;

    const carrierCode =
      firstSeg.carrierCode ||
      offer.validatingAirlineCodes?.[0] ||
      "";

    const airline =
      dictionaries?.carriers?.[carrierCode] ||
      carrierCode ||
      "Unknown";

    const departure = firstSeg.departure?.at || "";
    const arrival = lastSeg?.arrival?.at || "";
    if (!departure || !arrival) return null;

    const durationMinutes = parseDuration(itinerary?.duration);
    const stops = Math.max(0, rawSegments.length - 1);

    const segments: FlightSegment[] = rawSegments.map((seg: any) => ({
      carrier: dictionaries?.carriers?.[seg.carrierCode] || seg.carrierCode || "",
      flightNumber: `${seg.carrierCode || ""}${seg.number || ""}`,
      aircraft: dictionaries?.aircraft?.[seg.aircraft?.code] || seg.aircraft?.code || "",
      origin: seg.departure?.iataCode || "",
      destination: seg.arrival?.iataCode || "",
      departingAt: seg.departure?.at || "",
      arrivingAt: seg.arrival?.at || "",
      durationMinutes: parseDuration(seg.duration),
    }));

    return {
      id: offer.id || `amadeus-${crypto.randomUUID()}`,
      airline,
      airlineLogo: carrierCode
        ? `https://images.kiwi.com/airlines/64/${carrierCode}.png`
        : "",
      price,
      currency: offer.price?.currency || "USD",
      departure,
      arrival,
      durationMinutes,
      stops,
      isDirect: stops === 0,
      source: "amadeus",
      segments,
      cabinClass:
        offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin?.toLowerCase() ||
        "economy",
    };
  } catch (err) {
    console.warn("[normalize] Amadeus offer error:", err);
    return null;
  }
}

// ── Aviation Stack Normalizer (stub — adapt to real API shape) ──

export function normalizeAviationOffer(raw: any): FlightResult | null {
  try {
    const price = Number(raw.price ?? raw.fare?.total ?? 0);
    if (price <= 0 || !isFinite(price)) return null;

    const departure = raw.departure?.scheduled || raw.departure_time || "";
    const arrival = raw.arrival?.scheduled || raw.arrival_time || "";
    if (!departure || !arrival) return null;

    const durationMinutes = parseDuration(raw.duration);

    return {
      id: raw.id || `aviation-${crypto.randomUUID()}`,
      airline: raw.airline?.name || raw.airline || "Unknown",
      airlineLogo: "",
      price,
      currency: raw.currency || "USD",
      departure,
      arrival,
      durationMinutes,
      stops: Number(raw.stops ?? 0),
      isDirect: Number(raw.stops ?? 0) === 0,
      source: "aviation",
    };
  } catch (err) {
    console.warn("[normalize] Aviation offer error:", err);
    return null;
  }
}

// ── Deduplication ──

export function deduplicateFlights(flights: FlightResult[]): FlightResult[] {
  const seen = new Map<string, FlightResult>();

  for (const f of flights) {
    // Key on airline + departure + arrival to collapse identical flights
    const key = `${f.airline}-${f.departure}-${f.arrival}`;
    const existing = seen.get(key);

    if (!existing || f.price < existing.price) {
      seen.set(key, f);
    }
  }

  return Array.from(seen.values());
}
