// src/hooks/useFlightSearch.ts
import { useState, useCallback } from 'react';
import { apiService } from '../services/apiService';
import { FlightOffer } from '../types';

export interface SearchParams {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  passengers?: {
    adults: number;
    children: number;
    infants: number;
  };
  cabin_class?: string;
}

export function useFlightSearch() {
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const searchFlights = useCallback(async (params: SearchParams) => {
    setLoading(true);
    setError(null);
    setOffers([]);
    setProgress(10); // Start progress

    try {
      // Direct call to our cleaned Edge Function
      const data = await apiService.searchFlights(params);
      
      setProgress(100);
      setOffers(data.offers || []);
      setLoading(false);
    } catch (err: any) {
      console.error('Search error:', err);
      setLoading(false);
      setError(err.message || 'Failed to search flights');
    }
  }, []);

  return {
    offers,
    loading,
    progress,
    error,
    searchFlights,
  };
}
