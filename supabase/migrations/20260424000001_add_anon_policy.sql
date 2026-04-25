DO $$ 
BEGIN
    -- Create policy to allow anon read access
    DROP POLICY IF EXISTS "Allow anon read access" ON public.bookings;
    CREATE POLICY "Allow anon read access" ON public.bookings
        FOR SELECT
        TO anon
        USING (true);
END $$;
