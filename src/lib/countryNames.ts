// ISO country code to Arabic name mapping
const countryNamesAr: Record<string, string> = {
  AE: "الإمارات", AF: "أفغانستان", AL: "ألبانيا", AM: "أرمينيا", AO: "أنغولا",
  AR: "الأرجنتين", AT: "النمسا", AU: "أستراليا", AZ: "أذربيجان", BA: "البوسنة والهرسك",
  BD: "بنغلاديش", BE: "بلجيكا", BG: "بلغاريا", BH: "البحرين", BR: "البرازيل",
  CA: "كندا", CH: "سويسرا", CN: "الصين", CO: "كولومبيا", CY: "قبرص",
  CZ: "التشيك", DE: "ألمانيا", DK: "الدنمارك", DZ: "الجزائر", EG: "مصر",
  ES: "إسبانيا", ET: "إثيوبيا", FI: "فنلندا", FR: "فرنسا", GB: "بريطانيا",
  GE: "جورجيا", GR: "اليونان", HK: "هونغ كونغ", HR: "كرواتيا", HU: "المجر",
  ID: "إندونيسيا", IE: "أيرلندا", IL: "فلسطين المحتلة", IN: "الهند", IQ: "العراق",
  IR: "إيران", IS: "آيسلندا", IT: "إيطاليا", JO: "الأردن", JP: "اليابان",
  KE: "كينيا", KG: "قيرغيزستان", KR: "كوريا الجنوبية", KW: "الكويت", KZ: "كازاخستان",
  LB: "لبنان", LK: "سريلانكا", LY: "ليبيا", MA: "المغرب", MV: "المالديف",
  MX: "المكسيك", MY: "ماليزيا", NG: "نيجيريا", NL: "هولندا", NO: "النرويج",
  NZ: "نيوزيلندا", OM: "عُمان", PH: "الفلبين", PK: "باكستان", PL: "بولندا",
  PT: "البرتغال", QA: "قطر", RO: "رومانيا", RS: "صربيا", RU: "روسيا",
  SA: "السعودية", SD: "السودان", SE: "السويد", SG: "سنغافورة", SO: "الصومال",
  TH: "تايلاند", TN: "تونس", TR: "تركيا", TZ: "تنزانيا", UA: "أوكرانيا",
  US: "الولايات المتحدة", UZ: "أوزبكستان", VN: "فيتنام", YE: "اليمن", ZA: "جنوب أفريقيا",
};

export function getCountryNameAr(code: string): string {
  return countryNamesAr[code?.toUpperCase()] || code || "";
}

// Arabic city name to IATA code mapping for local search
export const arabicCityAliases: Record<string, { name: string; code: string; country: string }> = {
  "بغداد": { name: "بغداد", code: "BGW", country: "IQ" },
  "أربيل": { name: "أربيل", code: "EBL", country: "IQ" },
  "اربيل": { name: "أربيل", code: "EBL", country: "IQ" },
  "البصرة": { name: "البصرة", code: "BSR", country: "IQ" },
  "النجف": { name: "النجف", code: "NJF", country: "IQ" },
  "السليمانية": { name: "السليمانية", code: "ISU", country: "IQ" },
  "دبي": { name: "دبي", code: "DXB", country: "AE" },
  "أبوظبي": { name: "أبوظبي", code: "AUH", country: "AE" },
  "ابوظبي": { name: "أبوظبي", code: "AUH", country: "AE" },
  "الشارقة": { name: "الشارقة", code: "SHJ", country: "AE" },
  "إسطنبول": { name: "إسطنبول", code: "IST", country: "TR" },
  "اسطنبول": { name: "إسطنبول", code: "IST", country: "TR" },
  "أنطاليا": { name: "أنطاليا", code: "AYT", country: "TR" },
  "انطاليا": { name: "أنطاليا", code: "AYT", country: "TR" },
  "طرابزون": { name: "طرابزون", code: "TZX", country: "TR" },
  "أنقرة": { name: "أنقرة", code: "ESB", country: "TR" },
  "بيروت": { name: "بيروت", code: "BEY", country: "LB" },
  "عمّان": { name: "عمّان", code: "AMM", country: "JO" },
  "عمان": { name: "عمّان", code: "AMM", country: "JO" },
  "الأردن": { name: "عمّان", code: "AMM", country: "JO" },
  "الاردن": { name: "عمّان", code: "AMM", country: "JO" },
  "العراق": { name: "بغداد", code: "BGW", country: "IQ" },
  "مصر": { name: "القاهرة", code: "CAI", country: "EG" },
  "تركيا": { name: "إسطنبول", code: "IST", country: "TR" },
  "القاهرة": { name: "القاهرة", code: "CAI", country: "EG" },
  "الدوحة": { name: "الدوحة", code: "DOH", country: "QA" },
  "الرياض": { name: "الرياض", code: "RUH", country: "SA" },
  "جدة": { name: "جدة", code: "JED", country: "SA" },
  "المدينة": { name: "المدينة المنورة", code: "MED", country: "SA" },
  "مسقط": { name: "مسقط", code: "MCT", country: "OM" },
  "الكويت": { name: "الكويت", code: "KWI", country: "KW" },
  "المنامة": { name: "المنامة", code: "BAH", country: "BH" },
  "لندن": { name: "لندن", code: "LHR", country: "GB" },
  "باريس": { name: "باريس", code: "CDG", country: "FR" },
  "مدريد": { name: "مدريد", code: "MAD", country: "ES" },
  "برلين": { name: "برلين", code: "BER", country: "DE" },
  "روما": { name: "روما", code: "FCO", country: "IT" },
  "موسكو": { name: "موسكو", code: "SVO", country: "RU" },
  "طهران": { name: "طهران", code: "IKA", country: "IR" },
  "كوالالمبور": { name: "كوالالمبور", code: "KUL", country: "MY" },
  "بانكوك": { name: "بانكوك", code: "BKK", country: "TH" },
  "جاكرتا": { name: "جاكرتا", code: "CGK", country: "ID" },
  "نيودلهي": { name: "نيودلهي", code: "DEL", country: "IN" },
  "كراتشي": { name: "كراتشي", code: "KHI", country: "PK" },
  "لاهور": { name: "لاهور", code: "LHE", country: "PK" },
  "المالديف": { name: "ماليه", code: "MLE", country: "MV" },
  "تبليسي": { name: "تبليسي", code: "TBS", country: "GE" },
  "باكو": { name: "باكو", code: "GYD", country: "AZ" },
};

export function searchArabicCities(query: string): Array<{ name: string; code: string; countryAr: string }> {
  const q = query.trim();
  if (q.length < 2) return [];
  
  const results: Array<{ name: string; code: string; countryAr: string }> = [];
  for (const [key, val] of Object.entries(arabicCityAliases)) {
    if (key.includes(q) || val.name.includes(q)) {
      const countryAr = countryNamesAr[val.country] || val.country;
      if (!results.find(r => r.code === val.code)) {
        results.push({ name: val.name, code: val.code, countryAr });
      }
    }
  }
  return results;
}
