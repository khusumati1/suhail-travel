// src/types/flight.ts
import { Flight, FlightSegment } from './index';

export type BRKFlightOffer = Flight;
export type BRKFlightSegment = FlightSegment;

export interface BRKSearchRequest {
  from_flight: string;
  to_flight: string;
  date_flight: string;
  return_date: string;
  adult: number;
  child: number;
  infant: number;
}

export interface BRKSearchInitResponse {
  job_id: string;
  status: string;
}

export interface BRKSearchProgressResponse {
  status: 'pending' | 'completed' | 'error' | 'ready_for_integration';
  progress: number;
  results: BRKFlightOffer[];
  job_id: string;
}

export interface BRKBookingRequest {
  key: string;
  contact_email: string;
  contact_phone: string;
  passengers: BRKPassenger[];
}

export interface BRKBookingResponse {
  booking_id: string;
  status: string;
  pnr?: string;
  message?: string;
}

export interface BRKPassenger {
  type: 'ADT' | 'CHD' | 'INF';
  first_name: string;
  last_name: string;
  birth_date: string;
  document: {
    type: 'passport';
    number: string;
    country: string;
    expiry_date: string;
  };
}
