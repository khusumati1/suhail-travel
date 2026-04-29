const express = require('express');
const cors = require('cors');
const axios = require('axios');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Initialize Puppeteer Stealth
puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 4000;

// Supabase Configuration (Global Persistent Memory)
const SUPABASE_URL = "https://guocsbtdcrrxgxarvavp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd1b2NzYnRkY3JyeGd4YXJ2YXZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MTgzNTEsImV4cCI6MjA5MTk5NDM1MX0.LccrdzeBASaC21B1g-OWzsxWXe3Hjy88UlPWmE2QUbQ";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 1. Setup & Constants
// ==========================================
app.use(cors());
app.use(express.json());

// CONFIGURATION: Update these if the session expires
const API_SESSION_TOKEN = 'It2AoD8T7rZ_Pb5bHUxet'; // Primary fallback

// ==========================================
// 1. Extreme Browser & Session Manager
// ==========================================
class BrowserManager {
  constructor() {
    this.browser = null;
    this.pages = [];
    // 🔴 FIX 1: تم تقليل العدد إلى 1 لمنع انهيار الذاكرة (OOM) أثناء الإقلاع على Render.
    // يمكنك زيادته لاحقاً إذا قمت بترقية باقة الخادم.
    this.poolSize = 1;
    this.currentToken = 'It2AoD8T7rZ_Pb5bHUxet'; // Fallback
    this.isRefreshing = false;
    this.ready = new Promise(resolve => this.resolveReady = resolve);
  }

  async init() {
    if (this.browser) return;
    try {
      console.log('[Extreme Speed] Initializing Warm Page Pool...');
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
          '--no-zygote',
          '--single-process',
          '--disable-blink-features=AutomationControlled',
          '--disable-web-security',
          '--window-size=1920,1080'
        ],
        defaultViewport: { width: 1920, height: 1080 }
      });

      for (let i = 0; i < this.poolSize; i++) {
        const p = await this.browser.newPage();
        
        // 🛡️ Pipe browser console to Node for better debugging
        p.on('console', msg => {
          const text = msg.text();
          if (text.includes('[Browser]')) console.log(text);
        });
        
        // 🛡️ Stealth: Set realistic User-Agent to override headless defaults
        await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
        
        // 🛡️ Stealth: Set extra headers to mimic a real desktop browser
        await p.setExtraHTTPHeaders({
          'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
          'Sec-CH-UA': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
          'Sec-CH-UA-Mobile': '?0',
          'Sec-CH-UA-Platform': '"Windows"',
        });

        await p.setRequestInterception(true);
        p.on('request', r => ['image', 'font', 'media', 'stylesheet'].includes(r.resourceType()) ? r.abort() : r.continue());
        // Use networkidle2 to ensure Cloudflare challenges have a chance to settle
        console.log(`[Browser] Warming up page ${i}...`);
        await p.goto('https://sindibad.iq', { waitUntil: 'networkidle2', timeout: 60000 }).catch(e => console.warn(`[Browser] Warmup page ${i} warning: ${e.message}`));
        
        // Initial wait for any immediate Cloudflare redirects
        await wait(5000);
        
        this.pages.push({ page: p, busy: false });
      }
      await this.refreshToken();
      this.resolveReady();
      console.log('[Extreme Speed] Pool ready. Speed mode: ON.');
    } catch (e) {
      console.error('[Extreme Speed] Critical Init Error:', e.message);
      this.resolveReady(); // Resolve anyway to unblock
    }
  }

  async refreshToken() {
    if (this.isRefreshing || this.pages.length === 0) return;
    this.isRefreshing = true;
    try {
      const worker = this.pages[0].page;
      // 🛡️ Ensure Cloudflare has passed before trying to extract token
      await ensurePageIsReady(worker);
      
      // Wait up to 5s for token to appear (some pages take time)
      let token = null;
      for (let i = 0; i < 10; i++) {
        token = await worker.evaluate(() => {
          try {
            // Priority: localStorage -> Cookies -> auth object
            const t = localStorage.getItem('token') ||
              JSON.parse(localStorage.getItem('auth') || '{}')?.token;
            if (t) return t;
            // Fallback: try to find it in a cookie (less likely but possible)
            const cookieToken = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1];
            return cookieToken || null;
          } catch (e) { return null; }
        });
        if (token) break;
        await wait(500);
      }

      if (token) {
        this.currentToken = token;
        api.defaults.headers['accept-token'] = token; // Update axios instance too
        console.log('[Session] Token refreshed successfully.');
      } else {
        console.warn('[Session] Token not found in storage, using fallback.');
      }
    } catch (e) { console.error('[Session] Token refresh failed:', e.message); }
    this.isRefreshing = false;
  }

  async exec(fn) {
    await this.ready;
    if (this.pages.length === 0) throw new Error('Browser pool failed to initialize');
    const worker = this.pages.find(p => !p.busy) || this.pages[0];
    if (!worker) throw new Error('No available browser pages');
    worker.busy = true;
    try { return await fn(worker.page); }
    finally { worker.busy = false; }
  }
}

