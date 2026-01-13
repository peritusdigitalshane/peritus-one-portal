-- Add more fields to products for a complete price book
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS features text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS stripe_price_id text,
ADD COLUMN IF NOT EXISTS stripe_product_id text,
ADD COLUMN IF NOT EXISTS sort_order integer DEFAULT 0;

-- Add stripe fields to user_purchases for subscription tracking
ALTER TABLE public.user_purchases
ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
ADD COLUMN IF NOT EXISTS stripe_customer_id text;

-- Add stripe fields to invoices
ALTER TABLE public.invoices
ADD COLUMN IF NOT EXISTS stripe_invoice_id text,
ADD COLUMN IF NOT EXISTS purchase_id uuid REFERENCES public.user_purchases(id),
ADD COLUMN IF NOT EXISTS description text;

-- Create a settings table for storing API keys and other config
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text,
  encrypted boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on admin_settings
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Only super admins can access settings
CREATE POLICY "Super admins can view settings" 
ON public.admin_settings 
FOR SELECT 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can insert settings" 
ON public.admin_settings 
FOR INSERT 
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can update settings" 
ON public.admin_settings 
FOR UPDATE 
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can delete settings" 
ON public.admin_settings 
FOR DELETE 
USING (public.has_role(auth.uid(), 'super_admin'));

-- Add trigger for updated_at
CREATE TRIGGER update_admin_settings_updated_at
BEFORE UPDATE ON public.admin_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();