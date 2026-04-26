// src/lib/flight/types.ts
// ─────────────────────────────────────────────────────────
// OTA Core Engine — Shared Types
// ─────────────────────────────────────────────────────────

export type ProviderSource = "amadeus" | "aviation";

export type FlightLabel = "cheapest" | "fastest" | "best" | "non-stop";

export type TrustLevel = "verified" | "estimated" | "rejected";

export type PriceStatus = "estimated" | "confirmed" | "price_changed";

export type EngineState = "IDLE" | "SEARCHING" | "VERIFYING" | "READY" | "ERROR";

export interface FlightResult {
  id: string;
  airline: string;
  airlineCode: string;
  airlineLogo: string;

  price: number;
  estimatedPrice: number;       // original search price
  confirmedPrice?: number;      // from pricing API
  taxes?: number;
  currency: string;
  priceStatus: PriceStatus;

  departure: string;
  arrival: string;
  durationMinutes: number;
  stops: number;
  isDirect: boolean;

  source: ProviderSource;
  score?: number;
  label?: FlightLabel;
  segments?: FlightSegment[];
  cabinClass?: string;
  trust: TrustLevel;
  reliabilityScore: number;     // 0–10

  _rawOffer?: any;
  _validatingCarriers?: string[];
}

export interface FlightSegment {
  carrier: string;
  flightNumber: string;
  aircraft: string;
  origin: string;
  destination: string;
  departingAt: string;
  arrivingAt: string;
  durationMinutes: number;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  adults?: number;
  returnDate?: string;
  cabinClass?: string;
}

export interface FlightFilters {
  maxPrice?: number;
  airlines?: string[];
  maxStops?: number;
  directOnly?: boolean;
  maxDurationMinutes?: number;
}

export interface FlightSearchResult {
  flights: FlightResult[];
  total: number;
  state: EngineState;
  fromCache: boolean;
  providers: ProviderStatus[];
  metrics: SearchMetrics;
  timestamp: string;
}

export interface ProviderStatus {
  name: string;
  status: "ok" | "error" | "timeout" | "degraded";
  count: number;
  latencyMs: number;
}

export interface SearchMetrics {
  totalLatencyMs: number;
  cacheHitRate: string;
  providersQueried: number;
  providersSucceeded: number;
  trustRejected: number;
  deduplicated: number;
  priceConfirmed: number;
  priceChanged: number;
  priceChangeAvgPct: number;
}

export interface FlightProvider {
  name: ProviderSource;
  search(params: FlightSearchParams): Promise<FlightResult[]>;
  confirmPrice?(rawOffer: any): Promise<{ price: number; taxes: number } | null>;
}

export interface ProviderConfig {
  provider: FlightProvider;
  weight: number;
  timeoutMs: number;
  enabled: boolean;
  priority: number;           // lower = first to resolve (for early return)
}

export interface ProviderHealthRecord {
  name: string;
  successCount: number;
  errorCount: number;
  totalLatencyMs: number;
  lastError?: string;
  lastSuccess?: number;
  consecutiveFailures: number;
  circuitOpen: boolean;
  priceAccuracySum: number;   // sum of abs(confirmed-search)/search
  priceChecks: number;
}

// ── Callbacks for real-time UI updates ──

export interface SearchCallbacks {
  onEstimated?: (result: FlightSearchResult) => void;
  onVerified?: (result: FlightSearchResult) => void;
  onStateChange?: (state: EngineState) => void;
  onError?: (error: Error) => void;
}
