-- Fix missing price column in bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS price NUMERIC;

-- Update existing rows to have a price if they don't (though they shouldn't exist if it's NOT NULL)
UPDATE public.bookings SET price = 0 WHERE price IS NULL;

-- Make it NOT NULL if it was missing
ALTER TABLE public.bookings ALTER COLUMN price SET NOT NULL;

-- Reload the schema cache for PostgREST
NOTIFY pgrst, 'reload schema';
