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
        
        // 🛡️ Stealth: Set realistic User-Agent to override headless defaults
        await p.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
        
        // 🛡️ Stealth: Set extra headers to mimic a real desktop browser
        await p.setExtraHTTPHeaders({
          'Accept-Language': 'en-US,en;q=0.9,ar;q=0.8',
          'Sec-CH-UA': '"Google Chrome";v="123", "Not:A-Brand";v="8", "Chromium";v="123"',
          'Sec-CH-UA-Mobile': '?0',
          'Sec-CH-UA-Platform': '"Windows"',
        });

        await p.setRequestInterception(true);
        p.on('request', r => ['image', 'font', 'media', 'stylesheet'].includes(r.resourceType()) ? r.abort() : r.continue());
        // Use domcontentloaded for faster/resilient warm up
        await p.goto('https://sindibad.iq', { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(e => console.warn(`[Browser] Warmup page ${i} warning: ${e.message}`));
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
const executeFetchInPage = async (page, path, options = {}) => {
  const fullUrl = path.startsWith('http') ? path : `https://api.sindibad.iq/api/${path}`;
  try {
    const result = await page.evaluate(async (url, fetchOptions) => {
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
        'Content-Type': 'application/json',
        'User-Agent': navigator.userAgent,
        ...fetchOptions.headers
      };
      try {
        const response = await fetch(url, { 
          ...fetchOptions, 
          headers,
          mode: 'cors',
          credentials: 'omit'
        });
        if (!response.ok) return { success: false, status: response.status, error: await response.text() };
        return { success: true, data: await response.json() };
      } catch (e) { return { success: false, status: 0, error: e.message }; }
    }, fullUrl, options);

    if (!result.success) throw new Error(`Browser API Error: ${result.status} - ${result.error}`);
    return result.data;
  } catch (e) {
    console.error(`[Browser Fetch] Failed: ${e.message}`);
    throw e;
  }
};

/**
 * Utility: Resolve City ID and Country ID dynamically from Sindibad's Autocomplete API
 */
const resolveCityId = async (cityName, page) => {
  try {
    const url = `v2/hotel-content/HotelSearch/search-suggest?query=${encodeURIComponent(cityName)}`;
    const data = await executeFetchInPage(page, url);
    const suggestions = data?.result || data || [];

    const cityMatch = suggestions.find(s => s.type === 'CITY' || s.type === 'City') || suggestions[0];

    if (cityMatch) {
      console.log(`[Hotel] Resolved ${cityName} -> ID: ${cityMatch.cityId || cityMatch.id}, Country: ${cityMatch.countryId}`);
      return {
        cityId: cityMatch.cityId || cityMatch.id,
        countryId: cityMatch.countryId || 17,
        cityName: cityMatch.name || cityMatch.title || cityName
      };
    }
  } catch (e) {
    console.error(`[Hotel] Dynamic lookup failed for ${cityName}:`, e.message);
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
app.post('/api/scrape-hotels', async (req, res) => {
  try {
    let { cityName, cityId, countryId, checkIn, checkOut, adultsCount = 2, childrenAges = [] } = req.body;
    const cacheKey = `hotels-${cityId}-${checkIn}-${checkOut}-${adultsCount}`;

    // 1. Memory Cache Check
    const localCached = SMART_CACHE.get('hotels', cacheKey);
    if (localCached) return res.json({ success: true, data: { hotels: localCached } });

    // 2. Supabase Cache Check
    try {
      const { data: sbCached } = await supabase.from('search_cache').select('data').eq('key', cacheKey).single();
      if (sbCached) {
        console.log(`[Supabase] Serving cached results for ${cityName}`);
        return res.json({ success: true, data: { hotels: sbCached.data } });
      }
    } catch (e) { /* Table might not exist yet */ }

    console.log(`[Speed Mode] Rapid Hotel Fetch: ${cityName}`);

    const normalizedName = cityName.toLowerCase().trim();
    if (CANONICAL_CITY_MAP[normalizedName]) {
      const canonical = CANONICAL_CITY_MAP[normalizedName];
      console.log(`[Hotel] Applying Canonical Mapping for ${cityName}: ${cityId} -> ${canonical.cityId}`);
      cityId = canonical.cityId;
      countryId = canonical.countryId;
    }

    const startPayload = {
      cityName,
      cityId: Number(cityId),
      countryId: Number(countryId || 17),
      checkIn: checkIn.split('T')[0],
      checkOut: checkOut.split('T')[0],
      rooms: [{ adultsCount: Number(adultsCount), childrenAges }]
    };

    let sid;
    const attemptSearch = async (payload) => {
      try {
        console.log(`[Hotel] Search Start (Direct): ${payload.cityName} (ID: ${payload.cityId})`);
        const start = await api.post('v2/hotel-content/HotelSearch/start-search', payload);
        return start.data?.result?.searchSessionId;
      } catch (err) {
        console.warn(`[Hotel] Direct Search failed for ID ${payload.cityId}: ${err.message}`);
        return null;
      }
    };

    sid = await attemptSearch(startPayload);

    if (!sid) {
      console.warn(`[Hotel] Resolving City ID dynamically for ${cityName}...`);
      const resolved = await browserManager.exec(async (page) => {
        return await resolveCityId(cityName, page);
      });

      if (resolved && resolved.cityId !== Number(cityId)) {
        console.log(`[Hotel] Corrected City ID for ${cityName}: ${cityId} -> ${resolved.cityId}`);
        startPayload.cityId = Number(resolved.cityId);
        startPayload.countryId = Number(resolved.countryId);
        sid = await attemptSearch(startPayload);
      }
    }

    if (!sid) {
      console.log(`[Hotel] Falling back to Browser Execution for ${cityName}...`);
      try {
        const res = await browserManager.exec(async (page) => {
          return await executeFetchInPage(page, 'v2/hotel-content/HotelSearch/start-search', {
            method: 'POST', body: JSON.stringify(startPayload)
          });
        });
        sid = res?.result?.searchSessionId;
      } catch (browserErr) {
        console.error(`[Hotel] All search attempts failed for ${cityName}: ${browserErr.message}`);
        throw browserErr;
      }
    }

    if (!sid) throw new Error('Could not obtain searchSessionId from any source.');

    let hotels = [];
    const startTime = Date.now();
    for (let i = 0; i < 40; i++) {
      try {
        const poll = await api.post(`v2/hotel-content/HotelSearch/poll-results/${sid}`, { pageSize: 20, pageNumber: 1 });
        const data = poll.data?.result || {};
        hotels = data.hotels || [];

        if (hotels.length >= 1 && (data.isSearchCompleted || i > 3)) {
          const duration = Date.now() - startTime;
          console.log(`[API Speed] Returned ${hotels.length} hotels in ${duration}ms (Iteration ${i})`);
          break;
        }
      } catch (e) { }
      await wait(100);
    }

    const cleaned = hotels.map(h => {
      let imageUrl = h.content?.images?.[0]?.url || "https://picsum.photos/400/300";
      if (imageUrl.includes('static.')) imageUrl = imageUrl.replace(/\/small$/, '/large');

      return {
        hotelId: h.hotelId,
        name: h.content?.title?.ar || h.content?.title?.en,
        price: h.price?.[0]?.minPricePerNight || h.price || 0,
        stars: h.content?.star || 4,
        rating: h.content?.rate || 8,
        image: imageUrl
      };
    });

    SMART_CACHE.set('hotels', cacheKey, cleaned);

    try {
      await supabase.from('search_cache').upsert({ key: cacheKey, data: cleaned, created_at: new Date() });
    } catch (e) { console.warn('[Supabase] Could not store cache. Ensure "search_cache" table exists.'); }

    return res.json({ success: true, data: { hotels: cleaned } });
  } catch (e) {
    if (e.response?.status === 401) await browserManager.refreshToken();
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
app.post('/api/scrape-flights', async (req, res) => {
  const { origin, destination, date } = req.body;
  const cacheKey = `${origin}-${destination}-${date}`;
  const cached = SMART_CACHE.get('flights', cacheKey);
  if (cached) return res.json({ success: true, data: cached });

  try {
    const start = await api.post('v1/plp/flightsearch/start-search', {
      itineraries: [{ origin, destination, departureDate: date }], adultCount: 1, cabinType: "Economy", flightType: "OneWay", forceRenew: true
    });
    const sid = start.data?.result?.sessionId;
    if (!sid) throw new Error('No flight SID');

    let flights = [];
    for (let i = 0; i < 5; i++) {
      const poll = await api.post(`v3/plp/flightsearch/poll-results?sessionId=${sid}`, { pageNumber: 1, pageSize: 20, filters: {} });
      flights = (poll.data?.result?.proposals || []).map(p => {
        const group = p.flightGroups?.[0] || {};
        return {
          id: p.proposalId,
          airline: p.providerName || "طيران غير معروف",
          airlineCode: group.carrierCode || "IA",
          price: p.prices?.details?.[0]?.totalFare || 0,
          departureTime: group.departureDateTime,
          arrivalTime: group.arrivalDateTime,
          duration: p.totalDurationInMinute ? `${p.totalDurationInMinute} min` : "غير معروف",
          stops: group.numberOfStop || 0,
          origin: group.origin?.iataCode || origin,
          destination: group.destination?.iataCode || destination
        };
      });
      if (flights.length > 5 || poll.data?.result?.isCompleted) break;
      await wait(300);
    }

    SMART_CACHE.set('flights', cacheKey, flights);
    return res.json({ success: true, data: flights });
  } catch (e) {
    if (e.response?.status === 401) await browserManager.refreshToken();
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