const browserManager = new BrowserManager();

// ==========================================
// 2. Smart Cache System
// ==========================================
const SMART_CACHE = {
  hotels: new Map(),
  flights: new Map(),
  TTL: { hotels: 10 * 60 * 1000, flights: 5 * 60 * 1000 },
  get(type, key) {
    const entry = this[type].get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.TTL[type]) {
      this[type].delete(key);
      return null;
    }
    return entry.data;
  },
  set(type, key, data) {
    this[type].set(key, { data, timestamp: Date.now() });
  }
};

// Direct Axios instance for speed with better headers
const api = axios.create({
  baseURL: 'https://api.sindibad.iq/api/',
  timeout: 20000,
  headers: {
    'Accept': 'application/json',
    'appversion': '1.254.0',
    'currencytype': 'IQD',
    'device': 'web',
    'language': 'ar',
    'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
    'Connection': 'keep-alive',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    'Origin': 'https://sindibad.iq',
    'Referer': 'https://sindibad.iq/'
  }
});

api.interceptors.request.use(config => {
  config.headers['accept-token'] = browserManager.currentToken;
  return config;
});

const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ==========================================
// 3. Reliable Fetch Utility (The "Nuclear" Fallback)
// ==========================================
// ==========================================
// 3. Cloudflare & Navigation Resilience
// ==========================================
async function ensurePageIsReady(page) {
  try {
    // Wait for the main Sindibad content or the challenge to pass
    // We look for common elements like buttons or the search bar
    await page.waitForFunction(() => {
      const text = document.body.innerText;
      const isChallenge = text.includes('Checking your browser') || 
                         text.includes('Just a moment') ||
                         !!document.querySelector('#challenge-running');
      // If we see a button or a specific container, we are likely through
      const isLoaded = !!document.querySelector('button') || 
                       !!document.querySelector('input') || 
                       !!document.querySelector('.search-button');
      return !isChallenge && isLoaded;
    }, { timeout: 30000, polling: 1000 });
  } catch (e) {
    console.warn(`[Cloudflare] Waiter reached timeout or error: ${e.message}`);
  }
}

