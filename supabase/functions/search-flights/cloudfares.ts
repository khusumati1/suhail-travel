/// <reference path="../deno.d.ts" />
// supabase/functions/search-flights/cloudfares.ts
// CloudFares (Hareer B2B API) — Async Flight Search Provider
// Flow: authenticate → start async search → poll results → normalize

import { SearchParams, NormalizedOffer, FlightSegment } from "./types.ts";

// ---- Configuration ----

const HAREER_BASE_URL = Deno.env.get("HAREER_BASE_URL") || "https://api.hareerbooking.com";
const MAX_POLL_ATTEMPTS = 8;
const POLL_INTERVAL_MS = 1_000;
const POLL_TIMEOUT_MS = 5_000;
const REQUEST_TIMEOUT_MS = 10_000;
const MAX_RETRIES = 2;
const EARLY_STOP_THRESHOLD = 5;

// ---- In-Memory Auth Token Cache ----

let cachedToken: string | null = null;
let tokenExpiresAt = 0;

/** Force-clear cached token (used on 401 to trigger re-auth) */
function invalidateHareerToken() {
  cachedToken = null;
  tokenExpiresAt = 0;
  log("info", "token_invalidated");
}

// ---- Logging Helper ----

function log(level: "info" | "warn" | "error", event: string, meta: Record<string, unknown> = {}) {
  console.log(JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    provider: "cloudfares",
    event,
    ...meta,
  }));
}

// ---- Retry Wrapper ----

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  retries = MAX_RETRIES,
): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      const resp = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return resp;
    } catch (err: any) {
      lastError = err;
      log("warn", "fetch_retry", { url, attempt, error: err.message });

      if (attempt < retries) {
        // Brief backoff before retry
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }
    }
  }

  throw lastError || new Error(`Request failed after ${retries + 1} attempts`);
}

// ---- STEP 1: Authentication ----

