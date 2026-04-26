// src/lib/flight/index.ts
// ─────────────────────────────────────────────────────────
// Public API — Simplified (all logic in Edge Functions)
// ─────────────────────────────────────────────────────────

// Re-export the frontend hook types for convenience
export type {
  FlightOffer,
  SearchParams,
  SearchMetrics,
} from "@/hooks/useFlightSearch";

export { useFlightSearch } from "@/hooks/useFlightSearch";
