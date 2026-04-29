// src/services/flightService.ts
import axios from 'axios';
import { supabase } from "@/integrations/supabase/client";
import {
  BRKSearchRequest,
  BRKSearchInitResponse,
  BRKSearchProgressResponse,
  BRKFlightOffer,
  BRKBookingRequest,
  BRKBookingResponse
} from '../types/flight';

class FlightService {
  /**
   * Refactored to use local scraper service instead of Supabase Edge Function
   */
  async initSearch(payload: any): Promise<any> {
    console.log('[FlightService] Redirecting search to local scraper...');

    const scraperPayload = {
      origin: payload.origin || payload.from_flight,
      destination: payload.destination || payload.to_flight,
      date: payload.departure_date || payload.date_flight
    };

    const SCRAPER_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
    const response = await axios.post(`${SCRAPER_BASE_URL}/api/scrape-flights`, scraperPayload);

    // Normalize response to maintain compatibility with older BRK-style hooks if needed
    return {
      job_id: response.data.sessionId || 'local-session',
      status: 'completed',
      offers: response.data.data
    };
  }

  async pollSearch(jobId: string): Promise<BRKSearchProgressResponse> {
    // The new scraper is synchronous/polling-internal, so we return completed
    return {
      status: 'completed',
      progress: 100,
      results: [],
      job_id: jobId
    };
  }

  async getOffer(flightKey: string): Promise<BRKFlightOffer> {
    throw new Error("Direct offer retrieval pending scraper integration.");
  }

  async holdBooking(payload: BRKBookingRequest): Promise<BRKBookingResponse> {
    // Booking still uses Supabase for now as requested
    const { data, error } = await supabase.functions.invoke('book-flight', {
      body: payload
    });
    if (error) throw error;
    return data;
  }

  async confirmBooking(payload: BRKBookingRequest): Promise<BRKBookingResponse> {
    return this.holdBooking(payload);
  }
}

export const flightService = new FlightService();
