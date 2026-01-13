-- Create a table to assign products to specific users
CREATE TABLE public.product_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  assigned_by UUID NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(product_id, user_id)
);

-- Enable RLS
ALTER TABLE public.product_assignments ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all assignments
CREATE POLICY "Super admins can manage assignments"
  ON public.product_assignments
  FOR ALL
  USING (has_role(auth.uid(), 'super_admin'));

-- Users can view their own assignments
CREATE POLICY "Users can view their own assignments"
  ON public.product_assignments
  FOR SELECT
  USING (auth.uid() = user_id);

-- Add visibility column to products
ALTER TABLE public.products 
ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';

-- Update products RLS policy to handle visibility
DROP POLICY IF EXISTS "Products are viewable by everyone" ON public.products;

CREATE POLICY "Products are viewable based on visibility"
  ON public.products
  FOR SELECT
  USING (
    is_active = true 
    AND (
      visibility = 'public'
      OR has_role(auth.uid(), 'super_admin')
      OR EXISTS (
        SELECT 1 FROM public.product_assignments pa
        WHERE pa.product_id = products.id
        AND pa.user_id = auth.uid()
        AND (pa.expires_at IS NULL OR pa.expires_at > now())
      )
    )
  );