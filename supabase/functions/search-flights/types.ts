// supabase/functions/search-flights/types.ts
// ─────────────────────────────────────────────────────────
// OTA Core Engine — Shared Types (Production)
// ─────────────────────────────────────────────────────────

export type PriceStatus = "estimated" | "confirmed" | "price_changed";
export type TrustLevel = "verified" | "estimated";

export interface NormalizedOffer {
  id: string;

  airline: string;
  airline_logo: string;

  from: string;
  to: string;

  depart: string;   // ISO 8601
  arrive: string;   // ISO 8601

  duration: number; // minutes

  // ── Pricing (Production) ──
  price: number;               // Display price (confirmed if available, else estimated)
  estimated_price: number;     // Original search price
  confirmed_price?: number;    // From Pricing API
  taxes?: number;              // From Pricing API
  currency: string;
  price_status: PriceStatus;

  // ── Trust ──
  trust_level: TrustLevel;

  stops: number;
  cabin_class: string;

  segments: FlightSegment[];

  source: "amadeus" | "kiwi" | "cloudfares";

  market_price?: number;
  market_source?: string;

  // ── Reliability ──
  reliability?: number;        // 0.0 – 1.0 (from Price Guard)
  bookable: boolean;           // HARD RULE: only true if price confirmed

  // ── Fare Rules (from Pricing API) ──
  fare_rules?: {
    refundable: boolean;
    changeable: boolean;
    penalties?: string;
    baggage?: string;
  };

  // ── Internal (stripped before response) ──
  _carrierCode?: string;
  _rawOffer?: any;             // Raw Amadeus offer for Pricing API
  label?: "cheapest" | "fastest" | "best";
}

export interface FlightSegment {
  carrier: string;
  flight_number: string;
  aircraft: string;
  origin: string;
  destination: string;
  departing_at: string;
  arriving_at: string;
  duration: string;
}

export interface SearchParams {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  passengers?: {
    adults?: number;
    children?: number;
    infants?: number;
  };
  cabin_class?: string;
  filters?: SearchFilters;
}

export interface SearchFilters {
  min_price?: number;
  max_price?: number;
  max_stops?: number;
  airlines?: string[];   // IATA carrier codes
}

export interface PricingResult {
  confirmedOffers: ConfirmedOffer[];
  failed: boolean;
}

export interface ConfirmedOffer {
  offerId: string;
  totalPrice: number;
  basePrice: number;
  taxes: number;
  currency: string;
  available: boolean;
}