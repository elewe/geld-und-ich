ALTER TABLE public.wishes
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS redeemed_at date;
