-- Create pending_order_items table to support multiple products per pending order
-- Each item can have its own customer_details for services like internet

CREATE TABLE public.pending_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pending_order_id UUID NOT NULL REFERENCES public.pending_orders(id) ON DELETE CASCADE,
  product_id UUID NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  customer_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pending_order_items ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all items
CREATE POLICY "Super admins can manage pending order items"
ON public.pending_order_items
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role));

-- Users can view items for their pending orders (via email match)
CREATE POLICY "Users can view their pending order items"
ON public.pending_order_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM pending_orders po
    WHERE po.id = pending_order_items.pending_order_id
    AND (
      po.email = (SELECT p.email FROM profiles p WHERE p.id = auth.uid())
      OR po.claimed_by = auth.uid()
    )
  )
);

-- Users can update items for orders they're claiming (to add customer details)
CREATE POLICY "Users can update their pending order items"
ON public.pending_order_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM pending_orders po
    WHERE po.id = pending_order_items.pending_order_id
    AND (
      po.email = (SELECT p.email FROM profiles p WHERE p.id = auth.uid())
      OR po.claimed_by = auth.uid()
    )
  )
);

-- Create index for faster lookups
CREATE INDEX idx_pending_order_items_order_id ON public.pending_order_items(pending_order_id);
CREATE INDEX idx_pending_order_items_product_id ON public.pending_order_items(product_id);