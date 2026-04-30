const express = require('axios');
const cheerio = require('cheerio');
const axios = require('axios');
const app = require('express')();
const cors = require('cors');

app.use(cors());

const ZENROWS_API_KEY = 'd56d2641a481f21a7ae7f51760ef5162bb18cdad';

async function scrapeHotelsWithZenRows(searchUrl) {
  console.log(`[ZenRows] 🚀 Launching mission for: ${searchUrl}`);

  // هذا الرابط يخبر ZenRows أن يستخدم "آي بي سكني" ويحل الـ WAF ويقوم بتشغيل الجافا سكريبت
  const proxyUrl = `https://api.zenrows.com/v1/?apikey=${ZENROWS_API_KEY}&url=${encodeURIComponent(searchUrl)}&js_render=true&premium_proxy=true&wait_for=[data-testid="hotel-card"]`;

  try {
    const response = await axios.get(proxyUrl);
    const $ = cheerio.load(response.data);
    const hotels = [];

    // استهداف بطاقات الفنادق بناءً على "البصمة" التي وجدناها في سجلاتك السابقة
    $('div').each((i, el) => {
      const text = $(el).text();
      const hasPrice = /(USD|IQD|د\.ع)\s?[\d,.]+/.test(text);
      const hotelName = $(el).find('h3, h2, .hotel-name').first().text().trim();
      const image = $(el).find('img[src*="sindibad.iq"]').attr('src');

      if (hasPrice && hotelName && !hotelName.includes('فنادق') && !hotelName.includes('Hotels')) {
        const priceMatch = text.match(/(USD|IQD|د\.ع)\s?([\d,.]+)/);
        hotels.push({
          id: Math.random().toString(36).substr(2, 9),
          name: hotelName,
          price: priceMatch ? priceMatch[2].replace(/,/g, '') : '0',
          currency: priceMatch ? priceMatch[1] : 'IQD',
          image: image || '',
          rating: '8.5',
          location: 'العراق'
        });
      }
    });

    // إزالة التكرار
    const uniqueHotels = Array.from(new Map(hotels.map(h => [h.name, h])).values());
    console.log(`[ZenRows] ✅ Success! Captured ${uniqueHotels.length} hotels.`);
    return uniqueHotels;

  } catch (error) {
    console.error(`[ZenRows] ❌ Mission failed: ${error.message}`);
    return [];
  }
}

// الـ Route الخاص بك
app.post('/backend/api/scrape-hotels', async (req, res) => {
  const { city, checkIn, checkOut, rooms } = req.body;
  // بناء الرابط (تأكد من أنه يطابق صيغة سندباد)
  const cityId = city === 'Baghdad' ? '3483' : city === 'Erbil' ? '3482' : '3484';
  const searchUrl = `https://sindibad.iq/hotels/${city}-${cityId}?checkIn=${checkIn}&checkOut=${checkOut}&rooms=${rooms}`;

  const results = await scrapeHotelsWithZenRows(searchUrl);

  if (results.length > 0) {
    res.json({ success: true, data: results, count: results.length });
  } else {
    res.status(500).json({ success: false, message: "Could not bypass WAF even with ZenRows." });
  }
});

app.listen(4000, () => console.log('🚀 Suheil Strategic Engine running on port 4000'));