ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS max_flavors integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS extra_flavor_price numeric(10, 2) NOT NULL DEFAULT 0;

ALTER TABLE public.products
  DROP CONSTRAINT IF EXISTS products_max_flavors_check,
  DROP CONSTRAINT IF EXISTS products_extra_flavor_price_check;

ALTER TABLE public.products
  ADD CONSTRAINT products_max_flavors_check CHECK (max_flavors >= 1),
  ADD CONSTRAINT products_extra_flavor_price_check CHECK (extra_flavor_price >= 0);

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS flavor_id uuid REFERENCES public.products(id);

CREATE TABLE IF NOT EXISTS public.order_item_flavors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  flavor_product_id uuid NOT NULL REFERENCES public.products(id),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT order_item_flavors_unique UNIQUE (order_item_id, flavor_product_id)
);
