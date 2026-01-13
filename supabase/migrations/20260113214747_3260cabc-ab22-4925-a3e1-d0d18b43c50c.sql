-- Add pdf_url column to invoices table for Stripe invoice PDF links
ALTER TABLE public.invoices 
ADD COLUMN pdf_url TEXT;