-- Fix schema drift between app code and Supabase.
-- Apply manually in the Supabase SQL editor (safe to re-run).

-- 1) Ensure child_id exists (replace old "kind" usage)
ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS child_id uuid;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'kind'
  ) THEN
    BEGIN
      EXECUTE 'UPDATE public.transactions SET child_id = COALESCE(child_id, kind::uuid) WHERE child_id IS NULL';
    EXCEPTION WHEN others THEN
      -- If cast fails, leave existing child_id values untouched.
    END;
  END IF;
END$$;

ALTER TABLE public.transactions
  DROP COLUMN IF EXISTS kind;

CREATE INDEX IF NOT EXISTS transactions_child_id_idx ON public.transactions(child_id);
CREATE INDEX IF NOT EXISTS transactions_user_id_idx ON public.transactions(user_id);

-- 2) Normalize pot column (text with constrained values)
-- Drop dependent views first to allow type changes.
DROP VIEW IF EXISTS public.balances_view;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS pot text;

ALTER TABLE public.transactions
  ALTER COLUMN pot TYPE text,
  ALTER COLUMN pot SET DEFAULT 'spend';

UPDATE public.transactions
SET pot = COALESCE(NULLIF(TRIM(pot), ''), 'spend')
WHERE pot IS NULL OR TRIM(pot) = '' OR pot NOT IN ('spend', 'save', 'invest', 'donate');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'transactions_pot_check'
      AND conrelid = 'public.transactions'::regclass
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_pot_check CHECK (pot IN ('spend', 'save', 'invest', 'donate'));
  END IF;
END$$;

-- 3) Keep balances as a table with the required columns
CREATE TABLE IF NOT EXISTS public.balances (
  child_id uuid PRIMARY KEY,
  user_id uuid,
  spend_cents integer DEFAULT 0,
  save_cents integer DEFAULT 0,
  invest_cents integer DEFAULT 0,
  donate_cents integer DEFAULT 0,
  last_interest_on date,
  updated_at timestamptz DEFAULT timezone('utc', now())
);

ALTER TABLE public.balances
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS spend_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS save_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS invest_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS donate_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_interest_on date,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc', now()),
  ALTER COLUMN updated_at SET DEFAULT timezone('utc', now());

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'balances_pkey' AND conrelid = 'public.balances'::regclass
  ) THEN
    ALTER TABLE public.balances ADD CONSTRAINT balances_pkey PRIMARY KEY (child_id);
  END IF;
END$$;

UPDATE public.balances
SET spend_cents = COALESCE(spend_cents, 0),
    save_cents = COALESCE(save_cents, 0),
    invest_cents = COALESCE(invest_cents, 0),
    donate_cents = COALESCE(donate_cents, 0);

-- 4) Optional aggregated view fed by transactions (kept distinct from the balances table)
CREATE VIEW public.balances_view AS
WITH signed AS (
  SELECT
    child_id,
    user_id,
    pot,
    CASE
      WHEN COALESCE(type, '') IN ('invest_transfer', 'spend', 'payout') THEN -ABS(COALESCE(amount_cents, 0))
      ELSE ABS(COALESCE(amount_cents, 0))
    END AS delta_cents
  FROM public.transactions
)
SELECT
  child_id,
  MAX(user_id::text)::uuid AS user_id,
  COALESCE(SUM(CASE WHEN pot = 'spend' THEN delta_cents END), 0) AS spend_cents,
  COALESCE(SUM(CASE WHEN pot = 'save' THEN delta_cents END), 0) AS save_cents,
  COALESCE(SUM(CASE WHEN pot = 'invest' THEN delta_cents END), 0) AS invest_cents,
  COALESCE(SUM(CASE WHEN pot = 'donate' THEN delta_cents END), 0) AS donate_cents
FROM signed
GROUP BY child_id;
