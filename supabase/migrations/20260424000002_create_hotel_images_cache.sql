-- Migration to create and optimize hotel_images_cache table

-- 1. Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.hotel_images_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hotel_name TEXT NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    images JSONB NOT NULL,
    source TEXT NOT NULL,
    fallback BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Add city column if it doesn't exist
ALTER TABLE public.hotel_images_cache ADD COLUMN IF NOT EXISTS city TEXT DEFAULT '';

-- 3. Safely drop the old float-based unique constraint if it was created
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'hotel_images_cache_hotel_name_lat_lng_key'
  ) THEN
    ALTER TABLE public.hotel_images_cache DROP CONSTRAINT hotel_images_cache_hotel_name_lat_lng_key;
  END IF;
  
  IF EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'hotel_images_cache_hotel_name_city_key'
  ) THEN
    ALTER TABLE public.hotel_images_cache DROP CONSTRAINT hotel_images_cache_hotel_name_city_key;
  END IF;
END $$;

-- 4. Detect and remove duplicates safely (keep the latest record for each hotel_name, city)
DELETE FROM public.hotel_images_cache
WHERE id IN (
  SELECT id
  FROM (
    SELECT id,
           ROW_NUMBER() OVER (PARTITION BY hotel_name, city ORDER BY created_at DESC) as rnum
    FROM public.hotel_images_cache
  ) t
  WHERE t.rnum > 1
);

-- 5. Create stable unique index
CREATE UNIQUE INDEX IF NOT EXISTS idx_hotel_city 
ON public.hotel_images_cache (hotel_name, city);

-- 6. Enable RLS
ALTER TABLE public.hotel_images_cache ENABLE ROW LEVEL SECURITY;

-- 7. Fix existing policy conflicts by dropping them first
DROP POLICY IF EXISTS "Allow public read access on hotel_images_cache" ON public.hotel_images_cache;
CREATE POLICY "Allow public read access on hotel_images_cache" 
    ON public.hotel_images_cache
    FOR SELECT
    TO public, anon
    USING (true);

DROP POLICY IF EXISTS "Allow service role insert/update on hotel_images_cache" ON public.hotel_images_cache;
CREATE POLICY "Allow service role insert/update on hotel_images_cache" 
    ON public.hotel_images_cache
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
