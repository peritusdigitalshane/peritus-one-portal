-- Add foreign key from pending_order_items.product_id to products.id
ALTER TABLE public.pending_order_items
ADD CONSTRAINT pending_order_items_product_id_fkey 
FOREIGN KEY (product_id) 
REFERENCES public.products(id) 
ON DELETE CASCADE;