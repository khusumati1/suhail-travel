// supabase/functions/search-flights/searchCascade.ts
// ─────────────────────────────────────────────────────────
// Fail-Safe Search Cascade — NEVER return empty to user
// IATA validation → Filter relaxation → Alternate routes
// Trust fail-open → Diagnostics
// ─────────────────────────────────────────────────────────
/// <reference path="../deno.d.ts" />

import { SearchParams, SearchFilters, NormalizedOffer } from "./types.ts";

// ═══════════════════════════════════════════════════════════
// 1. IATA VALIDATION + CORRECTION
// ═══════════════════════════════════════════════════════════

const IATA_RE = /^[A-Z]{3}$/;

// Common city → IATA mappings for Middle East + major hubs
const CITY_TO_IATA: Record<string, string> = {
  // Arabic city names
  'الرياض': 'RUH', 'جدة': 'JED', 'جده': 'JED', 'الدمام': 'DMM', 'المدينة': 'MED',
  'مكة': 'JED', 'الطائف': 'TIF', 'أبها': 'AHB', 'تبوك': 'TUU', 'القصيم': 'ELQ',
  'دبي': 'DXB', 'أبوظبي': 'AUH', 'الشارقة': 'SHJ', 'الدوحة': 'DOH',
  'الكويت': 'KWI', 'مسقط': 'MCT', 'المنامة': 'BAH', 'عمان': 'AMM',
  'بيروت': 'BEY', 'القاهرة': 'CAI', 'اسطنبول': 'IST', 'لندن': 'LHR',
  'باريس': 'CDG', 'بغداد': 'BGW', 'الخرطوم': 'KRT',
  // English city names
  'riyadh': 'RUH', 'jeddah': 'JED', 'jidda': 'JED', 'dammam': 'DMM', 'medina': 'MED',
  'mecca': 'JED', 'makkah': 'JED', 'taif': 'TIF', 'abha': 'AHB', 'tabuk': 'TUU',
  'dubai': 'DXB', 'abu dhabi': 'AUH', 'sharjah': 'SHJ', 'doha': 'DOH',
  'kuwait': 'KWI', 'muscat': 'MCT', 'bahrain': 'BAH', 'amman': 'AMM',
  'beirut': 'BEY', 'cairo': 'CAI', 'istanbul': 'IST', 'london': 'LHR',
  'paris': 'CDG', 'baghdad': 'BGW', 'khartoum': 'KRT', 'casablanca': 'CMN',
  'new york': 'JFK', 'los angeles': 'LAX', 'chicago': 'ORD',
  'barcelona': 'BCN', 'madrid': 'MAD', 'rome': 'FCO', 'milan': 'MXP',
  'frankfurt': 'FRA', 'munich': 'MUC', 'amsterdam': 'AMS', 'zurich': 'ZRH',
  'singapore': 'SIN', 'tokyo': 'NRT', 'kuala lumpur': 'KUL', 'bangkok': 'BKK',
  'mumbai': 'BOM', 'delhi': 'DEL', 'karachi': 'KHI', 'lahore': 'LHE', 'islamabad': 'ISB',
};

// Common typos / wrong codes
const IATA_CORRECTIONS: Record<string, string> = {
  'BAR': 'BCN', 'NYC': 'JFK', 'LON': 'LHR', 'PAR': 'CDG',
  'DXP': 'DXB', 'RYD': 'RUH', 'JDE': 'JED', 'CAR': 'CAI',
  'ISL': 'IST', 'DUB': 'DXB', 'ADB': 'ADB', 'SAW': 'SAW',
};

// Nearby airport alternatives
const NEARBY_AIRPORTS: Record<string, string[]> = {
  'JED': ['MED', 'TIF', 'YNB'],
  'RUH': ['DMM', 'ELQ', 'AHB'],
  'DXB': ['SHJ', 'AUH', 'RKT'],
  'CAI': ['HBE', 'SSH', 'HRG'],
  'IST': ['SAW', 'ESB'],
  'LHR': ['LGW', 'STN', 'LTN'],
  'JFK': ['EWR', 'LGA'],
  'CDG': ['ORY'],
  'DOH': ['BAH', 'AUH'],
  'KWI': ['BAH', 'DOH'],
  'AMM': ['AQJ'],
  'BGW': ['BSR', 'NJF', 'EBL'],
};

