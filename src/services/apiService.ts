// src/services/apiService.ts
import axios, { AxiosError } from 'axios';
import { supabase } from "@/integrations/supabase/client";
import { FlightOffer, HotelOffer } from '../types';

// Standardized response shape returned by searchHotels so callers
// can always inspect `success` without worrying about thrown exceptions.
export interface HotelSearchResult {
  success: boolean;
  data: HotelOffer[];
  errorMessage?: string;
}

const SCRAPER_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

class ApiService {
  async searchFlights(params: any) {
    console.log('[ApiService] Initiating flight search via local scraper:', params);

    // Construct the payload as required by the scraper-service
    const payload = {
      origin: params.origin,
      destination: params.destination,
      date: params.departure_date
    };

    try {
      // Direct call to the local scraper service
      const response = await axios.post(`${SCRAPER_BASE_URL}/api/scrape-flights`, payload);

      console.log('[ApiService] Scraper response received:', response.data);

      // Profit Margin Configuration (Change this number to adjust your commission)
      const PROFIT_MARGIN = 1.10; // 10% Markup

      const markedUpOffers = (response.data.data || []).map((flight: any) => ({
        ...flight,
        price: Math.ceil(flight.price * PROFIT_MARGIN)
      }));

      return {
        offers: markedUpOffers
      };
    } catch (error) {
      console.error('[ApiService] Error fetching from local scraper:', error);
      throw new Error('Failed to fetch real-time flights from scraper service.');
    }
  }

  async searchHotels(params: any): Promise<HotelSearchResult> {
    try {
      console.log('[ApiService] Fetching hotels from scraper...', params);
      const response = await axios.post(`${SCRAPER_BASE_URL}/api/scrape-hotels`, {
        cityName: params.city || params.location,
        cityId: params.cityId || null,
        countryId: params.countryId || 17,
        checkIn: params.checkIn,
        checkOut: params.checkOut,
        adultsCount: params.adults || 2,
        childrenAges: params.childrenAges || []
      });

      const body = response.data;
      console.log('[ApiService] Hotels response:', body);

      // Backend explicitly signals failure (e.g. geo-resolution or upstream error)
      if (body.success === false) {
        console.warn('[ApiService] Backend returned success=false:', body.message);
        return {
          success: false,
          data: [],
          errorMessage: body.message || 'Failed to fetch hotel data from the server.'
        };
      }

      // Apply the same 10% profit margin as flights
      const PROFIT_MARGIN = 1.10;
      const hotels: HotelOffer[] = (body.data?.hotels || []).map((h: any) => ({
        ...h,
        price: typeof h.price === 'string'
          ? (parseInt(h.price.replace(/,/g, ''), 10) * PROFIT_MARGIN).toLocaleString()
          : (h.price * PROFIT_MARGIN).toLocaleString()
      }));

      return { success: true, data: hotels };
    } catch (error) {
      const axiosErr = error as AxiosError<any>;
      // Extract the structured error body returned by our 502 endpoint, if available
      const serverMessage =
        axiosErr.response?.data?.message ||
        axiosErr.response?.data?.error ||
        axiosErr.message ||
        'Network error – please check your connection.';

      console.error('[ApiService] Hotel search failed:', serverMessage);
      return {
        success: false,
        data: [],
        errorMessage: serverMessage
      };
    }
  }

  async getHotelRegions(query: string) {
    const { data, error } = await supabase.functions.invoke('search-hotels', {
      body: { action: 'regions', query }
    });

    if (error) throw error;
    return data.regions || [];
  }

  async fetchHotelDetails(payload: any) {
    try {
      const response = await axios.post(`${SCRAPER_BASE_URL}/api/hotel-details`, payload);
      // response.data contains description, rating, images, rooms
      return response.data;
    } catch (error) {
      console.error('[ApiService] Error fetching hotel details:', error);
      return {
        success: false,
        errorMessage: 'Failed to fetch hotel details. Please try again later.'
      };
    }
  }

  async getHotelDetails(locationId: string) {
    const { data, error } = await supabase.functions.invoke('search-hotels', {
      body: { locationId }
    });

    if (error) throw error;
    return data.hotel;
  }

  async createBooking(payload: any) {
    try {
      const response = await axios.post(`${SCRAPER_BASE_URL}/api/create-booking`, payload);
      return response.data;
    } catch (error) {
      console.error('[ApiService] Error creating booking:', error);
      throw new Error('Failed to create booking on the server.');
    }
  }

  async getBookings() {
    try {
      const response = await axios.get(`${SCRAPER_BASE_URL}/api/bookings`);
      return response.data;
    } catch (error) {
      console.error('[ApiService] Error fetching bookings:', error);
      return { success: false, data: [] };
    }
  }
}

export const apiService = new ApiService();
