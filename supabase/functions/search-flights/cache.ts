// supabase/functions/search-flights/cache.ts
/// <reference path="../deno.d.ts" />
import { SearchParams } from "./types.ts";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 300_000;
const MAX_CACHE_SIZE = 1000;
const MEMORY_THRESHOLD_RSS = 120 * 1024 * 1024; // 120MB Emergency Trigger

const cache = new Map<string, CacheEntry<any>>();
const inflight = new Map<string, Promise<any>>();

/**
 * Self-Healing: Emergency Memory Cleanup
 * Triggers if RSS memory usage exceeds the threshold.
 */
export function emergencyCleanup() {
  const mem = Deno.memoryUsage();
  if (mem.rss > MEMORY_THRESHOLD_RSS) {
    console.warn(`[SRE] Emergency Cleanup: RSS ${Math.round(mem.rss/1024/1024)}MB exceeds threshold`);
    cache.clear(); // Nuclear option for memory safety
    return true;
  }
  return false;
}

export function performCleanup() {
  if (emergencyCleanup()) return;

  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (now > entry.expiresAt) cache.delete(key);
  }

  if (cache.size > MAX_CACHE_SIZE) {
    const keys = Array.from(cache.keys()).slice(0, cache.size - MAX_CACHE_SIZE);
    keys.forEach(k => cache.delete(k));
  }
}

export function makeCacheKey(payload: SearchParams): string {
  const { origin, destination, departure_date, return_date = "", passengers = {}, cabin_class = "" } = payload;
  return [origin, destination, departure_date, return_date, passengers.adults ?? 1, cabin_class].join("|").toUpperCase();
}

export function getFromCache<T>(key: string): T | undefined {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) {
    if (entry) cache.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setInCache<T>(key: string, value: T, ttlMs?: number): void {
  performCleanup();
  const ttl = ttlMs ?? DEFAULT_TTL_MS;
  cache.set(key, { value, expiresAt: Date.now() + ttl });
}

export function getInFlight<T>(key: string): Promise<T> | undefined {
  return inflight.get(key) as Promise<T> | undefined;
}

export function setInFlight<T>(key: string, promise: Promise<T>): void {
  inflight.set(key, promise);
}

export function clearInFlight(key: string): void {
  inflight.delete(key);
}
