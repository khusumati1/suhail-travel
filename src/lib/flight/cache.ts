// src/lib/flight/cache.ts
/**
 * In‑memory cache with TTL for flight search results.
 * Compatible with Deno environment – reads TTL from Deno.env.
 */
interface CacheEntry<T> {
  /** Serialized payload sent to the client */
  value: T;
  /** Expiration timestamp (ms since epoch) */
  expiresAt: number;
}

const DEFAULT_TTL_MS = 60_000; // 1 minute – safe default for flight data
const cache = new Map<string, CacheEntry<any>>();
// Track in‑flight identical requests to avoid duplicate Amadeus calls
const inflight = new Map<string, Promise<any>>();

/** Build deterministic cache key from the request payload */
export function makeCacheKey(payload: {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  passengers?: { adults?: number; children?: number; infants?: number };
  cabin_class?: string;
}): string {
  const {
    origin,
    destination,
    departure_date,
    return_date = "",
    passengers = {},
    cabin_class = "",
  } = payload;
  const p = [
    origin,
    destination,
    departure_date,
    return_date,
    passengers.adults ?? 1,
    passengers.children ?? 0,
    passengers.infants ?? 0,
    cabin_class.toUpperCase(),
  ];
  return p.join("|");
}

/** Retrieve a cached response if it exists and is still fresh */
export function getFromCache<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

/** Store a response in the cache. TTL can be overridden, otherwise read from Deno env */
export function setInCache<T>(key: string, value: T, ttlMs?: number): void {
  const ttl = ttlMs ?? (Number((globalThis as any).Deno?.env?.get("FLIGHT_CACHE_TTL")) || DEFAULT_TTL_MS);
  cache.set(key, { value, expiresAt: Date.now() + ttl });
}

/** In‑flight request helpers – they let concurrent identical calls share the same promise */
export function getInFlight<T>(key: string): Promise<T> | undefined {
  return inflight.get(key) as Promise<T> | undefined;
}
export function setInFlight<T>(key: string, promise: Promise<T>): void {
  inflight.set(key, promise as Promise<any>);
}
export function clearInFlight(key: string): void {
  inflight.delete(key);
}