const executeFetchInPage = async (page, path, options = {}, retries = 2) => {
  // Use relative path if it starts with /api to let the browser handle domain/CORS
  // Otherwise use the full URL with the main domain as primary
  const fullUrl = (path.startsWith('/api') || path.startsWith('http')) 
    ? path 
    : `https://sindibad.iq/api/${path}`;
  
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // 1. Ensure Cloudflare has passed
      await ensurePageIsReady(page);

      // 2. Execute the fetch
      const result = await page.evaluate(async (url, fetchOptions) => {
        console.log(`[Browser] Fetching: ${url}`);
        let token = 'It2AoD8T7rZ_Pb5bHUxet';
        try {
          token = localStorage.getItem('token') ||
            JSON.parse(localStorage.getItem('auth') || '{}')?.token ||
            token;
        } catch (e) { /* Access Denied */ }

        const headers = {
          'Accept': 'application/json', 
          'accept-token': token,
          'appversion': '1.254.0', 
          'currencytype': 'IQD',
          'device': 'web', 
          'language': 'ar',
          'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
          'Content-Type': 'application/json',
          'User-Agent': navigator.userAgent,
          'Origin': 'https://sindibad.iq',
          'Referer': 'https://sindibad.iq/',
          ...fetchOptions.headers
        };
        try {
          const response = await fetch(url, { 
            ...fetchOptions, 
            headers,
            mode: 'cors',
            credentials: 'omit'
          });
          const text = await response.text();
          if (!response.ok) return { success: false, status: response.status, error: text || 'Empty error' };
          try {
            return { success: true, data: JSON.parse(text) };
          } catch (parseErr) {
            return { success: false, status: response.status, error: 'JSON Parse Error: ' + text.substring(0, 100) };
          }
        } catch (e) { return { success: false, status: 0, error: e.message }; }
      }, fullUrl, options);

      if (!result.success) {
        console.warn(`[Cloudflare] Fetch failed (${result.status}) for ${fullUrl}: ${result.error}`);
        
        if (result.status === 403) throw new Error('Cloudflare Blocked API (403)');
        if (result.status === 404) {
          // If relative path failed, try full URL with api subdomain
          if (fullUrl.startsWith('/api/')) {
             const fallbackUrl = `https://api.sindibad.iq${fullUrl}`;
             console.log(`[Cloudflare] 404 fallback (Relative -> Subdomain): trying ${fallbackUrl}`);
             return await executeFetchInPage(page, fallbackUrl, options, 0);
          }
          // If main domain full URL failed, try api subdomain
          if (fullUrl.includes('https://sindibad.iq/api/')) {
            const fallbackUrl = fullUrl.replace('https://sindibad.iq/api/', 'https://api.sindibad.iq/api/');
            console.log(`[Cloudflare] 404 fallback (Main -> Subdomain): trying ${fallbackUrl}`);
            return await executeFetchInPage(page, fallbackUrl, options, 0);
          }
          throw new Error(`Browser API Error: 404 - Endpoint not found at ${fullUrl}`);
        }
        throw new Error(`Browser API Error: ${result.status} - ${result.error}`);
      }
      return result.data;
    } catch (e) {
      const isContextDestroyed = e.message.includes('Execution context was destroyed') || 
                                 e.message.includes('Browser API Error: 0') ||
                                 e.message.includes('Navigation failed');

      if (isContextDestroyed && attempt < retries) {
        console.warn(`[Cloudflare] Context destroyed or navigation occurred, waiting 3s to retry... (Attempt ${attempt + 1})`);
        await wait(3000);
        continue;
      }
      
      console.error(`[Browser Fetch] Failed: ${e.message}`);
      throw e;
    }
  }
};

/**
 * Utility: Resolve City ID and Country ID dynamically from Sindibad's Autocomplete API
 */
const resolveCityId = async (cityName, page) => {
  // Try multiple endpoint versions for robustness - using relative paths to leverage browser context
  const paths = [
    `/api/v2/hotel-content/HotelSearch/search-suggest?query=${encodeURIComponent(cityName)}`,
    `/api/v2/hotel-content/HotelSearch/search-suggestions?query=${encodeURIComponent(cityName)}`,
    `/api/v1/hotel-content/HotelSearch/search-suggest?query=${encodeURIComponent(cityName)}`,
    `v2/hotel-content/HotelSearch/search-suggest?query=${encodeURIComponent(cityName)}`
  ];

  for (const path of paths) {
    try {
      const data = await executeFetchInPage(page, path);
      const suggestions = data?.result || data || [];
      const cityMatch = suggestions.find(s => s.type === 'CITY' || s.type === 'City') || suggestions[0];

      if (cityMatch) {
        console.log(`[Hotel] Resolved ${cityName} -> ID: ${cityMatch.cityId || cityMatch.id || cityMatch.cityID}, Country: ${cityMatch.countryId || cityMatch.countryID}`);
        return {
          cityId: cityMatch.cityId || cityMatch.id || cityMatch.cityID,
          countryId: cityMatch.countryId || cityMatch.countryID || 17,
          cityName: cityMatch.name || cityMatch.title || cityName
        };
      }
    } catch (e) {
      console.warn(`[Hotel] Lookup failed for path ${path}: ${e.message}`);
    }
  }
  return null;
};

