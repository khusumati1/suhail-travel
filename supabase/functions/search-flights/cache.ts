// supabase/functions/search-flights/cache.ts
// ─────────────────────────────────────────────────────────
// Dual-Layer Cache: L1 (in-memory Map) + L2 (Upstash Redis)
// L1: per-instance, ultra-fast, 30s TTL
// L2: shared global, 5min search / 2min pricing TTL
// + Stale-while-revalidate + Request coalescing
// ─────────────────────────────────────────────────────────
/// <reference path="../deno.d.ts" />
import { SearchParams } from "./types.ts";
import { redisGet, redisSet, isRedisEnabled } from "./redis.ts";

export const SEARCH_TTL_MS  = 300_000;   // 5 minutes (L2)
export const PRICING_TTL_MS = 120_000;   // 2 minutes (L2)
const L1_TTL_MS             = 30_000;    // 30 seconds (L1)
const STALE_GRACE_MS        = 60_000;    // 1 min stale grace
const MAX_L1_SIZE           = 200;
const MEMORY_THRESHOLD_RSS  = 120 * 1024 * 1024; // 120MB

interface L1Entry<T> {
  value: T;
  staleAt: number;
  expiresAt: number;
}

// ── L1: In-memory (per-instance) ──
const l1Cache = new Map<string, L1Entry<any>>();
const inflight = new Map<string, Promise<any>>();
const revalidating = new Set<string>();

// ── Emergency Cleanup ──
function emergencyCleanup(): boolean {
  try {
    const mem = Deno.memoryUsage();
    if (mem.rss > MEMORY_THRESHOLD_RSS) {
      console.warn(`[SRE] Emergency Cleanup: RSS ${Math.round(mem.rss / 1024 / 1024)}MB`);
      l1Cache.clear();
      return true;
    }
  } catch { /* memoryUsage not available */ }
  return false;
}

function cleanupL1(): void {
  if (emergencyCleanup()) return;
  const now = Date.now();
  for (const [key, entry] of l1Cache.entries()) {
    if (now > entry.expiresAt) l1Cache.delete(key);
  }
  if (l1Cache.size > MAX_L1_SIZE) {
    const excess = Array.from(l1Cache.keys()).slice(0, l1Cache.size - MAX_L1_SIZE);
    excess.forEach(k => l1Cache.delete(k));
  }
}

// ── Cache Key ──

export function makeCacheKey(payload: SearchParams, suffix?: string): string {
  const { origin, destination, departure_date, return_date = "", passengers = {}, cabin_class = "" } = payload;
  const base = [origin, destination, departure_date, return_date, passengers.adults ?? 1, cabin_class].join("|").toUpperCase();
  return suffix ? `${base}::${suffix}` : base;
}

// ═══════════════════════════════════════════════════════════
// GET: L1 → L2 (Redis) → null
// ═══════════════════════════════════════════════════════════

export function getFromCache<T>(key: string): { data: T; stale: boolean } | null {
  // ── L1 check (sync, instant) ──
  const l1 = l1Cache.get(key);
  if (l1) {
    const now = Date.now();
    if (now > l1.expiresAt) {
      l1Cache.delete(key);
    } else {
      return { data: l1.value as T, stale: now > l1.staleAt };
    }
  }
  return null; // L2 is async, handled separately
}

/** Async version: checks L1 then L2 (Redis) */
export async function getFromCacheAsync<T>(key: string): Promise<{ data: T; stale: boolean } | null> {
  // ── L1 first ──
  const l1Result = getFromCache<T>(key);
  if (l1Result) return l1Result;

  // ── L2 (Redis) ──
  if (!isRedisEnabled()) return null;

  try {
    const redisData = await redisGet<T>(`search:${key}`);
    if (redisData) {
      // Promote to L1
      setL1(key, redisData, L1_TTL_MS);
      return { data: redisData, stale: false };
    }
  } catch (err: any) {
    console.error("[CACHE_L2] Redis get error:", err.message);
  }

  return null;
}

// ═══════════════════════════════════════════════════════════
// SET: L1 + L2 (Redis)
// ═══════════════════════════════════════════════════════════

export function setInCache<T>(key: string, value: T, ttlMs: number = SEARCH_TTL_MS): void {
  // ── L1 ──
  setL1(key, value, Math.min(ttlMs, L1_TTL_MS));

  // ── L2 (Redis, fire-and-forget) ──
  if (isRedisEnabled()) {
    const ttlSec = Math.ceil(ttlMs / 1000);
    redisSet(`search:${key}`, value, ttlSec).catch(err =>
      console.error("[CACHE_L2] Redis set error:", err.message)
    );
  }
}

function setL1<T>(key: string, value: T, ttlMs: number): void {
  cleanupL1();
  const now = Date.now();
  l1Cache.set(key, {
    value,
    staleAt: now + ttlMs,
    expiresAt: now + ttlMs + STALE_GRACE_MS,
  });
}

// ═══════════════════════════════════════════════════════════
// Pricing Cache (L2 only — shared across instances)
// ═══════════════════════════════════════════════════════════

export async function getPricingFromRedis(offerId: string): Promise<any | null> {
  if (!isRedisEnabled()) return null;
  return redisGet(`pricing:${offerId}`);
}

export function setPricingInRedis(offerId: string, value: any): void {
  if (!isRedisEnabled()) return;
  const ttlSec = Math.ceil(PRICING_TTL_MS / 1000);
  redisSet(`pricing:${offerId}`, value, ttlSec).catch(() => {});
}

// ═══════════════════════════════════════════════════════════
// Lazy Offer Store (L2 — shared across instances)
// ═══════════════════════════════════════════════════════════

export async function getLazyOfferFromRedis(offerId: string): Promise<any | null> {
  if (!isRedisEnabled()) return null;
  return redisGet(`lazy:${offerId}`);
}

export function setLazyOfferInRedis(offerId: string, rawOffer: any): void {
  if (!isRedisEnabled()) return;
  redisSet(`lazy:${offerId}`, rawOffer, 600).catch(() => {}); // 10 min
}

// ═══════════════════════════════════════════════════════════
// Revalidation + In-Flight Dedup (stays L1 — per-instance)
// ═══════════════════════════════════════════════════════════

export function markRevalidating(key: string): boolean {
  if (revalidating.has(key)) return false;
  revalidating.add(key);
  return true;
}

export function clearRevalidating(key: string): void {
  revalidating.delete(key);
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

// ═══════════════════════════════════════════════════════════
// Legacy compat
// ═══════════════════════════════════════════════════════════
export function getFromCacheSimple<T>(key: string): T | undefined {
  const result = getFromCache<T>(key);
  if (!result || result.stale) return undefined;
  return result.data;
}