export interface IATAValidation {
  original: string;
  corrected: string;
  was_corrected: boolean;
  correction_type?: 'typo' | 'city_name' | 'none';
  suggestions?: string[];
}

export function validateAndCorrectIATA(input: string): IATAValidation {
  const trimmed = input.trim();
  const upper = trimmed.toUpperCase();

  // Already valid IATA
  if (IATA_RE.test(upper) && !IATA_CORRECTIONS[upper]) {
    return { original: trimmed, corrected: upper, was_corrected: false };
  }

  // Check known corrections
  if (IATA_CORRECTIONS[upper]) {
    return { original: trimmed, corrected: IATA_CORRECTIONS[upper], was_corrected: true, correction_type: 'typo' };
  }

  // Check city name (Arabic or English)
  const lower = trimmed.toLowerCase();
  if (CITY_TO_IATA[lower] || CITY_TO_IATA[trimmed]) {
    const code = CITY_TO_IATA[lower] || CITY_TO_IATA[trimmed];
    return { original: trimmed, corrected: code, was_corrected: true, correction_type: 'city_name' };
  }

  // Fallback — return as-is but flag
  if (IATA_RE.test(upper)) {
    return { original: trimmed, corrected: upper, was_corrected: false };
  }

  return { original: trimmed, corrected: upper.slice(0, 3), was_corrected: true, correction_type: 'typo',
    suggestions: ['تأكد من رمز المطار الصحيح'] };
}

export function getNearbyAirports(iata: string): string[] {
  return NEARBY_AIRPORTS[iata.toUpperCase()] || [];
}

// ═══════════════════════════════════════════════════════════
// 2. FILTER RELAXATION ENGINE
// ═══════════════════════════════════════════════════════════

export interface RelaxationStep {
  level: number;
  description: string;
  filters: SearchFilters | undefined;
  params_override?: Partial<SearchParams>;
}

export function buildRelaxationCascade(originalFilters?: SearchFilters): RelaxationStep[] {
  const steps: RelaxationStep[] = [];

  // Level 0: Original filters
  steps.push({ level: 0, description: 'Original filters', filters: originalFilters });

  if (!originalFilters) return steps;

  // Level 1: Remove direct-only (max_stops)
  if (typeof originalFilters.max_stops === 'number' && originalFilters.max_stops === 0) {
    steps.push({ level: 1, description: 'Allow 1 stop', filters: { ...originalFilters, max_stops: 1 } });
  }

  // Level 2: Increase stops to 2
  if (typeof originalFilters.max_stops === 'number') {
    steps.push({ level: 2, description: 'Allow up to 2 stops', filters: { ...originalFilters, max_stops: 2 } });
  }

  // Level 3: Remove airline filter
  if (originalFilters.airlines && originalFilters.airlines.length > 0) {
    const relaxed = { ...originalFilters, airlines: undefined };
    steps.push({ level: 3, description: 'Remove airline filter', filters: relaxed as any });
  }

  // Level 4: Remove price cap
  if (typeof originalFilters.max_price === 'number') {
    const relaxed = { ...originalFilters, max_price: undefined, airlines: undefined };
    steps.push({ level: 4, description: 'Remove price cap', filters: relaxed as any });
  }

  // Level 5: Remove ALL filters
  steps.push({ level: 5, description: 'No filters (all results)', filters: undefined });

  return steps;
}

// ═══════════════════════════════════════════════════════════
// 3. TRUST ENGINE FAIL-OPEN
// ═══════════════════════════════════════════════════════════

/**
 * If Trust Engine rejected ALL results but raw data exists,
 * return top raw offers with warning labels instead of empty.
 */
export function failOpenTrustResults(
  rawOffers: NormalizedOffer[],
  trustRejected: number,
  trustReasons: Record<string, number>,
): { offers: NormalizedOffer[]; failOpen: boolean; warning: string } {
  if (rawOffers.length === 0) {
    return { offers: [], failOpen: false, warning: '' };
  }

  // Take top offers by price, apply safety labels
  const safeOffers = rawOffers
    .filter(o => o.price > 0 && o.depart && o.arrive) // Minimum safety
    .sort((a, b) => a.price - b.price)
    .slice(0, 15)
    .map(o => ({
      ...o,
      trust_level: 'estimated' as const,
      price_status: 'estimated' as const,
      bookable: false,
      reliability: 0.35,
    }));

  const topReasons = Object.entries(trustReasons)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([r]) => r)
    .join(', ');

  return {
    offers: safeOffers,
    failOpen: true,
    warning: `تم تخفيف معايير التحقق — ${trustRejected} رحلة لم تجتز التحقق الكامل (${topReasons}). الأسعار تقديرية.`,
  };
}

