// src/types/index.ts

export interface Flight {
  id: string;
  airline: string;
  airlineCode?: string;
  airlineLogo?: string;
  departureTime: string;
  arrivalTime: string;
  origin: string;
  destination: string;
  duration: string;
  price: number;
  currency: string;
  stops: number;
  is_bookable?: boolean;
  segments?: FlightSegment[];
}

export interface FlightSegment {
  airline_code: string;
  airline_name: string;
  flight_number: string;
  departure_airport: string;
  arrival_airport: string;
  departure_time: string;
  arrival_time: string;
  duration: number;
  cabin_class: string;
}

export type FlightOffer = Flight;

export interface Hotel {
  hotelId: number;
  name: string;
  image: string;
  stars: number;
  rating: number;
  reviewsCount: number;
  price: string;
  provider?: string;
  location?: string;
}

export type HotelOffer = Hotel;

export interface SearchProgressResponse {
  status: 'pending' | 'completed' | 'error' | 'ready_for_integration';
  progress: number;
  offers: Flight[];
  total?: number;
  message?: string;
}
