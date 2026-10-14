CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS public.product_flavors_relation (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  flavor_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  UNIQUE (product_id, flavor_id)
);

ALTER TABLE public.order_items
ADD COLUMN IF NOT EXISTS flavor_id uuid REFERENCES public.products(id);
