// supabase/functions/_shared/flightUtils.ts
/** Utility functions for flight data pipeline */

export interface NormalizedOffer {
  id: string;
  airline: string;
  airline_logo: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  duration: string;
  price: string; // string with 2 decimals
  currency: string;
  stops: number;
  cabin_class: string;
  segments: any[];
  // internal only, not exposed in API response
  _carrierCode?: string;
}

/** Normalize raw Amadeus offer into UI-ready object */
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
    'Unknown';

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

  const segments = segmentsRaw.map((seg: any) => ({
    carrier: ctx.carriers[seg.carrierCode] || seg.carrierCode,
    flight_number: `${seg.carrierCode}${seg.number}`,
    aircraft: ctx.aircraftMap[seg.aircraft?.code] || seg.aircraft?.code,
    origin: seg.departure?.iataCode,
    destination: seg.arrival?.iataCode,
    departing_at: seg.departure?.at,
    arriving_at: seg.arrival?.at,
    duration: seg.duration,
  }));

  return {
    id: offer.id,
    airline: airlineName,
    airline_logo: carrierCode
      ? `https://images.kiwi.com/airlines/64/${carrierCode}.png`
      : '',
    from: fromIata,
    to: toIata,
    depart: firstSegment?.departure?.at || '',
    arrive: lastSegment?.arrival?.at || '',
    duration: firstItinerary?.duration || '',
    price: Number(offer.price?.total ?? 0).toFixed(2),
    currency: offer.price?.currency || 'USD',
    stops: Math.max(0, (segments.length || 1) - 1),
    cabin_class: cabin,
    segments,
    _carrierCode: carrierCode,
  };
}

/** Validate a normalized offer */
export function isValidOffer(offer: NormalizedOffer): boolean {
  const priceNum = Number(offer.price);
  if (priceNum <= 0) return false;
  if (!offer.depart || !offer.arrive) return false;

  // ISO comparison works
  return offer.depart < offer.arrive;
}

/** Deduplicate offers – keep the cheapest flight and avoid key collisions */
export function deduplicateOffers(
  offers: NormalizedOffer[],
): NormalizedOffer[] {
  const seen = new Map<string, NormalizedOffer>();

  for (const o of offers) {
    const carrier = o._carrierCode || 'UNKNOWN';
    const key = `${carrier}-${o.depart}-${o.arrive}`;

    const existing = seen.get(key);

    const currentPrice = Number(o.price) || Infinity;
    const existingPrice = Number(existing?.price) || Infinity;

    if (!existing || currentPrice < existingPrice) {
      seen.set(key, o);
    }
  }

  return Array.from(seen.values());
}
