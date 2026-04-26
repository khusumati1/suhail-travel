// supabase/functions/search-flights/utils.ts
import { NormalizedOffer, FlightSegment } from "./types.ts";

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
    stops: Math.max(0, segments.length - 1),
    cabin_class: cabin,
    segments,
    source: 'amadeus',
    _carrierCode: carrierCode,
  };
}

export function isValidOffer(offer: NormalizedOffer): boolean {
  const priceNum = Number(offer.price);
  if (isNaN(priceNum) || priceNum <= 0) return false;
  if (!offer.depart || !offer.arrive) return false;
  
  // Enforce strict real-world source validation
  const validSources = ['amadeus', 'kiwi'];
  if (!validSources.includes(offer.source)) return false;
  
  return true; 
}

export function deduplicateOffers(
  offers: NormalizedOffer[],
): NormalizedOffer[] {
  const seen = new Map<string, NormalizedOffer>();

  for (const o of offers) {
    const carrier = o._carrierCode || 'UNKNOWN';
    // Key based on carrier, departure time, and arrival time to identify the same flight
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

export function normalizeKiwiOffer(o: any): NormalizedOffer {
  return {
    id: `kiwi-${crypto.randomUUID()}`,
    airline: o.airline || 'Unknown',
    airline_logo: o.airline ? `https://images.kiwi.com/airlines/64/${o.airline}.png` : '',
    from: o.from || '',
    to: o.to || '',
    depart: o.depart || '',
    arrive: o.arrive || '',
    duration: '', // Kiwi format varies
    price: Number(o.price || 0).toFixed(2),
    currency: 'USD',
    stops: 0, // Simplified
    cabin_class: 'economy',
    segments: [],
    source: 'kiwi',
    _carrierCode: o.airline
  };
}

export function annotateWithMarketData(
  offers: NormalizedOffer[],
  kiwiOffers: NormalizedOffer[]
): NormalizedOffer[] {
  if (kiwiOffers.length === 0) return offers;

  return offers.map(offer => {
    if (offer.source === 'kiwi') return offer; // Don't compare kiwi with itself
    
    const match = kiwiOffers.find(k => {
      const sameAirline = k._carrierCode === offer._carrierCode;
      if (!sameAirline) return false;

      const amadeusTime = new Date(offer.depart).getTime();
      const kiwiTime = new Date(k.depart).getTime();
      const diffMinutes = Math.abs(amadeusTime - kiwiTime) / (1000 * 60);
      
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
