// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
// @ts-ignore
import { createClient } from "npm:@supabase/supabase-js@2"

declare const Deno: any;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { user_id, flight, price } = await req.json()

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


    // Insert into DB using Service Role
    const { data, error } = await supabaseClient
      .from('bookings')
      .insert([
        {
          user_id,
          flight_details: flight,
          price: price
        }
      ])
      .select()
      .single()

    if (error) {
      throw error
    }

    return new Response(
      JSON.stringify({ success: true, booking: data }),
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
