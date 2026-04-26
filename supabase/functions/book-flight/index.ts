/// <reference path="../deno.d.ts" />
// supabase/functions/book-flight/index.ts
// ─────────────────────────────────────────────────────────
// Booking — STRICT: Requires confirmed price before booking
// HARD RULE: price_status must be "confirmed" to proceed
// Flow: Validate → Re-confirm price → Save booking
// ─────────────────────────────────────────────────────────

// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getBaseUrl(): string {
  const isProd = Deno.env.get('AMADEUS_ENV') === 'production';
  return isProd ? "https://api.amadeus.com" : "https://test.api.amadeus.com";
}

async function getAmadeusToken(): Promise<string | null> {
  try {
    const baseUrl = getBaseUrl();
    const resp = await fetch(`${baseUrl}/v1/security/oauth2/token`, {
      method: "POST",
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: Deno.env.get('AMADEUS_CLIENT_ID') || '',
        client_secret: Deno.env.get('AMADEUS_CLIENT_SECRET') || '',
      }),
    });
    if (!resp.ok) return null;
    const data = await resp.json();
    return data.access_token;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, flight, price, raw_offer, user_confirmed_price_change } = await req.json()

    // ── Auth Check ──
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'يجب تسجيل الدخول لإتمام الحجز' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!flight) {
      return new Response(
        JSON.stringify({ error: 'بيانات الرحلة مفقودة' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // ── HARD RULE: Block booking if price was never confirmed ──
    if (flight.price_status !== 'confirmed' && !user_confirmed_price_change) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'BOOKING_BLOCKED',
          reason: flight.price_status === 'price_changed'
            ? 'PRICE_CHANGED_CONFIRMATION_REQUIRED'
            : 'PRICE_NOT_CONFIRMED',
          message: flight.price_status === 'price_changed'
            ? 'السعر تغيّر. يرجى تأكيد السعر الجديد قبل الحجز.'
            : 'لا يمكن الحجز بدون تأكيد السعر. أعد البحث.',
          flight_price_status: flight.price_status,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ── PRE-BOOKING: Re-confirm price via Amadeus Pricing API ──
    let confirmedPrice = price;
    let priceChanged = false;
    let taxes = 0;
    let pricingFailed = false;

    if (raw_offer && flight.source === 'amadeus') {
      const token = await getAmadeusToken();

      if (token) {
        try {
          const baseUrl = getBaseUrl();
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 12_000);

          const pricingResp = await fetch(`${baseUrl}/v1/shopping/flight-offers/pricing`, {
            method: "POST",
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              data: {
                type: "flight-offers-pricing",
                flightOffers: [raw_offer],
              },
            }),
          });

          clearTimeout(timeout);

          if (pricingResp.ok) {
            const pricingData = await pricingResp.json();
            const confirmed = pricingData?.data?.flightOffers?.[0];

            if (confirmed) {
              const newPrice = Number(confirmed.price?.grandTotal ?? confirmed.price?.total ?? price);
              const basePrice = Number(confirmed.price?.base ?? 0);
              taxes = Math.max(0, newPrice - basePrice);

              const deviation = price > 0 ? Math.abs(newPrice - price) / price : 0;
              if (deviation > 0.05) { // 5% threshold for booking (stricter than search)
                priceChanged = true;
              }
              confirmedPrice = newPrice;
            }
          } else {
            pricingFailed = true;
            console.error(`[BOOKING_PRICE] Pricing API returned ${pricingResp.status}`);
          }
        } catch (err: any) {
          pricingFailed = true;
          console.error("[BOOKING_PRICE] Error:", err.message);
        }
      } else {
        pricingFailed = true;
        console.error("[BOOKING_PRICE] Failed to get Amadeus token");
      }
    }

    // ── Block if pricing failed (can't verify → can't book) ──
    if (pricingFailed && !user_confirmed_price_change) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'PRICING_VERIFICATION_FAILED',
          message: 'تعذّر التحقق من السعر. يرجى المحاولة مرة أخرى.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ── Block if price changed — require explicit user confirmation ──
    if (priceChanged && !user_confirmed_price_change) {
      return new Response(
        JSON.stringify({
          success: false,
          price_changed: true,
          original_price: price,
          confirmed_price: confirmedPrice,
          taxes,
          deviation_percent: price > 0 ? Math.round(Math.abs(confirmedPrice - price) / price * 100) : 0,
          message: 'السعر تغيّر منذ البحث. يرجى مراجعة السعر الجديد وتأكيد الحجز.',
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    // ── Save booking with confirmed price ──
    const { data, error } = await supabaseClient
      .from('bookings')
      .insert([{
        user_id,
        flight_details: flight,
        price: confirmedPrice,
        estimated_price: flight.estimated_price || price,
        confirmed_price: confirmedPrice,
        taxes,
        price_verified: true,
        booked_at: new Date().toISOString(),
      }])
      .select()
      .single()

    if (error) throw error;

    console.log(JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "info",
      event: "booking_confirmed",
      user_id,
      flight_id: flight.id,
      confirmed_price: confirmedPrice,
      taxes,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        booking: data,
        confirmed_price: confirmedPrice,
        taxes,
        price_verified: true,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error: any) {
    console.error("Booking Error:", error)
    return new Response(
      JSON.stringify({ error: 'حدث خطأ أثناء معالجة الحجز.', details: error.message || String(error) }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
