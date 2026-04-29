const express = require('express');
const cors = require('cors');
const axios = require('axios');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

// Initialize Puppeteer Stealth
puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 4000;

// ==========================================
// 1. Setup & Constants
// ==========================================
app.use(cors());
app.use(express.json());

// CONFIGURATION: Update these if the session expires
const SINDIBAD_TOKEN = 'It2AoD8T7rZ_Pb5bHUxet';

/**
 * Executes a fetch request within a PROVIDED browser page context.
 * DOES NOT manage browser lifecycle. Caller must launch and close.
 */
const executeFetchInPage = async (page, path, options = {}) => {
  if (!page) throw new Error("No browser page provided to executeFetchInPage");

  const fullUrl = path.startsWith('http') ? path : `https://api.sindibad.iq/api/${path}`;
  // Reduced logging
  
  let retries = 3;
  while (retries > 0) {
    try {
      const result = await page.evaluate(async (url, fetchOptions) => {
        const token = localStorage.getItem('token') || 
                      JSON.parse(localStorage.getItem('auth') || '{}')?.token || 
                      'It2AoD8T7rZ_Pb5bHUxet';

        const headers = {
          'Accept': 'application/json',
          'accept-token': token,
          'appversion': '1.254.0',
          'currencytype': 'IQD',
          'device': 'web',
          'language': 'ar',
          'Content-Type': 'application/json',
          ...fetchOptions.headers
        };

        try {
          const response = await fetch(url, { ...fetchOptions, headers });
          if (!response.ok) {
            const errorText = await response.text();
            return { success: false, status: response.status, error: errorText };
          }
          const data = await response.json();
          return { success: true, data };
        } catch (e) {
          return { success: false, status: 0, error: e.message };
        }
      }, fullUrl, options);

      if (!result.success) {
        const error = new Error(`Target API Error: ${result.status} | ${result.error}`);
        error.status = result.status;
        error.details = result.error;
        throw error;
      }

      return result.data;
    } catch (e) {
      if (e.message.includes('Execution context was destroyed') && retries > 1) {
        console.warn(`[Retrying] Context destroyed, attempt ${4 - retries}...`);
        await wait(1000);
        retries--;
        continue;
      }
      throw e;
    }
  }
};

/**
 * Legacy wrapper for one-off fetches
 */
