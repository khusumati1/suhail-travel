import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type CacheEntry = {
  promise?: Promise<any>;
  data?: HotelImagesResult;
};

const cache = new Map<string, CacheEntry>();

export interface HotelImagesResult {
  images: string[];
  address?: string;
  city?: string;
  loading: boolean;
  error: string | null;
  fallback: boolean;
  source: string;
}

export function useHotelImages(
  name: string,
  lat?: number,
  lng?: number,
  city?: string
) {
  const key = `${name}_${lat}_${lng}_${city}`;

  const [state, setState] = useState<HotelImagesResult>({
    images: [],
    address: "",
    city: "",
    loading: true,
    error: null,
    fallback: false,
    source: "",
  });

  useEffect(() => {
    if (!name || lat == null || lng == null) {
      setState({
        images: [],
        address: "",
        city: "",
        loading: false,
        error: null,
        fallback: false,
        source: "",
      });
      return;
    }

    let cancelled = false;

    const existing = cache.get(key);

    // ✅ إذا البيانات موجودة
    if (existing?.data) {
      setState(existing.data);
      return;
    }

    // ✅ إذا فيه request جاري
    if (existing?.promise) {
      existing.promise.then((data) => {
        if (!cancelled) setState(data);
      });
      return;
    }

    // 🔥 إنشاء request واحد فقط
    const promise = (async () => {
      try {
        const { data, error } = await supabase.functions.invoke(
          "hotel-images",
          {
            body: { name, lat, lng, city: city || "" },
          }
        );

        if (error) throw error;

        const result: HotelImagesResult = {
          images: data?.images || [],
          address: data?.address || "",
          city: data?.city || "",
          loading: false,
          error: null,
          fallback: data?.fallback ?? true,
          source: data?.source || "unknown",
        };

        if (result.images.length > 0 && typeof Image !== 'undefined') {
          const img = new Image();
          img.src = result.images[0];
        }

        cache.set(key, { data: result });
        return result;
      } catch (err: any) {
        const result: HotelImagesResult = {
          images: [],
          address: "",
          city: "",
          loading: false,
          error: err.message,
          fallback: true,
          source: "error",
        };

        cache.set(key, { data: result });
        return result;
      }
    })();

    cache.set(key, { promise });

    promise.then((res) => {
      if (!cancelled) setState(res);
    });

    return () => {
      cancelled = true;
    };
  }, [name, lat, lng, city]);

  return state;
}