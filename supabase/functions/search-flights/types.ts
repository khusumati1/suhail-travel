// supabase/functions/search-flights/types.ts

export interface NormalizedOffer {
  id: string;
  airline: string;
  airline_logo: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  duration: string;
  price: string;
  currency: string;
  stops: number;
  cabin_class: string;
  segments: FlightSegment[];
  source: string;
  market_price?: string;
  market_source?: string;
  _carrierCode?: string;
}

export interface FlightSegment {
  carrier: string;
  flight_number: string;
  aircraft: string;
  origin: string;
  destination: string;
  departing_at: string;
  arriving_at: string;
  duration: string;
}

export interface SearchParams {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  passengers?: {
    adults?: number;
    children?: number;
    infants?: number;
  };
  cabin_class?: string;
}

export interface AmadeusAuthResponse {
  access_token: string;
  expires_in: number;
}
