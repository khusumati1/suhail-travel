-- Add address column to hotel_images_cache
ALTER TABLE public.hotel_images_cache ADD COLUMN IF NOT EXISTS address TEXT DEFAULT '';
