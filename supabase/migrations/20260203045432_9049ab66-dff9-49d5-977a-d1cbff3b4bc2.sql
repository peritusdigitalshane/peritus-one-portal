-- Add progress percentage column to key_initiatives
ALTER TABLE public.key_initiatives 
ADD COLUMN progress_percentage integer DEFAULT 0 CHECK (progress_percentage >= 0 AND progress_percentage <= 100);