// ==========================================
// CANONICAL REGISTRY & CACHE
// ==========================================
const CANONICAL_CITY_MAP = {
  "baghdad": { cityName: "Baghdad", cityId: 3483, countryId: 17 },
  "بغداد": { cityName: "Baghdad", cityId: 3483, countryId: 17 },
  "basra": { cityName: "Basra", cityId: 3484, countryId: 17 },
  "البصرة": { cityName: "Basra", cityId: 3484, countryId: 17 },
  "erbil": { cityName: "Erbil", cityId: 3482, countryId: 17 },
  "اربيل": { cityName: "Erbil", cityId: 3482, countryId: 17 },
  "أربيل": { cityName: "Erbil", cityId: 3482, countryId: 17 },
  "najaf": { cityName: "Najaf", cityId: 3489, countryId: 17 },
  "النجف": { cityName: "Najaf", cityId: 3489, countryId: 17 },
  "karbala": { cityName: "Kerbala", cityId: 3486, countryId: 17 },
  "كربلاء": { cityName: "Kerbala", cityId: 3486, countryId: 17 },
  "sulaymaniyah": { cityName: "Sulaymaniyah", cityId: 3487, countryId: 17 },
  "السليمانية": { cityName: "Sulaymaniyah", cityId: 3487, countryId: 17 },
  "duhok": { cityName: "Duhok", cityId: 3488, countryId: 17 },
  "دهوك": { cityName: "Duhok", cityId: 3488, countryId: 17 }
};

// ==========================================
// 3. Endpoint 1: POST /api/scrape-hotels
// ==========================================

/**
 * safeEvaluate: Retries page.evaluate() up to `maxRetries` times if the execution
 * context is destroyed (e.g. due to SPA navigation or Cloudflare redirect).
 * Between retries it waits for the page to stabilize again.
 */
async function safeEvaluate(page, fn, args = [], maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await page.evaluate(fn, ...args);
    } catch (err) {
      const isContextDestroyed =
        err.message.includes('Execution context was destroyed') ||
        err.message.includes('Cannot find context') ||
        err.message.includes('Navigating frame was detached') ||
        err.message.includes('frame was detached') ||
        err.message.includes('Target closed');

      if (isContextDestroyed && attempt < maxRetries) {
        console.warn(`[safeEvaluate] Context destroyed (attempt ${attempt}/${maxRetries}), waiting for page to settle...`);
        // Wait for the new page to reach a stable network state
        await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 15000 }).catch(() => {});
        await wait(2000);
        continue;
      }
      throw err; // Not a context error, or exhausted retries
    }
  }
}

/**
 * waitForUrlToStabilize: Polls page.url() to ensure no further SPA redirects are in progress.
 * Returns once the URL has been the same for `stableDuration` ms.
 */
async function waitForUrlToStabilize(page, stableDuration = 3000, maxWait = 20000) {
  const start = Date.now();
  let lastUrl = page.url();
  let lastChangeTime = Date.now();

  while (Date.now() - start < maxWait) {
    await wait(500);
    const currentUrl = page.url();
    if (currentUrl !== lastUrl) {
      console.log(`[Navigation] URL changed: ${lastUrl} -> ${currentUrl}`);
      lastUrl = currentUrl;
      lastChangeTime = Date.now();
    }
    if (Date.now() - lastChangeTime >= stableDuration) {
      console.log(`[Navigation] URL stable for ${stableDuration}ms: ${currentUrl}`);
      return;
    }
  }
  console.warn(`[Navigation] URL did not stabilize within ${maxWait}ms, proceeding anyway.`);
}

/**
 * Strategy: Full DOM Scraping
 * This function navigates to the Sindibad hotel search results page and extracts data from the DOM.
 * This bypasses restricted API endpoints and Cloudflare blocks on fetch requests.
 * 
 * Hardened against "Execution context was destroyed" errors via:
 *  1. Waiting for URL to stabilize after goto (catches SPA redirects)
 *  2. Using safeEvaluate() with auto-retry on context destruction
 *  3. Full outer retry loop that re-navigates on catastrophic failure
 */
