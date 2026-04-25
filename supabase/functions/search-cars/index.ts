import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const RAPIDAPI_HOST = 'booking-com15.p.rapidapi.com';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const RAPIDAPI_KEY = Deno.env.get('RAPIDAPI_KEY');
  if (!RAPIDAPI_KEY) {
    return new Response(JSON.stringify({ error: 'RAPIDAPI_KEY is not configured' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const apiHeaders = {
    'x-rapidapi-key': RAPIDAPI_KEY,
    'x-rapidapi-host': RAPIDAPI_HOST,
  };

  try {
    const body = await req.json();
    const { action } = body;

    // ─── Search Car Destinations ───
    if (action === 'destinations') {
      const { query } = body;
      if (!query) {
        return new Response(JSON.stringify({ error: 'query is required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Use hotel searchDestination as fallback since car destination may not be available on free tier
      const carUrl = `https://${RAPIDAPI_HOST}/api/v1/cars/searchDestination?query=${encodeURIComponent(query)}`;
      console.log('Car destination search URL:', carUrl);
      const carResponse = await fetch(carUrl, { method: 'GET', headers: apiHeaders });
      const carText = await carResponse.text();
      let carData;
      try { carData = JSON.parse(carText); } catch { carData = { data: [] }; }
      
      let results = carData?.data || [];
      console.log('Car destinations count:', results.length);

      // Fallback to hotel destination search if car search returns empty
      if (!Array.isArray(results) || results.length === 0) {
        console.log('Falling back to hotel searchDestination for coordinates');
        const hotelUrl = `https://${RAPIDAPI_HOST}/api/v1/hotels/searchDestination?query=${encodeURIComponent(query)}`;
        const hotelResponse = await fetch(hotelUrl, { method: 'GET', headers: apiHeaders });
        const hotelText = await hotelResponse.text();
        let hotelData;
        try { hotelData = JSON.parse(hotelText); } catch { hotelData = { data: [] }; }
        results = hotelData?.data || [];
        console.log('Hotel destinations fallback count:', results.length);
      }

      const destinations = (Array.isArray(results) ? results : [])
        .filter((d: any) => d.latitude && d.longitude)
        .map((d: any) => ({
          id: d.dest_id || d.id || '',
          name: d.name || d.city_name || d.label || '',
          city: d.city_name || d.city || '',
          country: d.country || '',
          type: d.dest_type || d.search_type || '',
          coordinates: {
            latitude: Number(d.latitude),
            longitude: Number(d.longitude),
          },
          label: d.label || d.name || '',
        }));

      return new Response(JSON.stringify({ destinations }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ─── Search Car Rentals ───
    if (action === 'search') {
      const {
        pick_up_latitude,
        pick_up_longitude,
        drop_off_latitude,
        drop_off_longitude,
        pick_up_date,
        drop_off_date,
        pick_up_time = '10:00',
        drop_off_time = '10:00',
        driver_age = 30,
        currency = 'USD',
      } = body;

      if (!pick_up_latitude || !pick_up_longitude || !pick_up_date || !drop_off_date) {
        return new Response(JSON.stringify({ error: 'pick_up coordinates, pick_up_date, and drop_off_date are required' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const url = new URL(`https://${RAPIDAPI_HOST}/api/v1/cars/searchCarRentals`);
      url.searchParams.set('pick_up_latitude', String(pick_up_latitude));
      url.searchParams.set('pick_up_longitude', String(pick_up_longitude));
      url.searchParams.set('drop_off_latitude', String(drop_off_latitude || pick_up_latitude));
      url.searchParams.set('drop_off_longitude', String(drop_off_longitude || pick_up_longitude));
      url.searchParams.set('pick_up_date', pick_up_date);
      url.searchParams.set('drop_off_date', drop_off_date);
      url.searchParams.set('pick_up_time', pick_up_time);
      url.searchParams.set('drop_off_time', drop_off_time);
      url.searchParams.set('driver_age', String(driver_age));
      url.searchParams.set('currency_code', currency);

      console.log('Car rentals search URL:', url.toString());
      const response = await fetch(url.toString(), { method: 'GET', headers: apiHeaders });
      const text = await response.text();

      let data;
      try { data = JSON.parse(text); } catch { data = { raw: text }; }

      if (!response.ok) {
        console.error('Car rentals API error:', response.status, text);
        return new Response(JSON.stringify({ error: 'فشل البحث عن السيارات', details: data }), {
          status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      console.log('Car full response:', JSON.stringify(data).substring(0, 3000));
      
      const carsList = data?.data?.search_results || data?.data?.results || data?.data || [];
      console.log('Cars count:', Array.isArray(carsList) ? carsList.length : 'not array');
      if (Array.isArray(carsList) && carsList.length > 0) {
        console.log('First car sample:', JSON.stringify(carsList[0]).substring(0, 1500));
      }

      const cars = (Array.isArray(carsList) ? carsList : []).map((c: any) => ({
        id: c.vehicle_id || c.id || c.result_id || Math.random().toString(36).substr(2, 9),
        vehicleName: c.vehicle_info?.v_name || c.vehicle?.name || c.name || 'سيارة',
        vehicleGroup: c.vehicle_info?.group || c.vehicle?.category || c.category || '',
        vehicleType: c.vehicle_info?.v_class || c.vehicle?.type || c.type || '',
        imageUrl: c.vehicle_info?.image_url || c.vehicle?.image || c.image_url || c.image || null,
        supplier: c.supplier_info?.name || c.supplier?.name || c.supplier || '',
        supplierLogo: c.supplier_info?.logo_url || c.supplier?.logo || null,
        supplierRating: c.supplier_info?.rating || c.rating || null,
        price: c.pricing_info?.price || c.price?.amount || c.price || null,
        priceFormatted: c.pricing_info?.base_price ? `${c.pricing_info.base_currency || currency} ${c.pricing_info.price}` : (c.price?.amount ? `${currency} ${c.price.amount}` : null),
        currency: c.pricing_info?.base_currency || c.price?.currency || currency,
        transmission: c.vehicle_info?.transmission || c.vehicle?.transmission || '',
        fuelPolicy: c.vehicle_info?.fuel_policy || c.fuel_policy || '',
        seats: c.vehicle_info?.seats || c.vehicle?.seats || c.seats || null,
        doors: c.vehicle_info?.doors || c.vehicle?.doors || null,
        bags: c.vehicle_info?.bags || c.bags || null,
        airConditioning: c.vehicle_info?.aircon || c.air_conditioning || false,
        mileage: c.vehicle_info?.mileage || c.mileage || '',
        pickUpLocation: c.route_info?.pickup?.name || c.pick_up_location || '',
        dropOffLocation: c.route_info?.dropoff?.name || c.drop_off_location || '',
        freeCancellation: c.pricing_info?.free_cancellation || c.free_cancellation || false,
      }));

      return new Response(JSON.stringify({
        cars,
        totalCount: data?.data?.count || data?.data?.total || cars.length,
        filters: data?.data?.filter || data?.data?.filters || null,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action. Use "destinations" or "search"' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('Car rental edge function error:', err);
    return new Response(JSON.stringify({ error: err.message || 'حدث خطأ غير متوقع' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
