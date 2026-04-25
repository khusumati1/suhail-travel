import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAuthHeaders } from '@/lib/supabaseClient';
import { fallbackFlights } from '@/lib/fallbackData';

export interface DuffelOffer {
  id: string;
  airline: string;
  airline_logo?: string;
  from: string;
  to: string;
  from_city: string;
  to_city: string;
  depart: string;
  arrive: string;
  duration: string;
  price: string;
  currency: string;
  stops: number;
  cabin_class: string;
  segments: {
    carrier: string;
    flight_number: string;
    aircraft?: string;
    origin: string;
    destination: string;
    departing_at: string;
    arriving_at: string;
    duration: string;
  }[];
}

export interface SearchParams {
  origin: string;
  destination: string;
  departure_date: string;
  return_date?: string;
  passengers: {
    adults: number;
    children: number;
    infants: number;
  };
  cabin_class: string;
}

const IRANIAN_AIRPORTS = [
  'IKA', 'THR', 'MHD', 'SYZ', 'TBZ', 'IFN', 'AWZ', 'BND', 'KIH', 'GSM', 
  'ABD', 'KSH', 'OMH', 'SARI', 'RAS', 'RZR', 'BXR', 'ZBR'
];

export function useFlightSearch() {
  const [offers, setOffers] = useState<DuffelOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);

  const searchFlights = async (params: SearchParams) => {
    setLoading(true);
    setError(null);
    setOffers([]);
    setIsSimulated(false);

    const origin = params.origin?.toUpperCase() || '';
    const dest = params.destination?.toUpperCase() || '';

    if (IRANIAN_AIRPORTS.includes(origin) || IRANIAN_AIRPORTS.includes(dest)) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setLoading(false);
      setError('الطيران متوقف في الخطوط الأيرانية حالياً');
      setOffers([]);
      return [];
    }

    try {
      const authHeaders = await getAuthHeaders();
      const { data, error: fnError } = await supabase.functions.invoke('search-flights', {
        body: params,
        headers: authHeaders,
      });

      if (fnError || data?.error) {
        if (fallbackFlights && fallbackFlights.length > 0) {
          setOffers(fallbackFlights as any);
          setError('استخدام بيانات احتياطية بسبب خطأ في الاتصال');
          setIsSimulated(true);
          return fallbackFlights as any;
        } else {
          setOffers([]);
          setError(null);
          return [];
        }
      }

      setOffers(data?.offers || []);
      setIsSimulated(!!data?.simulated);
      return data?.offers || [];
    } catch (err: any) {
      if (fallbackFlights && fallbackFlights.length > 0) {
        setOffers(fallbackFlights as any);
        setError('حدث خطأ أثناء البحث. تم استخدام بيانات احتياطية.');
        setIsSimulated(true);
        return fallbackFlights as any;
      } else {
        setOffers([]);
        setError(null);
        return [];
      }
    } finally {
      setLoading(false);
    }
  };

  return { offers, loading, error, isSimulated, searchFlights };
}
