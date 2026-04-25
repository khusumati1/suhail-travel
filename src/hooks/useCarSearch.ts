import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface CarDestination {
  id: string;
  name: string;
  city: string;
  country: string;
  type: string;
  coordinates: { latitude: number; longitude: number } | null;
  label: string;
}

export interface CarResult {
  id: string;
  vehicleName: string;
  vehicleGroup: string;
  vehicleType: string;
  imageUrl: string | null;
  supplier: string;
  supplierLogo: string | null;
  supplierRating: number | null;
  price: number | null;
  priceFormatted: string | null;
  currency: string;
  transmission: string;
  fuelPolicy: string;
  seats: number | null;
  doors: number | null;
  bags: number | null;
  airConditioning: boolean;
  mileage: string;
  pickUpLocation: string;
  dropOffLocation: string;
  freeCancellation: boolean;
}

export interface CarSearchParams {
  pick_up_latitude: number;
  pick_up_longitude: number;
  drop_off_latitude?: number;
  drop_off_longitude?: number;
  pick_up_date: string;
  drop_off_date: string;
  pick_up_time?: string;
  drop_off_time?: string;
  driver_age?: number;
  currency?: string;
}

export function useCarSearch() {
  const [cars, setCars] = useState<CarResult[]>([]);
  const [destinations, setDestinations] = useState<CarDestination[]>([]);
  const [loading, setLoading] = useState(false);
  const [destinationsLoading, setDestinationsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchDestinations = async (query: string) => {
    setDestinationsLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-cars', {
        body: { action: 'destinations', query },
      });
      if (fnError) throw new Error(fnError.message || 'فشل البحث عن المواقع');
      if (data?.error) throw new Error(data.error);
      setDestinations(data?.destinations || []);
      return data?.destinations || [];
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء البحث');
      return [];
    } finally {
      setDestinationsLoading(false);
    }
  };

  const searchCars = async (params: CarSearchParams) => {
    setLoading(true);
    setError(null);
    setCars([]);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('search-cars', {
        body: { action: 'search', ...params },
      });
      if (fnError) throw new Error(fnError.message || 'فشل البحث عن السيارات');
      if (data?.error) throw new Error(data.error);
      setCars(data?.cars || []);
      return data?.cars || [];
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء البحث');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { cars, destinations, loading, destinationsLoading, error, searchDestinations, searchCars };
}
