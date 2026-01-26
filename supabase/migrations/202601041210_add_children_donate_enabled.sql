ALTER TABLE public.children
  ADD COLUMN IF NOT EXISTS donate_enabled boolean DEFAULT false NOT NULL;
