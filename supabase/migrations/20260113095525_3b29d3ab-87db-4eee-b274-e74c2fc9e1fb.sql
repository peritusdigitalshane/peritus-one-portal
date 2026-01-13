-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT '📦',
  price DECIMAL(10,2) NOT NULL,
  billing_type TEXT NOT NULL CHECK (billing_type IN ('one-time', 'monthly', 'annual')),
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on products (publicly viewable)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Products are viewable by everyone"
ON public.products FOR SELECT
USING (is_active = true);

CREATE POLICY "Super admins can manage products"
ON public.products FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create user_purchases table
CREATE TABLE public.user_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'cancelled', 'expired', 'pending')),
  price_paid DECIMAL(10,2) NOT NULL,
  next_billing_date DATE,
  purchased_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  cancelled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on user_purchases
ALTER TABLE public.user_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own purchases"
ON public.user_purchases FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchases"
ON public.user_purchases FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Super admins can view all purchases"
ON public.user_purchases FOR SELECT
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admins can manage all purchases"
ON public.user_purchases FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Create invoices table
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  due_date DATE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own invoices"
ON public.invoices FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Super admins can manage invoices"
ON public.invoices FOR ALL
USING (public.has_role(auth.uid(), 'super_admin'));

-- Add triggers for updated_at
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();