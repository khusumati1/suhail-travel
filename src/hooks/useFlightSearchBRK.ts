// src/hooks/useFlightSearchBRK.ts
import { useState, useCallback } from 'react';
import { flightService } from '../services/flightService';
import { 
  BRKFlightOffer, 
  BRKSearchRequest 
} from '../types/flight';

export const useFlightSearchBRK = () => {
  const [results, setResults] = useState<BRKFlightOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const startSearch = useCallback(async (params: BRKSearchRequest) => {
    setLoading(true);
    setError(null);
    setResults([]);
    setProgress(10);

    try {
      const initRes = await flightService.initSearch(params);
      
      // Since we refactored the service to be direct for now
      // we just simulate a quick finish or wait for the actual implementation
      setProgress(100);
      setResults([]);
      setLoading(false);
    } catch (err: any) {
      console.error('Search error:', err);
      setLoading(false);
      setError(err.message || 'Failed to start flight search');
    }
  }, []);

  return {
    results,
    loading,
    progress,
    error,
    startSearch,
    stopPolling: () => {},
  };
};