async function scrapeHotelsFromDOM(page, params) {
  const { cityName, cityId, checkIn, checkOut, adultsCount } = params;
  
  // Format dates for the URL if they are ISO strings
  const fCheckIn = checkIn.split('T')[0];
  const fCheckOut = checkOut.split('T')[0];
  
  // Construct the search URL directly
  const slug = `${cityName}-${cityId}`;
  const url = `https://sindibad.iq/hotels/${slug}?cityNameLocale=${encodeURIComponent(cityName)}&country=Iraq&checkIn=${fCheckIn}&checkOut=${fCheckOut}&countryId=17&searchType=City&rooms=${adultsCount}&step=plp&from=search`;
  
  const MAX_OUTER_RETRIES = 3;

  for (let outerAttempt = 1; outerAttempt <= MAX_OUTER_RETRIES; outerAttempt++) {
    console.log(`[DOM Scraper] Attempt ${outerAttempt}/${MAX_OUTER_RETRIES} — Navigating to: ${url}`);

    try {
      // 1. Navigate with generous timeout; wait for network to settle
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });

      // 2. Wait for URL to stabilize (catches SPA redirects / Cloudflare JS challenges)
      await waitForUrlToStabilize(page, 3000, 15000);

      // 3. Wait for Cloudflare to clear (if any challenge page appeared)
      await ensurePageIsReady(page);

      // 4. Wait for the actual hotel card container to appear in the DOM
      //    Try multiple selectors that Sindibad uses across versions
      const cardSelectors = [
        'a[href*="/hotels/detail/"]',
        '.hotel-card',
        '[class*="HotelCard"]',
        '.flex.flex-col.gap-1'
      ];
      
      let selectorFound = false;
      for (const sel of cardSelectors) {
        try {
          await page.waitForSelector(sel, { visible: true, timeout: 20000 });
          console.log(`[DOM Scraper] Found hotel cards with selector: ${sel}`);
          selectorFound = true;
          break;
        } catch (e) {
          // Try next selector
        }
      }

      if (!selectorFound) {
        console.warn(`[DOM Scraper] No hotel card selector matched. Will attempt extraction anyway.`);
        // Give extra time for any lazy rendering
        await wait(5000);
      }

      // 5. Scroll to trigger lazy loading (wrapped in safeEvaluate)
      await safeEvaluate(page, async () => {
        for (let i = 0; i < 5; i++) {
          window.scrollBy(0, 800);
          await new Promise(r => setTimeout(r, 600));
        }
        window.scrollTo(0, 0); // Back to top
      });

      // Small pause after scroll for images/data to settle
      await wait(2000);

      // 6. Extract hotel data from the DOM (wrapped in safeEvaluate with retries)
      const hotels = await safeEvaluate(page, () => {
        const results = [];
        // Sindibad's hotel cards are typically 'a' tags with specific classes in the list view
        const cards = Array.from(document.querySelectorAll('a[href*="/hotels/detail/"]')) || 
                      Array.from(document.querySelectorAll('.flex.flex-col.gap-1'));

        cards.forEach((card, index) => {
          try {
            const name = card.querySelector('h3')?.innerText || 
                         card.querySelector('.text-base.font-bold')?.innerText || 
                         card.innerText.split('\n')[0];
            
            // Price extraction - look for currency (IQD or د.ع) and surrounding numbers
            const text = card.innerText;
            const priceMatch = text.match(/([\d,]+)\s*(د\.ع|IQD)/) || text.match(/(د\.ع|IQD)\s*([\d,]+)/);
            const priceValue = priceMatch ? priceMatch[1] || priceMatch[2] : null;
            const price = priceValue ? parseInt(priceValue.replace(/,/g, ''), 10) : 0;

            // Image extraction - search inside the card or its siblings
            let img = card.querySelector('img')?.src || 
                      card.parentElement?.querySelector('img')?.src || "";
            
            // Filter out small icons or placeholder svgs
            if (img.includes('data:image') || img.includes('icon')) img = "";

            if (name && price > 0) {
              results.push({
                hotelId: card.href?.split('/').pop() || `dom-${index}-${Date.now()}`,
                name: name.trim(),
                price: price,
                image: img || "https://picsum.photos/400/300",
                stars: card.querySelectorAll('svg[class*="text-yellow"]').length || 4,
                rating: parseFloat(text.match(/(\d\.\d)\/10/)?.[1] || "8.5")
              });
            }
          } catch (e) { /* Skip individual card failure */ }
        });
        
        // Deduplicate results by name
        const unique = [];
        const seen = new Set();
        results.forEach(h => {
          if (!seen.has(h.name)) {
            seen.add(h.name);
            unique.push(h);
          }
        });
        
        return unique;
      });

      console.log(`[DOM Scraper] Successfully extracted ${hotels.length} hotels.`);
      return hotels;

    } catch (error) {
      const isContextError =
        error.message.includes('Execution context was destroyed') ||
        error.message.includes('Cannot find context') ||
        error.message.includes('Navigating frame was detached') ||
        error.message.includes('Target closed') ||
        error.message.includes('Navigation failed');

      if (isContextError && outerAttempt < MAX_OUTER_RETRIES) {
        console.warn(`[DOM Scraper] Context destroyed on attempt ${outerAttempt}, will re-navigate in 4s...`);
        await wait(4000);
        continue; // Re-navigate from scratch
      }
      console.error(`[DOM Scraper] Failed after ${outerAttempt} attempts: ${error.message}`);
      throw error;
    }
  }
}