// ═══════════════════════════════════════════════════════════
// 4. SEARCH DIAGNOSTICS
// ═══════════════════════════════════════════════════════════

export interface SearchDiagnostics {
  request_id: string;
  route: string;
  input_validation: {
    origin: IATAValidation;
    destination: IATAValidation;
  };
  provider_results: {
    amadeus: { raw: number; normalized: number; error?: string };
    kiwi: { raw: number; normalized: number; error?: string };
    cloudfares: { raw: number; normalized: number; error?: string };
  };
  pipeline_counts: {
    raw_total: number;
    post_validation: number;
    post_trust: number;
    post_dedup: number;
    post_filters: number;
    final: number;
  };
  trust_rejection: {
    rejected: number;
    reasons: Record<string, number>;
    fail_open_used: boolean;
  };
  filter_relaxation: {
    original_filter_count: number;
    relaxation_level_used: number;
    relaxation_description: string;
  };
  fallback: {
    cascade_level: number;
    nearby_airports_tried: string[];
    alternate_search_used: boolean;
  };
  environment: {
    is_test: boolean;
    warning?: string;
  };
  recovery_mode: boolean;
}

let lastDiagnostics: SearchDiagnostics | null = null;

export function setDiagnostics(d: SearchDiagnostics): void { lastDiagnostics = d; }
export function getDiagnostics(): SearchDiagnostics | null { return lastDiagnostics; }

// ═══════════════════════════════════════════════════════════
// 5. TEST ENVIRONMENT PROTECTION
// ═══════════════════════════════════════════════════════════

// Known routes supported in Amadeus test environment
const TEST_ENV_ROUTES = new Set([
  'MAD-BCN', 'BCN-MAD', 'LON-PAR', 'PAR-LON', 'LHR-CDG', 'CDG-LHR',
  'JFK-LHR', 'LHR-JFK', 'SFO-LAX', 'LAX-SFO', 'NYC-LON', 'LON-NYC',
  'MAD-LHR', 'LHR-MAD', 'FCO-LHR', 'LHR-FCO',
]);

export function isTestEnvironment(): boolean {
  return Deno.env.get('AMADEUS_ENV') !== 'production';
}