async function getHareerToken(): Promise<string> {
  // Return cached token if still valid (with 30s buffer)
  if (cachedToken && Date.now() < tokenExpiresAt - 30_000) {
    return cachedToken;
  }

  const username = Deno.env.get("HAREER_USERNAME");
  const password = Deno.env.get("HAREER_PASSWORD");

  if (!username || !password) {
    throw new Error("HAREER_USERNAME and HAREER_PASSWORD environment variables are required");
  }

  log("info", "auth_start");

  const resp = await fetchWithRetry(`${HAREER_BASE_URL}/api/b2b/v1/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "No body");
    log("error", "auth_failed", { status: resp.status, body: errBody });
    throw new Error(`Hareer auth failed: ${resp.status}`);
  }

  const data = await resp.json();
  const token = data?.token || data?.access_token || data?.data?.token;

  if (!token) {
    throw new Error("Hareer auth response missing token");
  }

  // Cache token — assume 1 hour expiry if not provided
  const expiresIn = data?.expires_in || data?.data?.expires_in || 3600;
  cachedToken = token;
  tokenExpiresAt = Date.now() + expiresIn * 1000;

  log("info", "auth_success", { expiresIn });
  return token;
}

// ---- STEP 2: Start Async Search ----

async function startAsyncSearch(
  token: string,
  params: SearchParams,
): Promise<string> {
  const passengers: any[] = [];

  const adultCount = params.passengers?.adults || 1;
  const childCount = params.passengers?.children || 0;
  const infantCount = params.passengers?.infants || 0;

  for (let i = 0; i < adultCount; i++) {
    passengers.push({ type: "ADT" });
  }
  for (let i = 0; i < childCount; i++) {
    passengers.push({ type: "CHD" });
  }
  for (let i = 0; i < infantCount; i++) {
    passengers.push({ type: "INF" });
  }

  const segments = [
    {
      origin: params.origin.toUpperCase(),
      destination: params.destination.toUpperCase(),
      departure_date: params.departure_date,
    },
  ];

  // Add return segment for round-trip
  if (params.return_date) {
    segments.push({
      origin: params.destination.toUpperCase(),
      destination: params.origin.toUpperCase(),
      departure_date: params.return_date,
    });
  }

  const cabinMap: Record<string, string> = {
    economy: "Y",
    premium_economy: "S",
    business: "C",
    first: "F",
  };

  const searchBody = {
    segments,
    passengers,
    cabin_class: cabinMap[(params.cabin_class || "economy").toLowerCase()] || "Y",
  };

  log("info", "async_search_start", {
    route: `${params.origin}-${params.destination}`,
    departure: params.departure_date,
  });

  const makeRequest = async (authToken: string) => {
    return fetchWithRetry(
      `${HAREER_BASE_URL}/api/b2b/v1/flight/async-low-fare-search`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify(searchBody),
      },
    );
  };

  let resp = await makeRequest(token);

  // Handle 401 — refresh token once and retry
  if (resp.status === 401) {
    log("warn", "async_search_401_retry");
    invalidateHareerToken();
    const freshToken = await getHareerToken();
    resp = await makeRequest(freshToken);
  }

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "No body");
    log("error", "async_search_failed", { status: resp.status, body: errBody });
    throw new Error(`Hareer async search failed: ${resp.status}`);
  }

  const data = await resp.json();
  const searchId = data?.search_id || data?.data?.search_id;

  if (!searchId) {
    log("error", "async_search_no_id", { responseKeys: Object.keys(data) });
    throw new Error("Hareer async search did not return a search_id");
  }

  log("info", "async_search_started", { searchId });
  return searchId;
}

// ---- STEP 3: Poll for Results ----

async function pollAsyncResults(
  token: string, // NOTE: mutable — refreshed on 401
  searchId: string,
  origin: string,
  destination: string,
): Promise<any[]> {
  const allFlights: any[] = [];
  const pollDeadline = Date.now() + POLL_TIMEOUT_MS;

  for (let attempt = 1; attempt <= MAX_POLL_ATTEMPTS; attempt++) {
    // Enforce overall timeout
    if (Date.now() >= pollDeadline) {
      log("warn", "poll_timeout", { attempt, collected: allFlights.length });
      break;
    }

    try {
      const pollBody = {
        search_id: searchId,
        page: 1,
        limit: 20,
        filters: {
          airlines: "",
          arrival_airport: destination.toUpperCase(),
          departure_airport: origin.toUpperCase(),
          stops: "",
          price_range: "",
        },
        sort: {
          price: "asc" as const,
        },
      };

      const resp = await fetchWithRetry(
        `${HAREER_BASE_URL}/api/b2b/v1/flight/get-async-flights`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(pollBody),
        },
        1, // Fewer retries per poll to stay within timeout
      );

      // Handle 401 — refresh token and retry this poll attempt
      if (resp.status === 401) {
        log("warn", "poll_401_refresh", { attempt });
        invalidateHareerToken();
        token = await getHareerToken();
        continue;
      }

      if (!resp.ok) {
        log("warn", "poll_error", { attempt, status: resp.status });
        await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
        continue;
      }

      const data = await resp.json();

      // Extract flights — handle multiple possible response structures
      const flights =
        data?.flights ||
        data?.data?.flights ||
        data?.data ||
        data?.results ||
        [];

      if (Array.isArray(flights) && flights.length > 0) {
        // Strict validation: only accept flights with price > 0 and at least one segment
        const validFlights = flights.filter((f: any) => {
          const price = Number(f.price?.total ?? f.price?.amount ?? f.total_price ?? f.price ?? 0);
          const hasSegments = Array.isArray(f.segments || f.itineraries?.[0]?.segments || f.legs || f.routes) &&
            (f.segments || f.itineraries?.[0]?.segments || f.legs || f.routes).length > 0;
          return price > 0 && hasSegments;
        });

        allFlights.push(...validFlights);
        log("info", "poll_progress", {
          attempt,
          rawBatch: flights.length,
          validBatch: validFlights.length,
          totalCollected: allFlights.length,
        });
      }

      // Early stop if we have enough flights
      if (allFlights.length >= EARLY_STOP_THRESHOLD) {
        log("info", "poll_early_stop", { attempt, total: allFlights.length });
        break;
      }

      // Check if search is complete
      const isComplete =
        data?.is_complete === true ||
        data?.data?.is_complete === true ||
        data?.status === "completed" ||
        data?.data?.status === "completed";

      if (isComplete) {
        log("info", "poll_complete", { attempt, total: allFlights.length });
        break;
      }
    } catch (err: any) {
      log("warn", "poll_attempt_error", { attempt, error: err.message });
    }

    // Wait before next poll (don't wait after last attempt)
    if (attempt < MAX_POLL_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }

  log("info", "poll_finished", { totalFlights: allFlights.length });
  return allFlights;
}

// ---- STEP 4: Normalize a Single Hareer Flight Offer ----

const VALID_CURRENCIES = new Set(["USD", "EUR", "GBP", "SAR", "AED", "KWD", "BHD", "QAR", "OMR", "EGP", "JOD", "TRY", "INR"]);

export function normalizeHareerOffer(flight: any): NormalizedOffer | null {
  try {
    // Guard: reject nullish input
    if (!flight || typeof flight !== "object") return null;

    // Extract price — skip if invalid
    const rawPrice = flight.price?.total ?? flight.price?.amount ?? flight.total_price ?? flight.price;
    const price = Number(rawPrice);
    if (!price || price <= 0 || !isFinite(price) || price > 999_999) return null;

    // Validate currency
    const rawCurrency = String(
      flight.price?.currency || flight.currency || "USD"
    ).toUpperCase().trim();
    const currency = VALID_CURRENCIES.has(rawCurrency) ? rawCurrency : "USD";

    // Extract flight segments
    const rawSegments =
      flight.segments ||
      flight.itineraries?.[0]?.segments ||
      flight.legs ||
      flight.routes ||
      [];

    // Strict: segments must be a non-empty array
    if (!Array.isArray(rawSegments) || rawSegments.length === 0) {
      log("warn", "normalize_skip_no_segments", { flightId: flight?.id });
      return null;
    }

    const firstSeg = rawSegments[0];
    const lastSeg = rawSegments[rawSegments.length - 1];

    // Extract airline info — skip if completely unknown
    const airlineCode =
      firstSeg?.carrier_code ||
      firstSeg?.airline ||
      firstSeg?.marketing_carrier ||
      flight.validating_carrier ||
      flight.airline ||
      "";

    const airlineName =
      firstSeg?.carrier_name ||
      firstSeg?.airline_name ||
      flight.airline_name ||
      (airlineCode || null) ||
      "Unknown";

    // Skip if airline is completely unresolvable
    if (airlineName === "Unknown" && !airlineCode) {
      log("warn", "normalize_skip_no_airline", { flightId: flight?.id });
      return null;
    }

    // Extract origin/destination
    const origin =
      firstSeg?.departure?.airport ||
      firstSeg?.departure?.iata ||
      firstSeg?.origin ||
      flight.origin ||
      "";

    const destination =
      lastSeg?.arrival?.airport ||
      lastSeg?.arrival?.iata ||
      lastSeg?.destination ||
      flight.destination ||
      "";

    // Extract times
    const departureTime =
      firstSeg?.departure?.at ||
      firstSeg?.departure?.time ||
      firstSeg?.departure_time ||
      firstSeg?.departing_at ||
      flight.departure_time ||
      "";

    const arrivalTime =
      lastSeg?.arrival?.at ||
      lastSeg?.arrival?.time ||
      lastSeg?.arrival_time ||
      lastSeg?.arriving_at ||
      flight.arrival_time ||
      "";

    // Skip if any critical field is missing
    if (!origin || !destination || !departureTime || !arrivalTime) {
      log("warn", "normalize_skip_missing_fields", {
        flightId: flight?.id,
        has: { origin: !!origin, destination: !!destination, dep: !!departureTime, arr: !!arrivalTime },
      });
      return null;
    }

    // Validate IATA codes (3 uppercase letters)
    const iataRe = /^[A-Z]{3}$/;
    if (!iataRe.test(origin.toUpperCase()) || !iataRe.test(destination.toUpperCase())) {
      log("warn", "normalize_skip_invalid_iata", { origin, destination });
      return null;
    }

    // Flight number
    const flightNumber =
      firstSeg?.flight_number ||
      (airlineCode && firstSeg?.number
        ? `${airlineCode}${firstSeg.number}`
        : "") ||
      flight.flight_number ||
      "";

    // Duration → minutes
    const rawDuration =
      flight.duration ||
      flight.total_duration ||
      flight.itineraries?.[0]?.duration ||
      0;

    let durationMin = 0;
    if (typeof rawDuration === "number") {
      // If > 600, assume seconds; otherwise assume minutes
      durationMin = rawDuration > 600 ? Math.round(rawDuration / 60) : rawDuration;
    } else if (typeof rawDuration === "string") {
      // Parse ISO duration PT2H30M
      const match = rawDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
      if (match) {
        durationMin = (parseInt(match[1] || "0", 10) * 60) + parseInt(match[2] || "0", 10);
      }
    }

    // Build normalized segments — filter out invalid ones
    const segments: FlightSegment[] = rawSegments
      .filter((seg: any) => {
        const segOrigin = seg.departure?.airport || seg.departure?.iata || seg.origin;
        const segDest = seg.arrival?.airport || seg.arrival?.iata || seg.destination;
        return segOrigin && segDest;
      })
      .map((seg: any) => ({
        carrier:
          seg.carrier_name ||
          seg.airline_name ||
          seg.carrier_code ||
          seg.airline ||
          airlineCode,
        flight_number:
          seg.flight_number ||
          `${seg.carrier_code || seg.airline || ""}${seg.number || ""}`,
        aircraft:
          seg.aircraft?.name ||
          seg.aircraft?.code ||
          seg.aircraft_type ||
          "",
        origin:
          seg.departure?.airport ||
          seg.departure?.iata ||
          seg.origin ||
          "",
        destination:
          seg.arrival?.airport ||
          seg.arrival?.iata ||
          seg.destination ||
          "",
        departing_at:
          seg.departure?.at ||
          seg.departure?.time ||
          seg.departure_time ||
          "",
        arriving_at:
          seg.arrival?.at ||
          seg.arrival?.time ||
          seg.arrival_time ||
          "",
        duration:
          seg.duration || "",
      }));

    // Must have at least one valid segment after filtering
    if (segments.length === 0) return null;

    // Stops count
    const stops = Math.max(0, segments.length - 1);

    return {
      id: flight.id || flight.offer_id || `cloudfares-${crypto.randomUUID()}`,
      airline: airlineName,
      airline_logo: airlineCode
        ? `https://images.kiwi.com/airlines/64/${airlineCode}.png`
        : "",
      from: origin.toUpperCase(),
      to: destination.toUpperCase(),
      depart: departureTime,
      arrive: arrivalTime,
      duration: durationMin,
      price,
      estimated_price: price,
      currency,
      price_status: "estimated",
      trust_level: "estimated",
      reliability: 0.70,
      bookable: false,
      stops,
      cabin_class: flight.cabin_class || flight.cabin || "economy",
      segments,
      source: "cloudfares",
      _carrierCode: airlineCode,
    };
  } catch (err: any) {
    log("error", "normalize_error", { error: err.message, flightId: flight?.id });
    return null;
  }
}