const sindibadOneOffFetch = async (path, options = {}) => {
  const browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ]
  });
  try {
    const page = await browser.newPage();
    
    // RESOURCE BLOCKING: Skip heavy assets but keep stylesheets for stability
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'font', 'media'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.goto('https://sindibad.iq', { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(2000); // Stability wait
    return await executeFetchInPage(page, path, options);
  } finally {
    await browser.close();
  }
};

/**
 * Utility: Wait for a specified number of milliseconds
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

const CITY_ID_EXCLUSIONS = {
  3483: ["erbil", "أربيل", "اربيل", "basra", "البصرة", "sulaymaniyah", "السليمانية", "najaf", "النجف", "karbala", "كربلاء", "duhok", "دهوك"], // Baghdad
  3484: ["erbil", "أربيل", "اربيل", "baghdad", "بغداد", "sulaymaniyah", "السليمانية", "najaf", "النجف", "karbala", "كربلاء", "duhok", "دهوك"], // Basra
  3482: ["baghdad", "بغداد", "basra", "البصرة", "najaf", "النجف", "karbala", "كربلاء"], // Erbil
  3489: ["erbil", "أربيل", "اربيل", "baghdad", "بغداد", "basra", "البصرة", "sulaymaniyah", "السليمانية", "duhok", "دهوك"], // Najaf
  3486: ["erbil", "أربيل", "اربيل", "baghdad", "بغداد", "basra", "البصرة", "sulaymaniyah", "السليمانية", "duhok", "دهوك"], // Karbala
  3487: ["baghdad", "بغداد", "basra", "البصرة", "najaf", "النجف", "karbala", "كربلاء"], // Sulaymaniyah
  3488: ["baghdad", "بغداد", "basra", "البصرة", "najaf", "النجف", "karbala", "كربلاء"] // Duhok
};

const DYNAMIC_CITY_CACHE = new Map();
// ==========================================
// 3. Endpoint 1: POST /api/scrape-hotels (The Search/PLP)
// ==========================================
app.post('/api/scrape-hotels', async (req, res) => {
  let browser = null;
  let page = null;

  try {
    let { cityName, cityId, countryId, checkIn, checkOut, adultsCount = 2, childrenAges = [] } = req.body;
    
    // Launch Browser ONCE for the entire request
    // Launch Browser with Performance Flags
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });
    page = await browser.newPage();
    
    // RESOURCE BLOCKING: Skip heavy assets but keep stylesheets
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      const type = req.resourceType();
      if (['image', 'font', 'media'].includes(type)) {
        req.abort();
      } else {
        req.continue();
      }
    });

    await page.setViewport({ width: 1280, height: 800 });

    // Prime the session with networkidle2 for full stability
    console.log(`[Browser] Priming session at https://sindibad.iq...`);
    await page.goto('https://sindibad.iq', { waitUntil: 'networkidle2', timeout: 60000 });
    await wait(2000); // Stability wait for SPA hydration

    // ==========================================
    // LAYER 2: CANONICAL DESTINATION RESOLUTION
    // ==========================================
    const normalizedCityName = (cityName || "").trim().toLowerCase();
    let isFromCacheOrMap = false;

    if (CANONICAL_CITY_MAP[normalizedCityName]) {
      cityId = CANONICAL_CITY_MAP[normalizedCityName].cityId;
      countryId = CANONICAL_CITY_MAP[normalizedCityName].countryId;
      cityName = CANONICAL_CITY_MAP[normalizedCityName].cityName; 
      isFromCacheOrMap = true;
    } else if (DYNAMIC_CITY_CACHE.has(normalizedCityName)) {
      const cached = DYNAMIC_CITY_CACHE.get(normalizedCityName);
      cityId = cached.cityId;
      countryId = cached.countryId;
      cityName = cached.cityName;
      isFromCacheOrMap = true;
    } else {
      console.log(`[Geo Resolver] Unrecognized destination "${cityName}". Invoking dynamic resolution...`);
      const resolved = await resolveCityId(cityName, page);
      if (resolved) {
        const resolvedName = (resolved.cityName || "").toLowerCase();
        
        const isProviderPoison = (
            resolved.cityId === 3482 && !normalizedCityName.includes("erbil") && !normalizedCityName.includes("أربيل") && !normalizedCityName.includes("اربيل")
        ) || (
            resolved.cityId === 3483 && !normalizedCityName.includes("baghdad") && !normalizedCityName.includes("بغداد")
        );
        
        if (isProviderPoison) {
           console.error(`[Geo Relevance] FATAL: Semantic mismatch! User searched "${cityName}", Provider returned "${resolvedName}" (ID: ${resolved.cityId}). Rejecting.`);
           return res.json({ success: true, data: { hotels: [] }, message: "Destination unrecognized or ambiguous." });
        }

        cityId = resolved.cityId;
        countryId = resolved.countryId;
        DYNAMIC_CITY_CACHE.set(normalizedCityName, { cityId, countryId, cityName });
        isFromCacheOrMap = true;
      } else {
        console.error(`[Geo Relevance] FATAL: Could not resolve canonical ID for "${cityName}".`);
        return res.json({ success: true, data: { hotels: [] }, message: "Destination unrecognized." });
      }
    }

    // Validation & Sanitization
    cityId = parseInt(cityId, 10);
    countryId = parseInt(countryId, 10);
    adultsCount = parseInt(adultsCount, 10);
    const sanitizeDate = (d) => {
      if (!d) return null;
      if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
      try { return new Date(d).toISOString().split('T')[0]; } catch (e) { return d; }
    };
    checkIn = sanitizeDate(checkIn);
    checkOut = sanitizeDate(checkOut);

    if (!cityName || !cityId || !countryId || !checkIn || !checkOut) {
      return res.status(400).json({ error: 'Missing required search parameters' });
    }

    console.log(`[Hotel Search] Initiating for: ${cityName} (ID: ${cityId}, Check-in: ${checkIn}, Check-out: ${checkOut})`);

    const sindibadPayload = {
      cityName: cityName,
      cityId: cityId,
      countryId: countryId,
      checkIn: checkIn,
      checkOut: checkOut,
      rooms: [{ adultsCount: adultsCount, childrenAges: childrenAges }]
    };

    let sid;
    try {
      console.log(`[Hotel Search] Starting search for sessionId...`);
      const startRes = await executeFetchInPage(page, 'v2/hotel-content/HotelSearch/start-search', {
        method: 'POST',
        body: JSON.stringify(sindibadPayload)
      });
      sid = startRes?.result?.searchSessionId;
    } catch (err) {
      if (err.status === 500 || err.message.includes('500')) {
        console.log(`[Target API Error] City has no inventory (500). Gracefully returning 0 hotels.`);
        return res.status(200).json({ success: true, data: { hotels: [] } });
      }
      throw err;
    }
    
    if (!sid) throw new Error('Failed to retrieve searchSessionId from Sindibad.');

    // AGGRESSIVE POLLING & EARLY EXIT
    const pollPayload = JSON.stringify({ pageSize: 1000, pageNumber: 1, filters: null });
    let rawHotels = [];
    
    for (let i = 1; i <= 20; i++) {
      try {
        const pollRes = await executeFetchInPage(page, `v2/hotel-content/HotelSearch/poll-results/${sid}`, {
          method: 'POST',
          body: pollPayload
        });
        
        const data = pollRes?.result || pollRes || {};
        rawHotels = data.hotels || [];
        
        // EARLY EXIT: As soon as we have enough results (e.g., 10+) we return immediately for better UX
        if (rawHotels.length >= 10 || data.isSearchCompleted === true || data.status === 'Completed') {
          console.log(`[Hotel Search] Early Exit triggered at iteration ${i} with ${rawHotels.length} hotels.`);
          break;
        }
      } catch (err) {
        if (err.status === 500 || err.message.includes('500')) {
          console.log(`[Target API Error] Target crashed during poll (500), assuming 0 inventory.`);
          return res.status(200).json({ success: true, data: { hotels: [] } });
        }
        throw err;
      }
      
      await wait(500); // Shorter poll interval (500ms) for high reactivity
    }

    // ==========================================
    // LAYER 3: GEO RELEVANCE & CLEANING
    // ==========================================
    let droppedContaminationCount = 0;
    const excludedList = CITY_ID_EXCLUSIONS[cityId] || [];

    const cleanedHotels = rawHotels.reduce((acc, hotel) => {
      const content = hotel.content || {};
      const hotelCity = (content.city?.locale || content.city?.en || "").toLowerCase();
      const hotelAddress = (content.address?.locale || content.address?.en || "").toLowerCase();
      const name = content.title?.locale || content.title?.en || `Hotel ${hotel.hotelId}`;

      if (excludedList.length > 0) {
        if (excludedList.some(ex => hotelCity.includes(ex) || hotelAddress.includes(ex))) {
          droppedContaminationCount++;
          return acc;
        }
      }

      const image = (content.images?.[0]?.url) || "https://picsum.photos/800/600";
      let finalPrice = "غير متوفر";
      if (Array.isArray(hotel.price)) {
        const iqdPrice = hotel.price.find(p => p.currency === "IQD") || hotel.price[0];
        if (iqdPrice?.minPricePerNight) finalPrice = iqdPrice.minPricePerNight.toLocaleString('en-US');
      } else if (typeof hotel.price === 'number') {
        finalPrice = hotel.price.toLocaleString('en-US');
      }

      acc.push({
        hotelId: hotel.hotelId,
        provider: hotel.provider,
        price: finalPrice,
        stars: content.star || 4,
        rating: content.rate || 8.5,
        reviewsCount: content.numberOfRaters || 0,
        name: name,
        location: cityName,
        image: image,
        imageUrl: image
      });

      return acc;
    }, []);

    if (droppedContaminationCount > 0) {
      console.warn(`[Geo Guard] Dropped ${droppedContaminationCount} wrong-city properties for "${cityName}".`);
    }

    console.log(`[Hotel Search] Completed. Returning ${cleanedHotels.length} hotels.`);
    return res.json({ success: true, data: { hotels: cleanedHotels } });

  } catch (error) {
    console.error(`[Hotel Search] ERROR: ${error.message}`);
    return res.status(502).json({
      success: false,
      message: `Scraper Failure: ${error.message}`,
      details: error.response?.data || error.message
    });
  } finally {
    if (browser) {
      console.log(`[Browser] Closing main instance.`);
      await browser.close();
    }
  }
});

// ==========================================
// 4. Endpoint 2: POST /api/hotel-details (The Details/PDP)
// ==========================================
app.post('/api/hotel-details', async (req, res) => {
  let { hotelId, cityName = 'Erbil' } = req.body;
  hotelId = hotelId || req.query.hotelId;

  if (!hotelId) {
    return res.status(400).json({ error: 'Missing required parameter: hotelId' });
  }

  let browser = null;
  try {
    console.log(`[Hotel Details] Launching scraper for hotelId: ${hotelId} in ${cityName}`);
    
    browser = await puppeteer.launch({
      headless: "new",
      args: [
        '--no-sandbox', 
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1200 });

    // UNBLOCK IMAGES: We need them for the details page DOM analysis
    await page.setRequestInterception(false);

    // Navigate to the public details page
    const detailUrl = `https://sindibad.iq/hotels/${cityName}/${hotelId}`;
    console.log(`[Hotel Details] Navigating to: ${detailUrl}`);
    
    await page.goto(detailUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Wait for images to hydrate and trigger lazy loading
    await page.waitForSelector('.hotel-card__slider img', { timeout: 15000 }).catch(() => {});
    
    // Auto-scroll to trigger lazy loading
    await page.evaluate(async () => {
      await new Promise((resolve) => {
        let totalHeight = 0;
        let distance = 100;
        let timer = setInterval(() => {
          let scrollHeight = document.body.scrollHeight;
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= 800) { // Just scroll enough for hero images
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });

    await wait(4000); // Wait for images to settle after scroll

    // Wait for the main heading (Hotel Name)
    await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});

    // Scrape the DOM
    const hotelData = await page.evaluate(async () => {
      // 1. Title
      const title = document.querySelector('h1')?.innerText || 'فندق مجهول';

    // 2. High-Resolution Images (Enhanced resolution and anti-placeholder logic)
    const images = Array.from(document.querySelectorAll('.hotel-card__slider img, .hotel-gallery img, [class*="slider"] img, .hotel-image img, .gallery-item img'))
      .map(img => {
        const dataSrc = img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
        const srcset = img.getAttribute('srcset');
        let srcSetUrl = null;
        if (srcset) {
          const parts = srcset.split(',').map(s => s.trim().split(' ')[0]);
          srcSetUrl = parts[parts.length - 1]; // Take highest quality
        }
        let url = dataSrc || srcSetUrl || img.src;
        
        // Upgrade 'small' to 'large' if it's a Sindibad CDN URL
        if (url && url.includes('static.sindibad.iq') && url.endsWith('/small')) {
          url = url.replace(/\/small$/, '/large');
        }
        return url;
      })
      .filter(src => {
        if (!src || typeof src !== 'string') return false;
        const isBase64 = src.startsWith('data:image');
        const isPlaceholder = src.includes('placeholder') || src.includes('blank') || src.includes('transparent');
        const isIcon = src.includes('icon') || src.includes('logo') || src.includes('marker');
        return src.startsWith('http') && !isIcon && !isBase64 && !isPlaceholder;
      });

      // 3. Try to expand description
      const showMoreBtn = Array.from(document.querySelectorAll('button')).find(b => 
        b.innerText.includes('أظهر المزيد') || b.innerText.includes('Show more')
      );
      if (showMoreBtn) showMoreBtn.click();

      // 4. Improved Description Extraction
      const infoSection = Array.from(document.querySelectorAll('div')).find(div => 
        div.innerText.length > 200 && (div.innerText.includes('معلومات') || div.innerText.includes('Information'))
      );
      
      let description = infoSection ? infoSection.innerText.replace(/معلومات|Information|أظهر المزيد|Show more/g, '').trim() : '';
      
      if (!description) {
         const pTags = Array.from(document.querySelectorAll('p')).filter(p => p.innerText.length > 100);
         description = pTags.map(p => p.innerText).join('\n\n');
      }

      // 5. Real Price from sticky footer (Stripping non-numeric characters)
      const priceEl = document.querySelector('.hotel-pdp-footer__price-amount, .hotel-price__amount');
      let price = priceEl ? priceEl.innerText.replace(/[^0-9,]/g, '').trim() : null;

      // 6. Facilities
      const facilities = Array.from(document.querySelectorAll('.hotel-facilities__item, .amenity-item, [class*="facilities"] li, .hotel-amenity'))
        .map(el => el.innerText.trim())
        .filter(t => t.length > 2);

      return {
        title,
        images: [...new Set(images)].slice(0, 15), // Deduplicate and limit
        description: description.trim() || 'لا يوجد وصف متاح لهذا الفندق حالياً. يرجى مراجعة الموقع الرسمي لمزيد من التفاصيل.',
        price: price || null,
        facilities: facilities.length > 0 ? facilities : ['واي فاي مجاني', 'تكييف', 'مكتب استقبال 24 ساعة']
      };
    });

    return res.json({ 
      success: true,
      data: hotelData
    });

  } catch (error) {
    console.error(`[Hotel Details] SCRAPE ERROR: ${error.message}`);
    return res.status(200).json({
      success: false,
      errorMessage: "Failed to scrape hotel details",
      details: error.message
    });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});


// ==========================================
// 5. Legacy/Flight Endpoints (Preserved & Cleaned)
// ==========================================
app.post('/api/scrape-flights', async (req, res) => {
  const { origin, destination, date } = req.body;
  if (!origin || !destination || !date) return res.status(400).json({ error: 'Missing flight params' });
  
  try {
    const startPayload = { itineraries: [{ origin, destination, departureDate: date }], adultCount: 1, childCount: 0, infantCount: 0, cabinType: "Economy", flightType: "OneWay", sessionId: "", forceRenew: true };
    const rawStartPayload = JSON.stringify(startPayload);
    
    const startRes = await sindibadOneOffFetch('v1/plp/flightsearch/start-search', {
      method: 'POST',
      body: rawStartPayload
    });
    const sessionId = startRes?.result?.sessionId || startRes?.sessionId;
    
    if (!sessionId) throw new Error('Failed to retrieve flight search session.');
    
    const pollPayload = { pageNumber: 1, pageSize: 20, filters: { sortBy: "", departureWindow: [], stopCount: [], maximumStopDurationHours: null, minPrice: null, maxPrice: null, airlines: [], airports: [] } };
    const rawPollPayload = JSON.stringify(pollPayload);
    let finalPollData = null;
    
    for (let i = 0; i < 6; i++) {
      const pollRes = await sindibadOneOffFetch(`v3/plp/flightsearch/poll-results?sessionId=${sessionId}&traceId=`, {
        method: 'POST',
        body: rawPollPayload
      });
      finalPollData = pollRes;
      if (finalPollData?.result?.isCompleted === true) break;
      await wait(3000);
    }
    
    const proposals = finalPollData?.result?.proposals || [];
    const transformedFlights = proposals.map(p => {
      const g = p.flightGroups?.[0] || {}; 
      const pr = p.prices?.details?.[0] || {};
      return { 
        id: p.proposalId, 
        airline: p.providerName, 
        departureTime: g.departureDateTime || "", 
        arrivalTime: g.arrivalDateTime || "", 
        origin: g.origin?.iataCode || "", 
        destination: g.destination?.iataCode || "", 
        duration: p.totalDurationInMinute + " min", 
        price: pr.totalFare || 0, 
        currency: "USD", 
        stops: g.numberOfStop || 0 
      };
    });
    
    return res.json({ data: transformedFlights });
  } catch (error) {
    console.error(`[Flight Search] REJECTED | Status: ${error.response?.status || 'N/A'} | Message: ${error.message}`);
    if (error.response?.data) {
      console.error("REJECTION DETAIL:", JSON.stringify(error.response.data, null, 2));
    }
    return res.status(502).json({
      success: false,
      message: 'Failed to scrape flight data',
      details: error.response?.data || error.message
    });
  }
});

// Global in-memory storage for bookings
const bookings = [];

app.get('/api/bookings', (req, res) => {
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
  
  console.log(`[Booking] NEW! ${passenger?.firstName || 'Unknown'} | ${generatedRef}`);
  await wait(1500);
  return res.json({ success: true, bookingId: generatedRef });
});

// ==========================================
// 6. Start Server
// ==========================================
app.listen(PORT, () => {
  console.log(`🚀 Scraper Service running on port ${PORT}`);
});
