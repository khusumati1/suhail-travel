// supabase/functions/search-flights/trustEngine.ts
// ─────────────────────────────────────────────────────────
// Trust Engine — STRICT MODE: Validates every flight
// Rejects invalid, incomplete, or anomalous flights
// ─────────────────────────────────────────────────────────

import { NormalizedOffer } from "./types.ts";

const MIN_DURATION = 20;              // 20 minutes
const MAX_DURATION = 24 * 60;         // 24 hours
const MIN_PRICE = 5;
const MAX_PRICE = 50_000;
const ANOMALY_THRESHOLD = 0.70;       // ±70% from median
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
const IATA_RE = /^[A-Z]{3}$/;

export interface TrustResult {
  verified: NormalizedOffer[];
  rejected: number;
  reasons: Record<string, number>;
}

function validateFlight(
  flight: NormalizedOffer,
  allPrices: number[],
): { pass: boolean; reason?: string } {

  // 1. Must have airline
  if (!flight.airline || flight.airline === "Unknown" || flight.airline === "Unknown Airline") {
    return { pass: false, reason: "missing_airline" };
  }

  // 2. Must have carrier code
  if (!flight._carrierCode) {
    return { pass: false, reason: "missing_carrier_code" };
  }

  // 3. Must have segments
  if (!flight.segments || flight.segments.length === 0) {
    return { pass: false, reason: "missing_segments" };
  }

  // 4. Price bounds
  if (flight.price <= MIN_PRICE || flight.price > MAX_PRICE || !isFinite(flight.price)) {
    return { pass: false, reason: `invalid_price:${flight.price}` };
  }

  // 5. Valid ISO timestamps
  if (!flight.depart || !ISO_DATE_RE.test(flight.depart)) {
    return { pass: false, reason: "invalid_departure_time" };
  }
  if (!flight.arrive || !ISO_DATE_RE.test(flight.arrive)) {
    return { pass: false, reason: "invalid_arrival_time" };
  }

  // 6. Departure before arrival
  if (flight.depart >= flight.arrive) {
    return { pass: false, reason: "departure_after_arrival" };
  }

  // 7. Duration: 20min – 24h
  if (flight.duration > 0 && (flight.duration < MIN_DURATION || flight.duration > MAX_DURATION)) {
    return { pass: false, reason: `unrealistic_duration:${flight.duration}min` };
  }

  // 8. Valid IATA codes
  if (!IATA_RE.test(flight.from.toUpperCase())) {
    return { pass: false, reason: `invalid_origin_iata:${flight.from}` };
  }
  if (!IATA_RE.test(flight.to.toUpperCase())) {
    return { pass: false, reason: `invalid_dest_iata:${flight.to}` };
  }

  // 9. Stops must match segments
  const expectedStops = Math.max(0, flight.segments.length - 1);
  if (flight.stops !== expectedStops) {
    // Auto-fix instead of reject
    flight.stops = expectedStops;
  }

  // 10. Price anomaly (±70% from median) — only if we have enough data
  if (allPrices.length >= 3) {
    const sorted = [...allPrices].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];
    if (median > 0) {
      const deviation = Math.abs(flight.price - median) / median;
      if (deviation > ANOMALY_THRESHOLD) {
        return { pass: false, reason: `price_anomaly:${(deviation * 100).toFixed(0)}%` };
      }
    }
  }

  return { pass: true };
}

/**
 * Apply trust validation to all flights.
 * Returns only flights that pass ALL checks.
 */
export function applyTrustEngine(flights: NormalizedOffer[]): TrustResult {
  const prices = flights.map((f) => f.price).filter((p) => p > 0);
  const verified: NormalizedOffer[] = [];
  const reasons: Record<string, number> = {};
  let rejected = 0;

  for (const f of flights) {
    const r = validateFlight(f, prices);
    if (r.pass) {
      verified.push(f);
    } else {
      rejected++;
      const key = r.reason || "unknown";
      reasons[key] = (reasons[key] || 0) + 1;
    }
  }

  if (rejected > 0) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      event: "trust_engine_result",
      accepted: verified.length,
      rejected,
      reasons,
    }));
  }

  return { verified, rejected, reasons };
}