app.post('/api/scrape-hotels', async (req, res) => {
  try {
    let { cityName, cityId, countryId, checkIn, checkOut, adultsCount = 2, childrenAges = [] } = req.body;
    const cacheKey = `hotels-dom-${cityId}-${checkIn}-${checkOut}-${adultsCount}`;

    // 1. Memory Cache Check
    const localCached = SMART_CACHE.get('hotels', cacheKey);
    if (localCached && localCached.length > 0) {
      console.log(`[Cache] Serving ${localCached.length} hotels from memory.`);
      return res.json({ success: true, data: { hotels: localCached } });
    }

    // 2. Supabase Cache Check
    try {
      const { data: sbCached } = await supabase.from('search_cache').select('data').eq('key', cacheKey).single();
      if (sbCached && sbCached.data?.length > 0) {
        console.log(`[Supabase] Serving cached results for ${cityName}`);
        return res.json({ success: true, data: { hotels: sbCached.data } });
      }
    } catch (e) { /* Cache miss or table error */ }

    // Normalize City Name and ensure we have an ID
    const normalizedName = cityName.toLowerCase().trim();
    if (CANONICAL_CITY_MAP[normalizedName]) {
      const canonical = CANONICAL_CITY_MAP[normalizedName];
      cityName = canonical.cityName;
      cityId = canonical.cityId;
      countryId = canonical.countryId;
    }

    // Ensure we have a valid cityId via dynamic resolution if necessary
    if (!cityId || Number(cityId) <= 0) {
      console.log(`[Hotel] Missing ID for ${cityName}, resolving dynamically...`);
      const resolved = await browserManager.exec(async (page) => {
        return await resolveCityId(cityName, page);
      });
      if (resolved) {
        cityId = resolved.cityId;
        cityName = resolved.cityName;
      } else {
        // Ultimate fallback: Use Baghdad if resolution fails
        cityId = 3483;
        cityName = "Baghdad";
      }
    }

    console.log(`[Strategy] Switching to Full DOM Scraping for ${cityName}...`);
    
    const hotels = await browserManager.exec(async (page) => {
      return await scrapeHotelsFromDOM(page, {
        cityName,
        cityId,
        checkIn,
        checkOut,
        adultsCount
      });
    });

    if (!hotels || hotels.length === 0) {
      console.warn(`[DOM Scraper] No hotels found for ${cityName}. Returning empty list.`);
      return res.json({ success: true, data: { hotels: [] } });
    }

    // Update Caches
    SMART_CACHE.set('hotels', cacheKey, hotels);
    try {
      await supabase.from('search_cache').upsert({ 
        key: cacheKey, 
        data: hotels, 
        created_at: new Date() 
      }, { onConflict: 'key' });
    } catch (e) { console.warn('[Supabase] Cache update failed:', e.message); }

    return res.json({ success: true, data: { hotels } });
  } catch (e) {
    console.error(`[Scraper Endpoint] Final Error: ${e.message}`);
    return res.json({ success: false, message: e.message });
  }
});

// ==========================================
// 4. Endpoint 2: POST /api/hotel-details
// ==========================================
app.post('/api/hotel-details', async (req, res) => {
  try {
    let { hotelId, cityName, checkIn, checkOut } = req.body;
    const cacheKey = `details-${hotelId}`;

    const localCached = SMART_CACHE.get('hotels', cacheKey);
    if (localCached) return res.json(localCached);

    try {
      const { data: sbCached } = await supabase.from('details_cache').select('data').eq('hotel_id', hotelId).single();
      if (sbCached) return res.json(sbCached.data);
    } catch (e) { }

    console.log(`[Speed Mode] Rapid Detail Fetch: ${hotelId} in ${cityName}`);

    const result = await browserManager.exec(async (page) => {
      let content = null;
      try {
        content = await executeFetchInPage(page, `v2/hotel-content/HotelSearch/hotel-details/${hotelId}`);
      } catch (e) {
        console.warn(`[Hotel Details] v2 failed, trying v1 fallback for ${hotelId}`);
        content = await executeFetchInPage(page, `v1/hotel-content/HotelSearch/hotel-details/${hotelId}`);
      }

      const hotel = content?.result || {};

      const cleaned = {
        success: true,
        name: hotel.title?.ar || hotel.title?.en || "فندق",
        description: hotel.description?.ar || hotel.description?.en || "",
        rating: hotel.rate || 8.5,
        stars: hotel.star || 4,
        address: hotel.address?.ar || hotel.address?.en || "",
        images: (hotel.images || []).map(img => img.url.replace(/\/small$/, '/large')),
        facilities: (hotel.facilities || []).map(f => f.title?.ar || f.title?.en),
        rooms: [
          { type: 'غرفة قياسية', price: 120, features: ['افطار مجاني', 'واي فاي'] },
          { type: 'غرفة ديلوكس', price: 180, features: ['افطار مجاني', 'اطلالة مدينة'] }
        ]
      };

      return cleaned;
    });

    SMART_CACHE.set('hotels', cacheKey, result);
    try {
      await supabase.from('details_cache').upsert({ hotel_id: hotelId, data: result, created_at: new Date() });
    } catch (e) { }

    return res.json(result);
  } catch (e) {
    console.error(`[Hotel Details] Error: ${e.message}`);
    return res.json({ success: false, message: e.message });
  }
});

