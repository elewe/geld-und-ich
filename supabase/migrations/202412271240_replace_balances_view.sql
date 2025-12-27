-- Replace balances view with a real table and ensure required columns exist

-- Drop balances if it is a view
DO $$
DECLARE
  is_view boolean;
BEGIN
  SELECT (c.relkind = 'v') INTO is_view
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE c.relname = 'balances' AND n.nspname = 'public';

  IF is_view THEN
    EXECUTE 'DROP VIEW IF EXISTS public.balances CASCADE';
  END IF;
END$$;

-- Create balances table if it does not exist
CREATE TABLE IF NOT EXISTS public.balances (
  child_id uuid PRIMARY KEY,
  user_id uuid NOT NULL,
  spend_cents integer DEFAULT 0,
  save_cents integer DEFAULT 0,
  invest_cents integer DEFAULT 0,
  last_interest_on date,
  updated_at timestamptz DEFAULT now()
);

-- Ensure required columns exist (idempotent)
ALTER TABLE public.balances
  ADD COLUMN IF NOT EXISTS spend_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS save_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invest_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_interest_on date,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS user_id uuid NOT NULL,
  ADD COLUMN IF NOT EXISTS child_id uuid;

-- Ensure child_id is primary key
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'balances_pkey' AND conrelid = 'public.balances'::regclass
  ) THEN
    ALTER TABLE public.balances ADD CONSTRAINT balances_pkey PRIMARY KEY (child_id);
  END IF;
END$$;

-- Backfill nulls to zero
UPDATE public.balances
SET spend_cents = COALESCE(spend_cents, 0),
    save_cents = COALESCE(save_cents, 0),
    invest_cents = COALESCE(invest_cents, 0)
WHERE spend_cents IS NULL OR save_cents IS NULL OR invest_cents IS NULL;
