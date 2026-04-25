import { useState, useCallback, useRef } from 'react';
import { getCountryNameAr, searchArabicCities } from '@/lib/countryNames';

export interface Place {
  id: string;
  name: string;
  iata_code: string;
  iata_city_code?: string;
  city_name: string;
  country_name: string;
  type: 'airport' | 'city';
  airports?: { id: string; name: string; iata_code: string; city_name: string }[];
}

// Detect if query is Arabic
function isArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

export function usePlaceSearch() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const searchPlaces = useCallback((query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.length < 2) {
      setPlaces([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        // Check Arabic local results first
        const arabicResults = isArabic(query) ? searchArabicCities(query) : [];
        const localPlaces: Place[] = arabicResults.map((r, i) => ({
          id: `local_${r.code}_${i}`,
          name: r.name,
          iata_code: r.code,
          city_name: r.name,
          country_name: r.countryAr,
          type: 'city' as const,
        }));

        // Also query Duffel API (works best with English/IATA codes)
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-places?query=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          signal: abortRef.current!.signal,
        });

        const result = await response.json();
        const apiPlaces: Place[] = (result.places || []).map((p: Place) => ({
          ...p,
          country_name: getCountryNameAr(p.country_name) || p.country_name,
        }));

        // Merge: local first, then API (dedup by iata_code)
        const seen = new Set(localPlaces.map(p => p.iata_code));
        const merged = [
          ...localPlaces,
          ...apiPlaces.filter(p => p.iata_code && !seen.has(p.iata_code)),
        ];

        setPlaces(merged);
      } catch (err: any) {
        if (err?.name !== 'AbortError') {
          console.error('Place search error:', err);
        }
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  return { places, loading, searchPlaces };
}

// Recent searches stored in localStorage
const RECENT_KEY = 'suhail_recent_searches';
const MAX_RECENT = 5;

export interface RecentSearch {
  from: string;
  fromCode: string;
  to: string;
  toCode: string;
  date?: string;
  timestamp: number;
}

export function getRecentSearches(): RecentSearch[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveRecentSearch(search: Omit<RecentSearch, 'timestamp'>) {
  try {
    const existing = getRecentSearches();
    const filtered = existing.filter(
      (s) => !(s.fromCode === search.fromCode && s.toCode === search.toCode)
    );
    const updated = [{ ...search, timestamp: Date.now() }, ...filtered].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {
    // Silently fail
  }
}
