-- Create pending_orders table for pre-registration billing
CREATE TABLE public.pending_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  claimed_at TIMESTAMP WITH TIME ZONE
);

-- Create index for email lookups
CREATE INDEX idx_pending_orders_email ON public.pending_orders(email);
CREATE INDEX idx_pending_orders_claimed_by ON public.pending_orders(claimed_by);

-- Enable Row Level Security
ALTER TABLE public.pending_orders ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all pending orders
CREATE POLICY "Super admins can manage pending orders"
ON public.pending_orders
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Users can view pending orders for their email (matched via profiles table)
CREATE POLICY "Users can view their pending orders by email"
ON public.pending_orders
FOR SELECT
USING (
  email = (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid())
  OR claimed_by = auth.uid()
);

-- Users can update (claim) pending orders for their email
CREATE POLICY "Users can claim their pending orders"
ON public.pending_orders
FOR UPDATE
USING (
  email = (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid())
  AND claimed_by IS NULL
)
WITH CHECK (
  claimed_by = auth.uid()
);