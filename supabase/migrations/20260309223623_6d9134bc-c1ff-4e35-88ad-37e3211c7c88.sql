
CREATE OR REPLACE FUNCTION public.get_pending_order_products(_pending_order_id uuid)
RETURNS TABLE(
  item_id uuid,
  product_id uuid,
  quantity integer,
  product_name text,
  product_price numeric,
  product_billing_type text,
  product_description text,
  product_category text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    poi.id as item_id,
    poi.product_id,
    poi.quantity,
    p.name as product_name,
    p.price as product_price,
    p.billing_type as product_billing_type,
    p.description as product_description,
    p.category as product_category
  FROM public.pending_order_items poi
  JOIN public.products p ON p.id = poi.product_id
  WHERE poi.pending_order_id = _pending_order_id
$$;
