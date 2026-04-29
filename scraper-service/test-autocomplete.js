const axios = require('axios');

const TARGET_HEADERS = {
  "accept": "application/json, text/plain, */*",
  "accept-token": "hkqzyL1pArixiYlD1v5XE",
  "appversion": "1.248.2",
  "device": "web",
  "origin": "https://sindibad.iq",
  "referer": "https://sindibad.iq/",
  "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "content-type": "application/json"
};

async function testAutocomplete(query) {
  const urls = [
    `https://api.sindibad.iq/api/v1/hotel-content/HotelSearch/search-suggest?query=${query}`,
    `https://api.sindibad.iq/api/v2/hotel-content/HotelSearch/search-suggest?query=${query}`,
    `https://api.sindibad.iq/api/v1/hotel-content/location/search?query=${query}`,
    `https://api.sindibad.iq/api/v1/hotel-content/HotelSearch/autocomplete?query=${query}`
  ];

  for (const url of urls) {
    try {
      console.log(`Testing: ${url}`);
      const res = await axios.get(url, { headers: TARGET_HEADERS });
      console.log(`Success! Data:`, JSON.stringify(res.data, null, 2));
      return;
    } catch (e) {
      console.log(`Failed: ${url} (${e.message})`);
    }
  }
}

testAutocomplete('Basra');
