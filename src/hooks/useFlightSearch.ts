import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAuthHeaders } from '@/lib/supabaseClient';

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

  const searchFlights = async (params: SearchParams) => {
    setLoading(true);
    setError(null);
    setOffers([]);

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
      const { data: { session } } = await supabase.auth.getSession();
      console.log("Auth mode:", session ? "USER" : "GUEST");

      const authHeaders = await getAuthHeaders();
      const { data, error: fnError } = await supabase.functions.invoke('search-flights', {
        body: params,
        headers: authHeaders,
      });

      if (fnError || data?.error || data?.status === 'error') {
        // Priority: detailed message > function error > generic error
        const errorMsg = data?.message || fnError?.message || data?.error || 'حدث خطأ في جلب البيانات';
        setOffers([]);
        setError(errorMsg);
        return [];
      }

      setOffers(data?.offers || []);
      return data?.offers || [];
    } catch (err: any) {
      setOffers([]);
      setError(err.message || 'حدث خطأ غير متوقع');
      return [];
    } finally {
      setLoading(false);
    }
  };

  return { offers, loading, error, searchFlights };
}
