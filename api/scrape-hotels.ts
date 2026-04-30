import axios from 'axios';
import * as cheerio from 'cheerio';

const ZENROWS_API_KEY = process.env.ZENROWS_API_KEY;

export default async function handler(req: any, res: any) {
  // 1. CORS Headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ success: false, message: 'Method Not Allowed' });
    return;
  }

  const { cityName, cityId, checkIn, checkOut, adultsCount = 2 } = req.body;

  // Resolve cityId if missing
  let targetId = cityId;
  if (!targetId || targetId <= 0) {
    if (cityName.toLowerCase().includes('baghdad') || cityName.includes('بغداد')) targetId = 3483;
    else if (cityName.toLowerCase().includes('erbil') || cityName.includes('اربيل')) targetId = 3482;
    else targetId = 3484; // Basra fallback
  }

  const fCheckIn = checkIn.split('T')[0];
  const fCheckOut = checkOut.split('T')[0];
  const slug = `${cityName}-${targetId}`;
  
  const searchUrl = `https://sindibad.iq/hotels/${slug}?cityNameLocale=${encodeURIComponent(cityName)}&country=Iraq&checkIn=${fCheckIn}&checkOut=${fCheckOut}&countryId=17&searchType=City&rooms=${adultsCount}`;

  console.log(`[Vercel Serverless] 🚀 Mission Start: ${cityName}`);
  
  // Critical Optimization: wait_for=2000, autoparse=true
  const proxyUrl = `https://api.zenrows.com/v1/?apikey=${ZENROWS_API_KEY}&url=${encodeURIComponent(searchUrl)}&js_render=true&premium_proxy=true&wait_for=2000&autoparse=true`;

  const maskedUrl = proxyUrl.replace(String(ZENROWS_API_KEY), 'HIDDEN_KEY');
  console.log(`[ZenRows] Requesting URL: ${maskedUrl}`);

  try {
    // Vercel Hobby timeout is 10s, set Axios timeout to 9000ms
    const response = await axios.get(proxyUrl, { timeout: 9000 });
    const html = response.data;
    
    console.log("Response Status from ZenRows:", response.status);
    console.log("HTML Length captured:", html?.length);
    if (html?.length < 1000) {
      console.log("WARNING: Captured HTML seems too short. Possible block or empty page.");
    }

    const $ = cheerio.load(html);
    const results: any[] = [];

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
    console.log(`[Vercel Serverless] ✅ Mission SUCCESS: ${uniqueHotels.length} hotels captured.`);
    
    res.status(200).json({ success: true, data: uniqueHotels, count: uniqueHotels.length });
    
  } catch (error: any) {
    console.error(`[Vercel Serverless] ❌ Mission FAILED: ${error.message}`);
    // Return 504 on timeout
    res.status(504).json({ 
      success: false, 
      message: "Search taking longer than expected, please try again." 
    });
  }
}
