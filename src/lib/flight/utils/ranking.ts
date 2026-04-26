// src/lib/flight/utils/ranking.ts
// ─────────────────────────────────────────────────────────
// Flight Scoring, Ranking, Labels & Filtering
// ─────────────────────────────────────────────────────────

import type { FlightResult, FlightFilters, FlightLabel } from "../types";

// ── Scoring ──

const W_PRICE = 0.5;
const W_DURATION = 0.25;
const W_STOPS = 120;
const DIRECT_BONUS = -50;

function computeScore(f: FlightResult): number {
  return (
    f.price * W_PRICE +
    f.durationMinutes * W_DURATION +
    f.stops * W_STOPS +
    (f.isDirect ? DIRECT_BONUS : 0)
  );
}

// ── Ranking ──

export function rankFlights(flights: FlightResult[]): FlightResult[] {
  // Compute scores
  const scored = flights.map((f) => ({
    ...f,
    score: computeScore(f),
  }));

  // Sort ascending (lowest score = best)
  scored.sort((a, b) => a.score - b.score);
  return scored;
}

// ── Labels ──

export function assignLabels(flights: FlightResult[]): FlightResult[] {
  if (flights.length === 0) return flights;

  // Clear existing labels
  for (const f of flights) f.label = undefined;

  // Best = lowest composite score (already sorted, so index 0)
  flights[0].label = "best";

  // Cheapest = lowest price
  let cheapest = flights[0];
  for (const f of flights) {
    if (f.price < cheapest.price) cheapest = f;
  }
  if (!cheapest.label) cheapest.label = "cheapest";

  // Fastest = shortest duration (skip 0 = unknown)
  let fastest: FlightResult | null = null;
  for (const f of flights) {
    if (f.durationMinutes > 0) {
      if (!fastest || f.durationMinutes < fastest.durationMinutes) {
        fastest = f;
      }
    }
  }
  if (fastest && !fastest.label) fastest.label = "fastest";

  // Non-stop = first direct flight that doesn't already have a label
  for (const f of flights) {
    if (f.isDirect && !f.label) {
      f.label = "non-stop";
      break;
    }
  }

  return flights;
}

// ── Filtering ──

export function filterFlights(
  flights: FlightResult[],
  filters?: FlightFilters,
): FlightResult[] {
  if (!filters) return flights;

  return flights.filter((f) => {
    if (typeof filters.maxPrice === "number" && f.price > filters.maxPrice) return false;

    if (typeof filters.maxStops === "number" && f.stops > filters.maxStops) return false;

    if (filters.directOnly && !f.isDirect) return false;

    if (typeof filters.maxDurationMinutes === "number" && f.durationMinutes > filters.maxDurationMinutes) {
      return false;
    }

    if (filters.airlines && filters.airlines.length > 0) {
      const allowed = new Set(filters.airlines.map((a) => a.toUpperCase()));
      const airlineUpper = f.airline.toUpperCase();
      // Match by name or first 2 chars (IATA code)
      if (!allowed.has(airlineUpper) && !allowed.has(airlineUpper.slice(0, 2))) {
        return false;
      }
    }

    return true;
  });
}

// ── Combined Pipeline ──

export function processFlights(
  flights: FlightResult[],
  filters?: FlightFilters,
): FlightResult[] {
  const filtered = filterFlights(flights, filters);
  const ranked = rankFlights(filtered);
  return assignLabels(ranked);
}