// ==========================================
// 5. Legacy/Flight Endpoints
// ==========================================
/**
 * Strategy: Full DOM Scraping for Flights
 * Hardened with the same context-destruction resilience as hotel scraping.
 */
async function scrapeFlightsFromDOM(page, params) {
  const { origin, destination, date } = params;
  
  // Construct search URL
  const url = `https://sindibad.iq/flights/${origin}-${destination}?departing=${date}&adult=1&child=0&infant=0&cabinType=Economy&flightType=OneWay&step=results`;
  
  const MAX_OUTER_RETRIES = 3;

  for (let outerAttempt = 1; outerAttempt <= MAX_OUTER_RETRIES; outerAttempt++) {
    console.log(`[Flight DOM] Attempt ${outerAttempt}/${MAX_OUTER_RETRIES} — Navigating to: ${url}`);

    try {
      // 1. Navigate with generous timeout
      await page.goto(url, { waitUntil: 'networkidle2', timeout: 90000 });

      // 2. Wait for URL to stabilize (catches SPA redirects)
      await waitForUrlToStabilize(page, 3000, 15000);

      // 3. Wait for Cloudflare to clear
      await ensurePageIsReady(page);

      // 4. Wait for the results container with multiple selector attempts
      const flightSelectors = [
        '.flights__content',
        '[class*="FlightCard"]',
        '[class*="flight-card"]',
        '.flight-results'
      ];

      let selectorFound = false;
      for (const sel of flightSelectors) {
        try {
          await page.waitForSelector(sel, { visible: true, timeout: 20000 });
          console.log(`[Flight DOM] Found flight container with selector: ${sel}`);
          selectorFound = true;
          break;
        } catch (e) {
          // Try next selector
        }
      }

      if (!selectorFound) {
        console.warn(`[Flight DOM] No flight container selector matched. Will attempt extraction anyway.`);
        await wait(5000);
      }

      // 5. Extra wait for flight data to render
      await wait(3000);

      // 6. Extract flight data (wrapped in safeEvaluate with retries)
      const flights = await safeEvaluate(page, () => {
        const results = [];
        const container = document.querySelector('.flights__content');
        if (!container) return [];

        // Individual flight entries are direct children or within a specific list
        const cards = Array.from(container.children).filter(el => el.innerText.includes('د.ع'));

        cards.forEach((card, index) => {
          try {
            const text = card.innerText;
            
            // Extract Times (HH:mm)
            const times = text.match(/\d{2}:\d{2}/g);
            const depTime = times?.[0] || "--:--";
            const arrTime = times?.[1] || "--:--";
            
            // Extract Price
            const priceMatch = text.match(/([\d,]+)\s*د\.ع/) || text.match(/([\d,]+)\s*IQD/);
            const priceStr = priceMatch ? priceMatch[1] : "0";
            const price = parseInt(priceStr.replace(/,/g, ''), 10);

            // Extract Airline
            const img = card.querySelector('img');
            const airline = img?.alt || "طيران";

            // Duration
            const durationMatch = text.match(/(\d+)\s*ساعات?\s*(\d+)\s*دقیقة/) || text.match(/(\d+)\s*min/);
            let duration = "غير معروف";
            if (durationMatch) {
              duration = durationMatch[0];
            }

            if (price > 0) {
              results.push({
                id: `flight-${index}-${Date.now()}`,
                airline: airline,
                airlineCode: img?.src?.split('/').pop()?.split('.')[0]?.toUpperCase() || "IA",
                price: price,
                departureTime: depTime,
                arrivalTime: arrTime,
                duration: duration,
                stops: text.includes('توقف') ? (parseInt(text.match(/(\d+)\s*توقف/)?.[1]) || 1) : 0,
                origin: "", // Will be filled from params
                destination: "" // Will be filled from params
              });
            }
          } catch (e) {}
        });
        return results;
      });

      console.log(`[Flight DOM] Successfully extracted ${flights.length} flights.`);
      return flights.map(f => ({ ...f, origin, destination }));

    } catch (error) {
      const isContextError =
        error.message.includes('Execution context was destroyed') ||
        error.message.includes('Cannot find context') ||
        error.message.includes('Navigating frame was detached') ||
        error.message.includes('Target closed') ||
        error.message.includes('Navigation failed');

      if (isContextError && outerAttempt < MAX_OUTER_RETRIES) {
        console.warn(`[Flight DOM] Context destroyed on attempt ${outerAttempt}, will re-navigate in 4s...`);
        await wait(4000);
        continue;
      }
      console.error(`[Flight DOM] Failed after ${outerAttempt} attempts: ${error.message}`);
      throw error;
    }
  }
}

