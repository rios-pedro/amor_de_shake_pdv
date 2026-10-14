ALTER TABLE public.products
ALTER COLUMN image_url DROP NOT NULL;

ALTER TABLE public.products
ALTER COLUMN image_url SET DEFAULT NULL;