export function getTestEnvWarning(origin: string, destination: string): string | null {
  if (!isTestEnvironment()) return null;

  const route = `${origin}-${destination}`;
  const reverseRoute = `${destination}-${origin}`;

  if (!TEST_ENV_ROUTES.has(route) && !TEST_ENV_ROUTES.has(reverseRoute)) {
    return `⚠️ بيئة الاختبار: المسار ${route} قد لا يكون مدعوماً في Amadeus Test. النتائج محدودة. Routes معروفة: MAD-BCN, JFK-LHR, LHR-CDG`;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// 6. FLEXIBLE DATE RECOVERY
// ═══════════════════════════════════════════════════════════

export interface AlternateDate {
  date: string;       // ISO date YYYY-MM-DD
  offset_days: number; // -3, -1, +1, +3
  label: string;
}

/** Generate ±1 and ±3 day alternate dates from the original */
export function generateAlternateDates(originalDate: string): AlternateDate[] {
  try {
    const base = new Date(originalDate);
    if (isNaN(base.getTime())) return [];

    const offsets = [-3, -1, 1, 3];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return offsets
      .map(offset => {
        const d = new Date(base);
        d.setDate(d.getDate() + offset);
        if (d < today) return null; // Skip past dates
        const iso = d.toISOString().slice(0, 10);
        const label = offset < 0 ? `قبل ${Math.abs(offset)} أيام` : `بعد ${offset} أيام`;
        return { date: iso, offset_days: offset, label };
      })
      .filter(Boolean) as AlternateDate[];
  } catch {
    return [];
  }
}

// ═══════════════════════════════════════════════════════════
// 7. NEARBY AIRPORT EXPANSION (Tiered Radius)
// ═══════════════════════════════════════════════════════════

export interface AirportTier {
  radius_km: number;
  airports: string[];
}

// Tiered nearby airports: 50km → 150km → 300km
const TIERED_NEARBY: Record<string, AirportTier[]> = {
  'JED': [
    { radius_km: 50,  airports: [] },
    { radius_km: 150, airports: ['TIF', 'YNB'] },
    { radius_km: 300, airports: ['MED'] },
  ],
  'RUH': [
    { radius_km: 50,  airports: [] },
    { radius_km: 150, airports: ['DMM'] },
    { radius_km: 300, airports: ['ELQ', 'AHB'] },
  ],
  'DXB': [
    { radius_km: 50,  airports: ['SHJ'] },
    { radius_km: 150, airports: ['AUH'] },
    { radius_km: 300, airports: ['RKT', 'DOH'] },
  ],
  'CAI': [
    { radius_km: 50,  airports: [] },
    { radius_km: 150, airports: ['HBE'] },
    { radius_km: 300, airports: ['SSH', 'HRG'] },
  ],
  'IST': [
    { radius_km: 50,  airports: ['SAW'] },
    { radius_km: 150, airports: [] },
    { radius_km: 300, airports: ['ESB'] },
  ],
  'LHR': [
    { radius_km: 50,  airports: ['LGW', 'STN', 'LTN'] },
    { radius_km: 150, airports: [] },
    { radius_km: 300, airports: [] },
  ],
  'JFK': [
    { radius_km: 50,  airports: ['EWR', 'LGA'] },
    { radius_km: 150, airports: [] },
    { radius_km: 300, airports: ['PHL'] },
  ],
  'CDG': [
    { radius_km: 50,  airports: ['ORY'] },
    { radius_km: 150, airports: [] },
    { radius_km: 300, airports: ['BRU'] },
  ],
  'DOH': [
    { radius_km: 50,  airports: [] },
    { radius_km: 150, airports: ['BAH'] },
    { radius_km: 300, airports: ['AUH', 'DXB'] },
  ],
  'KWI': [
    { radius_km: 50,  airports: [] },
    { radius_km: 150, airports: [] },
    { radius_km: 300, airports: ['BAH', 'DOH'] },
  ],
  'BGW': [
    { radius_km: 50,  airports: [] },
    { radius_km: 150, airports: ['NJF'] },
    { radius_km: 300, airports: ['BSR', 'EBL'] },
  ],
  'AMM': [
    { radius_km: 50,  airports: [] },
    { radius_km: 150, airports: [] },
    { radius_km: 300, airports: ['AQJ'] },
  ],
};

/** Get nearby airports within a given radius tier */
export function getAirportsByRadius(iata: string, maxRadiusKm: number): string[] {
  const tiers = TIERED_NEARBY[iata.toUpperCase()];
  if (!tiers) return NEARBY_AIRPORTS[iata.toUpperCase()] || [];

  const result: string[] = [];
  for (const tier of tiers) {
    if (tier.radius_km <= maxRadiusKm) {
      result.push(...tier.airports);
    }
  }
  return result;
}

/** Expand radius progressively: 50 → 150 → 300 */
export function expandAirportRadius(iata: string): Array<{ radius_km: number; airports: string[] }> {
  const radii = [50, 150, 300];
  return radii.map(r => ({
    radius_km: r,
    airports: getAirportsByRadius(iata, r),
  })).filter(r => r.airports.length > 0);
}

// ═══════════════════════════════════════════════════════════
// 8. RECOVERY RANKING + SCORING (Confidence Engine)
// ═══════════════════════════════════════════════════════════

export type RecoveryScore = 'exact' | 'relaxed' | 'recovered';

export const RECOVERY_CONFIDENCE: Record<string, number> = {
  'exact': 1.0,
  'relaxed': 0.85,
  'nearby': 0.70,
  'alternate-date': 0.60,
};

export interface RecoveryOffer {
  offer: NormalizedOffer;
  recovery_score: RecoveryScore;
  confidence: number;
  recovery_reason?: string;
  original_route: boolean;
  original_date: boolean;
}

/** Tag each offer with its recovery_score and confidence */
export function tagRecoveryScore(
  offers: NormalizedOffer[],
  score: RecoveryScore,
  type: 'exact' | 'relaxed' | 'nearby' | 'alternate-date',
  reason?: string,
  originalRoute = true,
  originalDate = true,
): NormalizedOffer[] {
  const confidence = RECOVERY_CONFIDENCE[type] || 0.5;
  return offers.map(offer => ({
    ...offer,
    _recoveryScore: score,
    _recoveryConfidence: confidence,
    _recoveryReason: reason,
    _isOriginalRoute: originalRoute,
    _isOriginalDate: originalDate,
  }));
}

/** Merge and rank recovery results: exact → relaxed → recovered */
export function mergeRecoveryResults(
  exact: NormalizedOffer[],
  relaxed: NormalizedOffer[],
  nearbyAirport: NormalizedOffer[],
  alternateDates: NormalizedOffer[],
): {
  merged: NormalizedOffer[];
  breakdown: { exact: number; relaxed: number; nearby: number; alternate_date: number };
  explainability: string[];
  analytics: {
    recovered: boolean;
    type?: 'exact' | 'relaxed' | 'nearby' | 'alternate-date';
    confidence: number;
  };
} {
  const explainability: string[] = [];

  // Tag each group with confidence
  const taggedExact = tagRecoveryScore(exact, 'exact', 'exact');
  const taggedRelaxed = tagRecoveryScore(relaxed, 'relaxed', 'relaxed', 'تم توسيع الفلاتر');
  const taggedNearby = tagRecoveryScore(nearbyAirport, 'recovered', 'nearby', 'من مطار قريب', false, true);
  const taggedDates = tagRecoveryScore(alternateDates, 'recovered', 'alternate-date', 'تاريخ بديل', true, false);

  // Build explainability messages
  if (exact.length > 0) {
    explainability.push(`${exact.length} رحلة مطابقة لبحثك الأصلي`);
  }
  if (relaxed.length > 0) {
    explainability.push(`${relaxed.length} رحلة إضافية بعد توسيع الفلاتر`);
  }
  if (nearbyAirport.length > 0) {
    explainability.push(`${nearbyAirport.length} رحلة من مطارات قريبة`);
  }
  if (alternateDates.length > 0) {
    explainability.push(`${alternateDates.length} رحلة في تواريخ بديلة`);
  }

  // Dedup across groups by offer ID, keeping highest confidence
  const seen = new Map<string, NormalizedOffer>();

  for (const group of [taggedExact, taggedRelaxed, taggedNearby, taggedDates]) {
    for (const o of group) {
      const existing = seen.get(o.id);
      if (!existing || (o as any)._recoveryConfidence > (existing as any)._recoveryConfidence) {
        seen.set(o.id, o);
      }
    }
  }

  const merged = Array.from(seen.values());
  const hasRecovered = exact.length === 0 && merged.length > 0;

  return {
    merged,
    breakdown: {
      exact: exact.length,
      relaxed: relaxed.length,
      nearby: nearbyAirport.length,
      alternate_date: alternateDates.length,
    },
    explainability,
    analytics: {
      recovered: hasRecovered,
      type: hasRecovered ? (relaxed.length > 0 ? 'relaxed' : nearbyAirport.length > 0 ? 'nearby' : 'alternate-date') : 'exact',
      confidence: hasRecovered ? Math.max(...merged.map(o => (o as any)._recoveryConfidence || 0)) : 1.0,
    }
  };
}

// ═══════════════════════════════════════════════════════════
// 9. RECOVERY EXPLAINABILITY
// ═══════════════════════════════════════════════════════════

export function buildRecoveryExplanation(
  breakdown: { exact: number; relaxed: number; nearby: number; alternate_date: number },
): string {
  const parts: string[] = [];

  if (breakdown.exact === 0 && (breakdown.relaxed > 0 || breakdown.nearby > 0 || breakdown.alternate_date > 0)) {
    parts.push('وسّعنا البحث تلقائياً لإيجاد خيارات أكثر');
  }

  if (breakdown.relaxed > 0 && breakdown.exact === 0) {
    parts.push('تم تخفيف بعض الفلاتر');
  }

  if (breakdown.nearby > 0) {
    parts.push('تم تضمين مطارات قريبة');
  }

  if (breakdown.alternate_date > 0) {
    parts.push('تم تضمين تواريخ بديلة');
  }

  return parts.length > 0 ? parts.join(' • ') : '';
}

/** Build the full recovery context for the API response */
export interface RecoveryContext {
  recovery_used: boolean;
  recovery_explanation: string;
  recovery_breakdown: { exact: number; relaxed: number; nearby: number; alternate_date: number };
  alternate_dates: AlternateDate[];
  nearby_airports_expanded: Array<{ radius_km: number; airports: string[] }>;
  explainability_messages: string[];
}