app.post('/api/scrape-flights', async (req, res) => {
  const { origin, destination, date } = req.body;
  const cacheKey = `flights-dom-${origin}-${destination}-${date}`;
  
  const cached = SMART_CACHE.get('flights', cacheKey);
  if (cached && cached.length > 0) {
    console.log(`[Cache] Serving ${cached.length} flights from memory.`);
    return res.json({ success: true, data: cached });
  }

  console.log(`[Strategy] Switching to Flight DOM Scraping for ${origin} -> ${destination}...`);
  
  try {
    const flights = await browserManager.exec(async (page) => {
      return await scrapeFlightsFromDOM(page, { origin, destination, date });
    });

    if (flights.length > 0) {
      SMART_CACHE.set('flights', cacheKey, flights);
    }
    
    return res.json({ success: true, data: flights });
  } catch (e) {
    console.error(`[Flight Endpoint] Final Error: ${e.message}`);
    return res.json({ success: false, message: e.message });
  }
});

const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');
let bookings = [];

const loadBookings = () => {
  try {
    if (fs.existsSync(BOOKINGS_FILE)) {
      const data = fs.readFileSync(BOOKINGS_FILE, 'utf8');
      bookings = JSON.parse(data);
      console.log(`[Storage] Loaded ${bookings.length} bookings from storage.`);
    }
  } catch (e) {
    console.error('[Storage] Error loading bookings:', e.message);
    bookings = [];
  }
};

const saveBookings = () => {
  try {
    fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2), 'utf8');
    console.log(`[Storage] Bookings saved to ${BOOKINGS_FILE}`);
  } catch (e) {
    console.error('[Storage] Error saving bookings:', e.message);
  }
};

loadBookings();

app.get('/api/bookings', (req, res) => {
  console.log(`[Bookings] Fetching all bookings (${bookings.length} found)`);
  return res.json({ success: true, data: bookings });
});

app.post('/api/create-booking', async (req, res) => {
  const { passenger, hotelId, hotelName, checkIn, checkOut, price, type = 'hotel' } = req.body;
  const generatedRef = `SND-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

  const newBooking = {
    id: Date.now(),
    type,
    title: hotelName || 'فندق غير معروف',
    date: `${checkIn} - ${checkOut}`,
    status: "بانتظار التأكيد",
    price: price || '0',
    airline: passenger?.firstName + ' ' + passenger?.lastName,
    code: generatedRef,
    createdAt: new Date().toISOString()
  };

  bookings.unshift(newBooking);
  saveBookings();

  console.log(`[Booking] NEW! Ref: ${generatedRef} | Passenger: ${passenger?.firstName} | Title: ${newBooking.title}`);

  await wait(1500);
  return res.json({ success: true, bookingId: generatedRef });
});

// ==========================================
// 6. Start Server
// ==========================================
// 🔴 FIX 3: إضافة '0.0.0.0' للربط الشبكي الإجباري في Render بدلاً من localhost الافتراضي
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Scraper Service running on port ${PORT}`);
  browserManager.init().catch(err => console.error("[Browser] Background init failed:", err));
});