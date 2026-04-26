// src/lib/flight/utils/cache.ts
// ─────────────────────────────────────────────────────────
// Cache — Separate TTLs for search vs pricing
// ─────────────────────────────────────────────────────────

import type { FlightSearchParams } from "../types";

export const SEARCH_TTL_MS = 300_000;   // 5 minutes
export const PRICE_TTL_MS = 120_000;    // 2 minutes
const STALE_GRACE_MS = 60_000;          // 1 min stale grace
const MAX_ENTRIES = 500;

interface CacheEntry<T> {
  data: T;
  staleAt: number;
  expiresAt: number;
  revalidating: boolean;
}

const store = new Map<string, CacheEntry<any>>();

export function buildCacheKey(params: FlightSearchParams, suffix?: string): string {
  const base = [
    params.origin.toUpperCase(),
    params.destination.toUpperCase(),
    params.departureDate,
    params.adults ?? 1,
  ].join("|");
  return suffix ? `${base}::${suffix}` : base;
}

export function getFromCache<T>(key: string): { data: T; stale: boolean } | null {
  const entry = store.get(key);
  if (!entry) return null;
  const now = Date.now();
  if (now > entry.expiresAt) { store.delete(key); return null; }
  return { data: entry.data, stale: now > entry.staleAt };
}

export function setInCache<T>(key: string, data: T, ttlMs: number = SEARCH_TTL_MS): void {
  evictExpired();
  const now = Date.now();
  store.set(key, {
    data,
    staleAt: now + ttlMs,
    expiresAt: now + ttlMs + STALE_GRACE_MS,
    revalidating: false,
  });
}

export function markRevalidating(key: string): boolean {
  const e = store.get(key);
  if (!e || e.revalidating) return false;
  e.revalidating = true;
  return true;
}

export function clearRevalidating(key: string): void {
  const e = store.get(key);
  if (e) e.revalidating = false;
}

function evictExpired(): void {
  if (store.size <= MAX_ENTRIES) return;
  const now = Date.now();
  for (const [k, v] of store) if (now > v.expiresAt) store.delete(k);
  if (store.size > MAX_ENTRIES) {
    const keys = Array.from(store.keys()).slice(0, store.size - MAX_ENTRIES);
    keys.forEach((k) => store.delete(k));
  }
}

export function clearCache(): void { store.clear(); }

export function getCacheStats(): { size: number; hitRate: string } {
  return { size: store.size, hitRate: `${store.size}entries` };
}
