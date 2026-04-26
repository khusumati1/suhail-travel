import { SearchParams } from "./types.ts";

export interface KiwiDiagnostic {
  keyPresent: boolean;
  keyLength: number;
  apiStatus?: number;
  apiMessage?: string;
  isValid: boolean;
  isPlaceholder: boolean;
}

export async function checkKiwiStatus(): Promise<KiwiDiagnostic> {
  const apiKey = Deno.env.get('RAPIDAPI_KEY');
  const diagnostic: KiwiDiagnostic = {
    keyPresent: !!apiKey,
    keyLength: apiKey?.length || 0,
    isValid: false,
    isPlaceholder: apiKey === 'YOUR_RAPIDAPI_KEY'
  };

  if (!apiKey || diagnostic.isPlaceholder) {
    return diagnostic;
  }

  try {
    // Lightweight probe request to verify key
    const resp = await fetch("https://kiwi-com.p.rapidapi.com/v2/search?limit=1&adults=1", {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "kiwi-com.p.rapidapi.com"
      },
      signal: AbortSignal.timeout(5000)
    });

    diagnostic.apiStatus = resp.status;
    diagnostic.isValid = resp.ok;
    
    if (!resp.ok) {
      diagnostic.apiMessage = await resp.text();
    } else {
      diagnostic.apiMessage = "Connection successful";
    }
  } catch (err: any) {
    diagnostic.apiMessage = err.message;
  }

  return diagnostic;
}

export async function fetchKiwiComparison(params: SearchParams): Promise<any[]> {
  const apiKey = Deno.env.get('RAPIDAPI_KEY');
  
  // 1. Validation
  if (!apiKey || apiKey === 'YOUR_RAPIDAPI_KEY') {
    console.error(`[KIWI_VALIDATION_FAILED] Key is ${!apiKey ? 'missing' : 'placeholder'}`);
    return [];
  }

  try {
    const url = new URL("https://kiwi-com.p.rapidapi.com/v2/search");
    url.searchParams.set("fly_from", params.origin.toUpperCase());
    url.searchParams.set("fly_to", params.destination.toUpperCase());
    url.searchParams.set("date_from", formatDate(params.departure_date));
    url.searchParams.set("date_to", formatDate(params.departure_date));
    url.searchParams.set("adults", String(params.passengers?.adults || 1));
    url.searchParams.set("curr", "USD");
    url.searchParams.set("limit", "20");

    console.log(`[KIWI] Attempting search with key: ${apiKey.substring(0, 5)}***`);

    const resp = await fetch(url.toString(), {
      headers: {
        "X-RapidAPI-Key": apiKey,
        "X-RapidAPI-Host": "kiwi-com.p.rapidapi.com"
      },
      signal: AbortSignal.timeout(10000)
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[KIWI_API_REJECTED] Status: ${resp.status}, Msg: ${errText}`);
      return [];
    }

    const data = await resp.json();
    return (data.data || []).map((o: any) => ({
      price: o.price,
      airline: o.airlines?.[0] || "",
      depart: o.local_departure,
      arrive: o.local_arrival
    }));
  } catch (err: any) {
    console.error("[KIWI_FETCH_ERROR]", err.message);
    return [];
  }
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}
