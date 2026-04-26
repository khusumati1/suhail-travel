// supabase/functions/search-flights/amadeus.ts
/// <reference path="../deno.d.ts" />

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

let amadeusToken: string | null = null;
let tokenExpiresAt = 0;
let refreshPromise: Promise<string> | null = null;

// ---- Circuit Breaker ----
let circuitState: CircuitState = 'CLOSED';
let failureCount = 0;
let nextRetryAt = 0;

const FAILURE_THRESHOLD = 5;
const COOLDOWN_MS = 60_000;

// ---- Request Deduplication ----
const inFlightRequests = new Map<string, Promise<any>>();

// ---- Utils ----
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function backoff(attempt: number) {
  const base = Math.min(1000 * 2 ** attempt, 8000);
  const jitter = Math.random() * 300;
  return base + jitter;
}

// ---- Token Manager (Anti-Stampede) ----
async function getAuthToken(): Promise<string> {
  const now = Date.now();

  if (amadeusToken && now < tokenExpiresAt - 60_000) {
    return amadeusToken;
  }

  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const clientId = Deno.env.get('AMADEUS_CLIENT_ID');
    const clientSecret = Deno.env.get('AMADEUS_CLIENT_SECRET');
    
    if (!clientId || !clientSecret) {
      console.error('[AMADEUS] Missing AMADEUS_CLIENT_ID or AMADEUS_CLIENT_SECRET');
      throw new Error('AMADEUS_CREDENTIALS_MISSING');
    }

    const isProd = Deno.env.get('AMADEUS_ENV') === 'production';

    const url = isProd
      ? "https://api.amadeus.com/v1/security/oauth2/token"
      : "https://test.api.amadeus.com/v1/security/oauth2/token";

    const resp = await fetch(url, {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error('[AMADEUS_AUTH_FAIL]', resp.status, err);
      throw new Error(`AMADEUS_AUTH_FAIL_${resp.status}`);
    }

    const data = await resp.json();

    amadeusToken = data.access_token;
    tokenExpiresAt = Date.now() + data.expires_in * 1000;

    return amadeusToken!;
  })();

  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

// ---- Main Request ----
export async function amadeusRequest(
  endpoint: string,
  options: { retries?: number; timeoutMs?: number } = {}
): Promise<any> {
  const { retries = 3, timeoutMs = 20_000 } = options;
  const now = Date.now();

  // ---- Circuit Breaker ----
  if (circuitState === 'OPEN') {
    if (now > nextRetryAt) {
      circuitState = 'HALF_OPEN';
      console.warn('[CB] HALF_OPEN');
    } else {
      throw new Error('CIRCUIT_OPEN');
    }
  }

  // ---- Request Deduplication ----
  if (inFlightRequests.has(endpoint)) {
    return inFlightRequests.get(endpoint)!;
  }

  const requestPromise = (async () => {
    let attempt = 0;

    while (attempt <= retries) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const token = await getAuthToken();

        const isProd = Deno.env.get('AMADEUS_ENV') === 'production';
        const baseUrl = isProd
          ? "https://api.amadeus.com"
          : "https://test.api.amadeus.com";

        const res = await fetch(`${baseUrl}${endpoint}`, {
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });

        if (!res.ok) {
          const errorBody = await res.text().catch(() => 'No body');
          console.error(`[AMADEUS_ERROR] Status: ${res.status}, Body: ${errorBody}`);

          if (res.status === 401 && attempt < retries) {
            amadeusToken = null;
            attempt++;
            continue;
          }

          if (res.status >= 500) {
            throw new Error(`UPSTREAM_${res.status}: ${errorBody}`);
          }

          throw new Error(`API_${res.status}: ${errorBody}`);
        }

        const data = await res.json();

        // ---- Success Recovery ----
        if (circuitState === 'HALF_OPEN') {
          console.info('[CB] CLOSED (recovered)');
        }

        circuitState = 'CLOSED';
        failureCount = 0;

        return data;

      } catch (err: any) {
        if (err.name === 'AbortError') {
          console.error('[TIMEOUT]');
        }

        failureCount++;

        if (failureCount >= FAILURE_THRESHOLD) {
          circuitState = 'OPEN';
          nextRetryAt = Date.now() + COOLDOWN_MS;
          console.error('[CB] OPEN');
        }

        if (attempt >= retries) {
          throw err;
        }

        const delay = backoff(attempt);
        await sleep(delay);

        attempt++;
      } finally {
        clearTimeout(timeout);
      }
    }
  })();

  inFlightRequests.set(endpoint, requestPromise);

  try {
    return await requestPromise;
  } finally {
    inFlightRequests.delete(endpoint);
  }
}