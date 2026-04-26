// supabase/functions/search-flights/priceGuard.ts
// ─────────────────────────────────────────────────────────
// Price Guard — Cross-Phase Price Consistency Engine
// Tracks price across: Search → Pricing → Booking
// ─────────────────────────────────────────────────────────

import { NormalizedOffer } from "./types.ts";

const MAX_DEVIATION = 0.20;             // 20% threshold
const RELIABILITY_HIGH = 0.95;
const RELIABILITY_MEDIUM = 0.70;
const RELIABILITY_LOW = 0.40;

export interface PriceGuardResult {
  offerId: string;
  searchPrice: number;
  confirmedPrice: number;
  deviation: number;                    // Absolute percentage deviation
  deviationDirection: "up" | "down" | "stable";
  passed: boolean;                      // Within 20% threshold
  reliability: number;                  // 0.0 – 1.0
}

export interface PriceGuardSummary {
  totalChecked: number;
  passed: number;
  failed: number;
  avgDeviation: number;
  maxDeviation: number;
  results: PriceGuardResult[];
  deviationLog: DeviationLogEntry[];
}

export interface DeviationLogEntry {
  offerId: string;
  airline: string;
  route: string;
  searchPrice: number;
  confirmedPrice: number;
  deviation: number;
  timestamp: string;
}

/**
 * Compare search prices against confirmed prices.
 * Returns detailed results for each flight.
 */
export function runPriceGuard(
  flights: NormalizedOffer[],
): PriceGuardSummary {
  const results: PriceGuardResult[] = [];
  const deviationLog: DeviationLogEntry[] = [];
  let totalDeviation = 0;
  let maxDeviation = 0;

  for (const f of flights) {
    // Only check flights that have both prices
    if (!f.confirmed_price || f.confirmed_price <= 0) continue;

    const searchPrice = f.estimated_price;
    const confirmedPrice = f.confirmed_price;

    if (searchPrice <= 0) continue;

    const deviation = Math.abs(confirmedPrice - searchPrice) / searchPrice;
    const passed = deviation <= MAX_DEVIATION;

    const deviationDirection: "up" | "down" | "stable" =
      confirmedPrice > searchPrice * 1.01 ? "up"
      : confirmedPrice < searchPrice * 0.99 ? "down"
      : "stable";

    const result: PriceGuardResult = {
      offerId: f.id,
      searchPrice,
      confirmedPrice,
      deviation,
      deviationDirection,
      passed,
      reliability: computeReliability(f),
    };

    results.push(result);
    totalDeviation += deviation;
    maxDeviation = Math.max(maxDeviation, deviation);

    // Log deviations for observability
    if (deviation > 0.05) { // Log anything above 5%
      deviationLog.push({
        offerId: f.id,
        airline: f.airline,
        route: `${f.from}-${f.to}`,
        searchPrice,
        confirmedPrice,
        deviation,
        timestamp: new Date().toISOString(),
      });
    }
  }

  const totalChecked = results.length;
  const passed = results.filter(r => r.passed).length;

  const summary: PriceGuardSummary = {
    totalChecked,
    passed,
    failed: totalChecked - passed,
    avgDeviation: totalChecked > 0 ? totalDeviation / totalChecked : 0,
    maxDeviation,
    results,
    deviationLog,
  };

  // Log summary
  if (totalChecked > 0) {
    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      event: "price_guard_summary",
      totalChecked,
      passed,
      failed: totalChecked - passed,
      avgDeviation: (summary.avgDeviation * 100).toFixed(1) + "%",
      maxDeviation: (maxDeviation * 100).toFixed(1) + "%",
    }));
  }

  // Log individual deviations
  for (const entry of deviationLog) {
    console.log(JSON.stringify({
      timestamp: entry.timestamp,
      level: entry.deviation > MAX_DEVIATION ? "error" : "info",
      event: "price_deviation",
      ...entry,
      deviation: (entry.deviation * 100).toFixed(1) + "%",
    }));
  }

  return summary;
}

/**
 * Compute reliability score for a single flight.
 * Used in ranking — higher is better.
 */
export function computeReliability(flight: NormalizedOffer): number {
  // Base score by price_status
  let score: number;

  switch (flight.price_status) {
    case "confirmed":
      score = RELIABILITY_HIGH;
      break;
    case "price_changed":
      score = RELIABILITY_LOW;
      break;
    default: // "estimated"
      score = RELIABILITY_MEDIUM;
  }

  // Bonus for Amadeus source (GDS = more reliable)
  if (flight.source === "amadeus") {
    score = Math.min(1.0, score + 0.05);
  }

  // Penalty if price deviation is known and high
  if (flight.confirmed_price && flight.estimated_price > 0) {
    const deviation = Math.abs(flight.confirmed_price - flight.estimated_price) / flight.estimated_price;
    if (deviation > 0.10) {
      score = Math.max(0, score - 0.10);
    }
    if (deviation > 0.20) {
      score = Math.max(0, score - 0.15);
    }
  }

  return Math.round(score * 100) / 100;
}

/**
 * Apply price guard results back to flights.
 * Mutates flights in-place.
 */
export function applyPriceGuardResults(
  flights: NormalizedOffer[],
  guardSummary: PriceGuardSummary,
): void {
  for (const result of guardSummary.results) {
    const flight = flights.find(f => f.id === result.offerId);
    if (!flight) continue;

    // Update reliability on the flight object
    (flight as any).reliability = result.reliability;

    // If price guard failed (>20% deviation), downgrade status
    if (!result.passed && flight.price_status !== "price_changed") {
      flight.price_status = "price_changed";
    }
  }
}

/**
 * Check if a flight is safe to book.
 * HARD RULE: Only confirmed flights are bookable.
 */
export function isBookingSafe(flight: NormalizedOffer): {
  safe: boolean;
  reason?: string;
} {
  if (flight.price_status !== "confirmed") {
    return {
      safe: false,
      reason: flight.price_status === "price_changed"
        ? "PRICE_CHANGED_SINCE_SEARCH"
        : "PRICE_NOT_CONFIRMED",
    };
  }

  if (!flight.confirmed_price || flight.confirmed_price <= 0) {
    return { safe: false, reason: "NO_CONFIRMED_PRICE" };
  }

  if (!flight.airline || flight.airline === "Unknown") {
    return { safe: false, reason: "MISSING_AIRLINE" };
  }

  if (!flight.segments || flight.segments.length === 0) {
    return { safe: false, reason: "MISSING_SEGMENTS" };
  }

  return { safe: true };
}
