// supabase/functions/search-flights/utils.ts
// ─────────────────────────────────────────────────────────
// Flight Data Normalization, Validation, Dedup (Production)
// ─────────────────────────────────────────────────────────
import { NormalizedOffer, FlightSegment } from "./types.ts";

// ── Duration Parsing ──

function parseIsoDurationToMinutes(iso: string): number {
  if (!iso || typeof iso !== "string") return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) return 0;
  return (parseInt(match[1] || "0", 10) * 60) + parseInt(match[2] || "0", 10);
}

function toDurationMinutes(raw: any): number {
  if (typeof raw === "number") {
    return raw > 600 ? Math.round(raw / 60) : raw;
  }
  if (typeof raw === "string") return parseIsoDurationToMinutes(raw);
  return 0;
}

function toIsoString(raw: any): string {
  if (!raw || typeof raw !== "string") return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw;
  return raw;
}

// ── Amadeus Normalizer (preserves _rawOffer for Pricing API) ──

export function normalizeFlightOffer(
  offer: any,
  ctx: {
    origin: string;
    destination: string;
    carriers: Record<string, string>;
    aircraftMap: Record<string, string>;
    cabin_class?: string;
  },
): NormalizedOffer {
  const firstItinerary = offer.itineraries?.[0];
  const segmentsRaw = firstItinerary?.segments ?? [];
  const firstSegment = segmentsRaw[0];
  const lastSegment = segmentsRaw[segmentsRaw.length - 1];

  const carrierCode =
    firstSegment?.carrierCode ||
    offer.validatingAirlineCodes?.[0] ||
    '';

  const airlineName =
    ctx.carriers[carrierCode] ||
    carrierCode ||
    'Unknown Airline';

  const fromIata =
    firstSegment?.departure?.iataCode ||
    ctx.origin;

  const toIata =
    lastSegment?.arrival?.iataCode ||
    ctx.destination;

  const cabin =
    offer.travelerPricings?.[0]?.fareDetailsBySegment?.[0]?.cabin?.toLowerCase() ||
    ctx.cabin_class?.toLowerCase() ||
    'economy';

  const segments: FlightSegment[] = segmentsRaw.map((seg: any) => ({
    carrier: ctx.carriers[seg.carrierCode] || seg.carrierCode,
    flight_number: `${seg.carrierCode}${seg.number}`,
    aircraft: ctx.aircraftMap[seg.aircraft?.code] || seg.aircraft?.code || "",
    origin: seg.departure?.iataCode,
    destination: seg.arrival?.iataCode,
    departing_at: seg.departure?.at,
    arriving_at: seg.arrival?.at,
    duration: seg.duration || "",
  }));

  const price = Number(offer.price?.total ?? 0);

  return {
    id: offer.id,
    airline: airlineName,
    airline_logo: carrierCode
      ? `https://images.kiwi.com/airlines/64/${carrierCode}.png`
      : '',
    from: fromIata,
    to: toIata,
    depart: toIsoString(firstSegment?.departure?.at),
    arrive: toIsoString(lastSegment?.arrival?.at),
    duration: toDurationMinutes(firstItinerary?.duration),
    price,
    estimated_price: price,
    currency: offer.price?.currency || 'USD',
    price_status: 'estimated',
    trust_level: 'estimated',
    reliability: 0.70,
    bookable: false,             // ★ HARD RULE: false until Pricing API confirms
    stops: Math.max(0, segments.length - 1),
    cabin_class: cabin,
    segments,
    source: 'amadeus',
    _carrierCode: carrierCode,
    _rawOffer: offer,  // ★ Preserved for Pricing API — stripped before response
  };
}

// ── Validation (STRICT) ──

export function isValidOffer(offer: NormalizedOffer): boolean {
  if (typeof offer.price !== "number" || isNaN(offer.price) || offer.price <= 0) return false;
  if (!offer.depart || !offer.arrive) return false;

  const validSources: string[] = ['amadeus', 'kiwi', 'cloudfares'];
  if (!validSources.includes(offer.source)) return false;

  return true;
}

// ── Deduplication ──

export function deduplicateOffers(
  offers: NormalizedOffer[],
): NormalizedOffer[] {
  const seen = new Map<string, NormalizedOffer>();

  for (const o of offers) {
    const carrier = o._carrierCode || 'UNKNOWN';
    const key = `${carrier}-${o.depart}-${o.arrive}`;

    const existing = seen.get(key);
    const currentPrice = o.price || Infinity;
    const existingPrice = existing?.price || Infinity;

    if (!existing || currentPrice < existingPrice) {
      seen.set(key, o);
    }
  }

  return Array.from(seen.values());
}

// ── Market Data Annotation ──

export function annotateWithMarketData(
  offers: NormalizedOffer[],
  kiwiOffers: NormalizedOffer[]
): NormalizedOffer[] {
  if (kiwiOffers.length === 0) return offers;

  return offers.map(offer => {
    if (offer.source === 'kiwi') return offer;

    const match = kiwiOffers.find(k => {
      const sameAirline = k._carrierCode === offer._carrierCode;
      if (!sameAirline) return false;

      const offerTime = new Date(offer.depart).getTime();
      const kiwiTime = new Date(k.depart).getTime();
      const diffMinutes = Math.abs(offerTime - kiwiTime) / (1000 * 60);

      return diffMinutes <= 30;
    });

    if (match) {
      return {
        ...offer,
        market_price: match.price,
        market_source: 'kiwi'
      };
    }

    return offer;
  });
}

// ── Strip Internal Fields (before sending to client) ──

export function stripInternalFields(offer: NormalizedOffer): Omit<NormalizedOffer, '_rawOffer' | '_carrierCode'> {
  const { _rawOffer, _carrierCode, ...clean } = offer;
  return clean;
}
