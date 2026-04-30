const express = require('express');
const cors = require('cors');
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 4000;

app.use(cors({
  origin: '*', // Configured to allow requests from Vercel production domain and local development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const ZENROWS_API_KEY = 'd56d2641a481f21a7ae7f51760ef5162bb18cdad';

// ==========================================
// 1. ZenRows Strategic Extraction (Hotels)
// ==========================================
async function scrapeHotelsWithZenRows(params) {
  const { cityName, cityId, checkIn, checkOut, adultsCount } = params;
  const fCheckIn = checkIn.split('T')[0];
  const fCheckOut = checkOut.split('T')[0];
  const slug = `${cityName}-${cityId}`;
  const searchUrl = `https://sindibad.iq/hotels/${slug}?cityNameLocale=${encodeURIComponent(cityName)}&country=Iraq&checkIn=${fCheckIn}&checkOut=${fCheckOut}&countryId=17&searchType=City&rooms=${adultsCount}`;

  console.log(`[ZenRows] 🚀 Mission Start: ${cityName} via Managed Proxy`);
  
  const proxyUrl = `https://api.zenrows.com/v1/?apikey=${ZENROWS_API_KEY}&url=${encodeURIComponent(searchUrl)}&js_render=true&premium_proxy=true&wait_for=5000&autoparse=true`;

  const maskedUrl = proxyUrl.replace(ZENROWS_API_KEY, 'HIDDEN_KEY');
  console.log(`[ZenRows] Requesting URL: ${maskedUrl}`);

  try {
    const response = await axios.get(proxyUrl, { timeout: 90000 });
    const html = response.data;
    
    // Advanced Debugging
    console.log("Response Status from ZenRows:", response.status);
    console.log("HTML Length captured:", html.length);
    if (html.length < 1000) console.log("WARNING: Captured HTML seems too short. Possible block or empty page.");

    const $ = cheerio.load(html);
    const results = [];

    // Robust Selectors: elements that contain images with "assets.sindibad.iq"
    $('div, article, section, li').each((i, el) => {
      const card = $(el);
      const imgNode = card.find('img[src*="assets.sindibad.iq"]');
      
      if (imgNode.length > 0) {
        const text = card.text();
        const hasPrice = /(USD|IQD|د\.ع)\s?[\d,.]+/.test(text);
        
        const name = card.find('h1, h2, h3, h4, h5, h6, [class*="title"], [class*="name"]').first().text().trim() || 
                     card.find('p').first().text().trim();
        
        if (hasPrice && name && !name.includes('فنادق') && !name.includes('Hotels') && name.length > 2) {
          const priceMatch = text.match(/(USD|IQD|د\.ع)\s?([\d,.]+)/);
          results.push({
            id: `zen-${i}-${Date.now()}`,
            name: name,
            price: priceMatch ? parseInt(priceMatch[2].replace(/,/g, ''), 10) : 0,
            currency: priceMatch ? priceMatch[1] : 'IQD',
            image: imgNode.attr('src'),
            stars: 4,
            rating: 8.5,
            location: 'العراق'
          });
        }
      }
    });

    const uniqueHotels = Array.from(new Map(results.map(h => [h.name, h])).values());
    console.log(`[ZenRows] ✅ Mission SUCCESS: ${uniqueHotels.length} hotels captured.`);
    return uniqueHotels;
  } catch (error) {
    console.error(`[ZenRows] ❌ Mission FAILED: ${error.message}`);
    return { success: false, status: 504, message: "The server is busy, please try again in 5 seconds." };
  }
}

// ==========================================
// 2. API Routes (Standardized /backend/api)
// ==========================================

const apiRouter = express.Router();

// Hotel Search
apiRouter.post('/scrape-hotels', async (req, res) => {
  const { cityName, cityId, checkIn, checkOut, adultsCount = 2 } = req.body;
  
  // Resolve cityId if missing
  let targetId = cityId;
  if (!targetId || targetId <= 0) {
    if (cityName.toLowerCase().includes('baghdad') || cityName.includes('بغداد')) targetId = 3483;
    else if (cityName.toLowerCase().includes('erbil') || cityName.includes('اربيل')) targetId = 3482;
    else targetId = 3484; // Basra fallback
  }

  const result = await scrapeHotelsWithZenRows({ cityName, cityId: targetId, checkIn, checkOut, adultsCount });

  if (Array.isArray(result) && result.length > 0) {
    res.json({ success: true, data: result, count: result.length });
  } else if (result && result.status === 504) {
    res.status(504).json({ success: false, message: result.message });
  } else {
    res.status(200).json({ 
      success: false, 
      message: "No hotels found on the target page", 
      debug_info: "Selector X not found" 
    });
  }
});

// Hotel Details (Mocked since Puppeteer is removed)
apiRouter.post('/hotel-details', async (req, res) => {
  const { hotelId } = req.body;
  console.log(`[Details] Fetching for ${hotelId}`);
  res.json({
    success: true,
    name: "فندق",
    description: "تفاصيل الفندق غير متوفرة حالياً.",
    images: [],
    rating: 8.5
  });
});

// Flight Search (Mocked since Puppeteer is removed)
apiRouter.post('/scrape-flights', async (req, res) => {
  res.json({ success: true, data: [] });
});

// Bookings Storage
const BOOKINGS_FILE = path.join(__dirname, 'bookings.json');
apiRouter.post('/create-booking', (req, res) => {
  const booking = { ...req.body, id: Date.now(), status: "بانتظار التأكيد", code: `SND-${Math.random().toString(36).substr(2,6).toUpperCase()}` };
  let bookings = [];
  if (fs.existsSync(BOOKINGS_FILE)) bookings = JSON.parse(fs.readFileSync(BOOKINGS_FILE));
  bookings.unshift(booking);
  fs.writeFileSync(BOOKINGS_FILE, JSON.stringify(bookings, null, 2));
  res.json({ success: true, bookingId: booking.code });
});

apiRouter.get('/bookings', (req, res) => {
  let bookings = [];
  if (fs.existsSync(BOOKINGS_FILE)) bookings = JSON.parse(fs.readFileSync(BOOKINGS_FILE));
  res.json({ success: true, data: bookings });
});

app.use('/backend/api', apiRouter);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Suheil Strategic Engine active on port ${PORT} (ZenRows Enabled)`);
});