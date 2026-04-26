-- Aggressively drop any constraints on user_id and change its type to TEXT
DO $$ 
DECLARE 
    r record;
BEGIN 
    -- Find and drop any foreign key constraints on the user_id column
    FOR r IN (
        SELECT constraint_name 
        FROM information_schema.key_column_usage 
        WHERE table_schema = 'public' 
          AND table_name = 'bookings' 
          AND column_name = 'user_id'
    ) LOOP
        EXECUTE 'ALTER TABLE public.bookings DROP CONSTRAINT IF EXISTS ' || quote_ident(r.constraint_name) || ' CASCADE';
    END LOOP;
END $$;

-- Now change the column type
ALTER TABLE public.bookings ALTER COLUMN user_id TYPE TEXT;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
