CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL,
    flight_details JSONB NOT NULL,
    price NUMERIC NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ 
BEGIN
    -- Set up Row Level Security (RLS)
    ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

    -- Drop existing policy if it exists to avoid errors during push
    DROP POLICY IF EXISTS "Allow service role access" ON public.bookings;
    
    -- Create policy to allow service role access
    CREATE POLICY "Allow service role access" ON public.bookings
        AS PERMISSIVE FOR ALL
        TO service_role
        USING (true)
        WITH CHECK (true);

    -- Create policy to allow anon read access
    DROP POLICY IF EXISTS "Allow anon read access" ON public.bookings;
    CREATE POLICY "Allow anon read access" ON public.bookings
        FOR SELECT
        TO anon
        USING (true);
END $$;
