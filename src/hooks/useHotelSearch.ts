import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface HotelRegion {
  gaiaId: string;
  type: string;
  regionNames: {
    displayName: string;
    primaryDisplayName: string;
    secondaryDisplayName: string;
    shortName: string;
  };
  coordinates?: { lat: string; long: string };
  hierarchyInfo?: any;
}

export interface HotelResult {
  id: string;
  name: string;
  propertyImage: string | null;
  reviewScore: number;
  reviewCount: number;
  price: number | null;
  priceFormatted: string | null;
  currency: string;
  strikethroughPrice: string | null;
  neighborhood: string | null;
  address?: string;
  lat?: number;
  lon?: number;
  city?: string;
  rawContact?: any;
  star: number | null;
  destinationInfo: any;
}

export interface HotelSearchParams {
  regionId: string;
  checkin: string;
  checkout: string;
  adults?: number;
  children?: number[];
  currency?: string;
  sort?: string;
  cityName?: string;
}

const searchCache = new Map<string, HotelResult[]>();
const regionCache = new Map<string, HotelRegion[]>();

export function useHotelSearch() {
  const [hotels, setHotels] = useState<HotelResult[]>([]);
  const [regions, setRegions] = useState<HotelRegion[]>([]);
  const [loading, setLoading] = useState(false);
  const [regionsLoading, setRegionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchRegions = async (query: string) => {
    if (!query) return [];
    
    // Check cache first
    const cacheKey = `region_${query.toLowerCase()}`;
    if (regionCache.has(cacheKey)) {
      const cached = regionCache.get(cacheKey)!;
      setRegions(cached);
      return cached;
    }

    setRegionsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-hotels', {
        body: { action: 'regions', query },
      });
      if (fnError) throw new Error(fnError.message || 'فشل البحث عن المناطق');
      if (data?.error) throw new Error(data.error);
      
      const results = data?.regions || [];
      regionCache.set(cacheKey, results); // save to cache
      setRegions(results);
      return results;
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء البحث');
      return [];
    } finally {
      setRegionsLoading(false);
    }
  };

  const searchHotels = async (params: HotelSearchParams) => {
    // Generate cache key based on params
    const cacheKey = `search_${params.regionId || ''}_${params.cityName || ''}_${params.checkin}_${params.checkout}_${params.adults || 2}`;
    
    if (searchCache.has(cacheKey)) {
      const cached = searchCache.get(cacheKey)!;
      setHotels(cached);
      return cached;
    }

    setLoading(true);
    setError(null);
    setHotels([]);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-hotels', {
        body: { action: 'search', ...params },
      });
      if (fnError) throw new Error(fnError.message || 'فشل البحث عن الفنادق');
      if (data?.error) throw new Error(data.error);
      
      const results = data?.hotels || [];
      searchCache.set(cacheKey, results); // save to cache
      setHotels(results);
      return results;
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء البحث');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { hotels, regions, loading, regionsLoading, error, searchRegions, searchHotels };
}
