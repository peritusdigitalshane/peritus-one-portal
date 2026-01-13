-- Add stripe_customer_id to profiles table
ALTER TABLE public.profiles
ADD COLUMN stripe_customer_id text UNIQUE;

-- Create index for faster lookups
CREATE INDEX idx_profiles_stripe_customer_id ON public.profiles(stripe_customer_id);

-- Allow super admins to view all profiles (needed for admin functions)
CREATE POLICY "Super admins can view all profiles"
ON public.profiles
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role));