// ---- Deduplication ----

function deduplicateHareerOffers(offers: NormalizedOffer[]): NormalizedOffer[] {
  const seen = new Map<string, NormalizedOffer>();
  for (const o of offers) {
    // Key on carrier + departure + arrival to collapse identical flights
    const key = `${o._carrierCode || "X"}-${o.depart}-${o.arrive}-${o.from}-${o.to}`;
    const existing = seen.get(key);
    const currentPrice = o.price || Infinity;
    const existingPrice = existing?.price || Infinity;
    if (!existing || currentPrice < existingPrice) {
      seen.set(key, o);
    }
  }
  return Array.from(seen.values());
}

// ---- STEP 5: Main Search Function ----

export async function searchHareerFlights(
  params: SearchParams,
): Promise<NormalizedOffer[]> {
  // Validate environment
  const username = Deno.env.get("HAREER_USERNAME");
  const password = Deno.env.get("HAREER_PASSWORD");

  if (!username || !password) {
    log("warn", "credentials_missing");
    return [];
  }

  try {
    // 1. Authenticate
    const token = await getHareerToken();

    // 2. Start async search → get search_id
    const searchId = await startAsyncSearch(token, params);

    // 3. Poll for results
    const rawFlights = await pollAsyncResults(
      token,
      searchId,
      params.origin,
      params.destination,
    );

    if (rawFlights.length === 0) {
      log("info", "no_results", {
        route: `${params.origin}-${params.destination}`,
      });
      return [];
    }

    // 4. Normalize all flights
    const normalized = rawFlights
      .map(normalizeHareerOffer)
      .filter((o): o is NormalizedOffer => o !== null && o.price > 0);

    // 5. Deduplicate — keep cheapest per carrier+time
    const deduplicated = deduplicateHareerOffers(normalized);

    log("info", "search_complete", {
      route: `${params.origin}-${params.destination}`,
      raw: rawFlights.length,
      normalized: normalized.length,
      deduplicated: deduplicated.length,
    });

    return deduplicated;
  } catch (err: any) {
    log("error", "search_failed", {
      route: `${params.origin}-${params.destination}`,
      error: err.message,
    });
    return [];
  }
}
