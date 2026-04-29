// supabase/functions/search-flights/ranking.ts
// Flight ranking, labeling, and filtering

import { NormalizedOffer, SearchFilters } from "./types.ts";

// ---- Scoring Weights ----

const W_PRICE = 0.6;
const W_DURATION = 0.3;
const W_STOPS = 100;

/** Compute a composite score for ranking. Lower = better. */
function computeScore(offer: NormalizedOffer): number {
  const base = (offer.price * W_PRICE) + (offer.duration * W_DURATION) + (offer.stops * W_STOPS);

  // Recovery-based ranking: lower confidence = higher score = ranks lower
  // Exact matches (confidence 1.0) have 0 penalty
  const confidence = offer._recoveryConfidence ?? 1.0;
  const confidencePenalty = (1 - confidence) * 2000; // Strong penalty to pin exact results

  // Reliability-based ranking: higher reliability = lower score = ranks higher
  const reliability = offer.reliability ?? 0.70;
  const reliabilityPenalty = (1 - reliability) * 300;

  // HARD RULE: non-bookable flights always rank below bookable
  const bookablePenalty = offer.bookable ? 0 : 500;

  return base + reliabilityPenalty + bookablePenalty + confidencePenalty;
}

// ---- Ranking ----

/**
 * Rank flights by composite score (price × 0.6 + duration × 0.3 + stops × 100).
 * Returns a new sorted array — does not mutate input.
 */
export function rankFlights(offers: NormalizedOffer[]): NormalizedOffer[] {
  return [...offers].sort((a, b) => computeScore(a) - computeScore(b));
}

// ---- Labels ----

/**
 * Assign "cheapest", "fastest", and "best" labels to top flights.
 * Mutates the label field in-place and returns the same array.
 */
export function assignLabels(offers: NormalizedOffer[]): NormalizedOffer[] {
  if (offers.length === 0) return offers;

  // Clear any existing labels
  for (const o of offers) {
    o.label = undefined;
  }

  // Cheapest — lowest price
  const cheapest = offers.reduce((min, o) => (o.price < min.price ? o : min), offers[0]);

  // Fastest — lowest duration (skip zeros, they mean unknown)
  const withDuration = offers.filter(o => o.duration > 0);
  const fastest = withDuration.length > 0
    ? withDuration.reduce((min, o) => (o.duration < min.duration ? o : min), withDuration[0])
    : null;

  // Best — lowest composite score
  const best = offers.reduce((min, o) => (computeScore(o) < computeScore(min) ? o : min), offers[0]);

  // Assign labels (avoid duplicate labels — priority: best > cheapest > fastest)
  best.label = "best";

  if (cheapest.id !== best.id) {
    cheapest.label = "cheapest";
  }

  if (fastest && fastest.id !== best.id && fastest.id !== cheapest.id) {
    fastest.label = "fastest";
  }

  return offers;
}

// ---- Filtering ----

/**
 * Apply user-provided filters to a list of offers.
 * Returns a new filtered array — does not mutate input.
 */
export function filterFlights(
  offers: NormalizedOffer[],
  filters?: SearchFilters,
): NormalizedOffer[] {
  if (!filters) return offers;

  return offers.filter(offer => {
    // Price range
    if (typeof filters.min_price === "number" && offer.price < filters.min_price) return false;
    if (typeof filters.max_price === "number" && offer.price > filters.max_price) return false;

    // Max stops
    if (typeof filters.max_stops === "number" && offer.stops > filters.max_stops) return false;

    // Airlines whitelist (match carrier code case-insensitive)
    if (filters.airlines && filters.airlines.length > 0) {
      const allowed = new Set(filters.airlines.map(a => a.toUpperCase()));
      const carrierCode = (offer._carrierCode || "").toUpperCase();
      const airlineName = offer.airline.toUpperCase();

      // Match if carrier code OR airline name is in the allowed set
      if (!allowed.has(carrierCode) && !allowed.has(airlineName)) {
        return false;
      }
    }

    return true;
  });
}

// ---- Combined Pipeline Helper ----

/**
 * Full post-processing pipeline: filter → rank → label.
 * Call this once after deduplication in the search handler.
 */
export function processFlights(
  offers: NormalizedOffer[],
  filters?: SearchFilters,
): NormalizedOffer[] {
  const filtered = filterFlights(offers, filters);
  const ranked = rankFlights(filtered);
  return assignLabels(ranked);
}
