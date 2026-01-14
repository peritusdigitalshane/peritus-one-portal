-- Add fulfillment tracking columns to user_purchases
ALTER TABLE public.user_purchases
ADD COLUMN IF NOT EXISTS fulfilled BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS fulfilled_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add foreign key constraint for user_id to profiles for better joins
-- First check if constraint exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'user_purchases_user_id_fkey'
  ) THEN
    ALTER TABLE public.user_purchases
    ADD CONSTRAINT user_purchases_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
END $$;