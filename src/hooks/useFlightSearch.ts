import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { getAuthHeaders } from '@/lib/supabaseClient';

// ── Production Flight Offer Type ──

export interface FlightOffer {
  id: string;
  airline: string;
  airline_logo: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  duration: number;

  price: number;
  estimated_price: number;
  confirmed_price?: number;
  taxes?: number;
  currency: string;
  price_status: "estimated" | "confirmed" | "price_changed";

  trust_level: "verified" | "estimated";

  stops: number;
  cabin_class: string;
  segments: {
    carrier: string;
    flight_number: string;
    aircraft: string;
    origin: string;
    destination: string;
    departing_at: string;
    arriving_at: string;
    duration: string;
  }[];

  source: "amadeus" | "kiwi" | "cloudfares";
  label?: "cheapest" | "fastest" | "best";

  reliability?: number;
  bookable: boolean;

  fare_rules?: {
    refundable: boolean;
    changeable: boolean;
    penalties?: string;
    baggage?: string;
  };

  market_price?: number;
  market_source?: string;
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

export interface SearchMetrics {
  latency_ms: number;
  trust_rejected: number;
  price_confirmed: number;
  price_changed: number;
  providers: { amadeus: number; kiwi: number; cloudfares: number };
  cost?: {
    search_calls: number;
    pricing_calls: number;
    pricing_cached: number;
    pricing_failed: number;
    total_api_calls: number;
    redis_hits: number;
  };
}

const IRANIAN_AIRPORTS = [
  'IKA', 'THR', 'MHD', 'SYZ', 'TBZ', 'IFN', 'AWZ', 'BND', 'KIH', 'GSM',
  'ABD', 'KSH', 'OMH', 'SARI', 'RAS', 'RZR', 'BXR', 'ZBR'
];

export function useFlightSearch() {
  const [offers, setOffers] = useState<FlightOffer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<SearchMetrics | null>(null);
  const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());

  const searchFlights = async (params: SearchParams) => {
    setLoading(true);
    setError(null);
    setOffers([]);
    setMetrics(null);

    const origin = params.origin?.toUpperCase() || '';
    const dest = params.destination?.toUpperCase() || '';

    if (IRANIAN_AIRPORTS.includes(origin) || IRANIAN_AIRPORTS.includes(dest)) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setLoading(false);
      setError('الطيران متوقف في الخطوط الأيرانية حالياً');
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
        const errorMsg = data?.message || fnError?.message || data?.error || 'حدث خطأ في جلب البيانات';
        setError(errorMsg);
        return [];
      }

      const results = data?.offers || [];
      setOffers(results);
      setMetrics(data?.metrics || null);

      if (data?.metrics) {
        const m = data.metrics;
        console.log(`[Flight Engine] ${results.length} flights | ${m.price_confirmed} confirmed | ${m.price_changed} changed | ${m.trust_rejected} rejected | Cost: ${m.cost?.total_api_calls || '?'} API calls (${m.cost?.pricing_cached || 0} cached)`);
      }

      return results;
    } catch (err: any) {
      setError(err.message || 'حدث خطأ غير متوقع');
      return [];
    } finally {
      setLoading(false);
    }
  };

  // ── Lazy Confirm: Confirm price for a single flight on demand ──
  const confirmFlightPrice = useCallback(async (offerId: string): Promise<FlightOffer | null> => {
    if (confirmingIds.has(offerId)) return null; // Already confirming

    setConfirmingIds(prev => new Set(prev).add(offerId));

    try {
      const authHeaders = await getAuthHeaders();
      const { data, error: fnError } = await supabase.functions.invoke('search-flights', {
        body: { offer_id: offerId },
        headers: {
          ...authHeaders,
          'x-confirm-price': 'true', // Route hint (URL routing handled by Edge)
        },
      });

      if (fnError || !data?.success) {
        console.error('[LazyConfirm] Failed:', data?.error || fnError?.message);
        return null;
      }

      const confirmed = data.confirmed;

      // Update the offer in-place in state
      setOffers(prev => prev.map(offer => {
        if (offer.id !== offerId) return offer;
        return {
          ...offer,
          confirmed_price: confirmed.confirmed_price,
          taxes: confirmed.taxes,
          price: confirmed.confirmed_price,
          currency: confirmed.currency,
          price_status: confirmed.price_status,
          bookable: confirmed.bookable,
          reliability: 0.95,
          trust_level: 'verified' as const,
        };
      }));

      // Return the updated offer
      return offers.find(o => o.id === offerId) || null;

    } catch (err: any) {
      console.error('[LazyConfirm] Error:', err.message);
      return null;
    } finally {
      setConfirmingIds(prev => {
        const next = new Set(prev);
        next.delete(offerId);
        return next;
      });
    }
  }, [offers, confirmingIds]);

  return {
    offers,
    loading,
    error,
    metrics,
    searchFlights,
    // ── New: Lazy pricing ──
    confirmFlightPrice,
    confirmingIds,
  };
}
