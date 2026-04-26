// supabase/functions/search-flights/redis.ts
// ─────────────────────────────────────────────────────────
// Upstash Redis — HTTP REST client for Edge Functions
// L2 shared cache (search + pricing + rate limit + lazy store)
// Falls back to in-memory if Redis unavailable
// ─────────────────────────────────────────────────────────
/// <reference path="../deno.d.ts" />

const REDIS_URL = Deno.env.get("UPSTASH_REDIS_REST_URL") || "";
const REDIS_TOKEN = Deno.env.get("UPSTASH_REDIS_REST_TOKEN") || "";
const REDIS_ENABLED = !!REDIS_URL && !!REDIS_TOKEN;

let redisDown = false;
let redisDownUntil = 0;
const REDIS_COOLDOWN_MS = 30_000; // 30s backoff if Redis is down

// ═══════════════════════════════════════════════════════════
// Low-level REST command executor
// ═══════════════════════════════════════════════════════════

async function redisCommand<T = any>(...args: (string | number)[]): Promise<T | null> {
  if (!REDIS_ENABLED) return null;

  // Check cooldown
  if (redisDown && Date.now() < redisDownUntil) return null;

  try {
    const resp = await fetch(`${REDIS_URL}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(3000), // 3s max for Redis
    });

    if (!resp.ok) {
      console.error(`[REDIS] HTTP ${resp.status}`);
      markRedisDown();
      return null;
    }

    const data = await resp.json();

    // Recovery
    if (redisDown) {
      redisDown = false;
      console.info("[REDIS] Recovered");
    }

    return data.result as T;
  } catch (err: any) {
    console.error(`[REDIS] Error: ${err.message}`);
    markRedisDown();
    return null;
  }
}

// Pipeline: batch multiple commands in single HTTP call
async function redisPipeline<T = any>(commands: (string | number)[][]): Promise<(T | null)[]> {
  if (!REDIS_ENABLED) return commands.map(() => null);
  if (redisDown && Date.now() < redisDownUntil) return commands.map(() => null);

  try {
    const resp = await fetch(`${REDIS_URL}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REDIS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(3000),
    });

    if (!resp.ok) {
      markRedisDown();
      return commands.map(() => null);
    }

    const data = await resp.json();
    if (redisDown) { redisDown = false; }
    return (data as any[]).map(r => r?.result ?? null);
  } catch {
    markRedisDown();
    return commands.map(() => null);
  }
}

function markRedisDown() {
  if (!redisDown) {
    redisDown = true;
    redisDownUntil = Date.now() + REDIS_COOLDOWN_MS;
    console.warn(`[REDIS] Marked DOWN for ${REDIS_COOLDOWN_MS / 1000}s`);
  }
}

// ═══════════════════════════════════════════════════════════
// High-level API
// ═══════════════════════════════════════════════════════════

/** GET a JSON value from Redis */
export async function redisGet<T>(key: string): Promise<T | null> {
  const raw = await redisCommand<string>("GET", key);
  if (!raw) return null;
  try { return JSON.parse(raw) as T; }
  catch { return raw as unknown as T; }
}

/** SET a JSON value with TTL (seconds) */
export async function redisSet(key: string, value: any, ttlSeconds: number): Promise<boolean> {
  const result = await redisCommand("SET", key, JSON.stringify(value), "EX", ttlSeconds);
  return result === "OK";
}

/** SET only if not exists (for distributed locks) */
export async function redisSetNX(key: string, value: string, ttlSeconds: number): Promise<boolean> {
  const result = await redisCommand<number>("SET", key, value, "EX", ttlSeconds, "NX");
  return result !== null;
}

/** DELETE a key */
export async function redisDel(key: string): Promise<void> {
  await redisCommand("DEL", key);
}

/** INCR + EXPIRE for rate limiting (atomic via pipeline) */
export async function redisIncr(key: string, ttlSeconds: number): Promise<number> {
  const results = await redisPipeline([
    ["INCR", key],
    ["EXPIRE", key, ttlSeconds],
  ]);
  return (results[0] as number) || 0;
}

/** Check if Redis is available */
export function isRedisEnabled(): boolean {
  return REDIS_ENABLED && !redisDown;
}

/** Get Redis health status */
export function getRedisStatus(): { enabled: boolean; down: boolean; downUntil: number } {
  return { enabled: REDIS_ENABLED, down: redisDown, downUntil: redisDownUntil };
}
