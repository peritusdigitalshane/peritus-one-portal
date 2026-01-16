-- Create a sequence for ticket numbers (concurrency-safe)
CREATE SEQUENCE IF NOT EXISTS public.ticket_number_seq START WITH 2;

-- Update the sequence to start after the highest existing ticket number
DO $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 5) AS INTEGER)), 0)
  INTO max_num
  FROM public.support_tickets;
  
  IF max_num > 0 THEN
    PERFORM setval('public.ticket_number_seq', max_num + 1, false);
  END IF;
END $$;

-- Replace the trigger function to use the sequence
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(nextval('public.ticket_number_seq')::TEXT, 6, '0');
  RETURN NEW;
END;
$function$;