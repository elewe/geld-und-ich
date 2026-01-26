ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_type_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_type_check
  CHECK (
    type IN (
      'weekly_allowance',
      'extra_payment',
      'allocation',
      'interest',
      'invest_transfer',
      'spend',
      'payout'
    )
  );

ALTER TABLE public.transactions
  DROP CONSTRAINT IF EXISTS transactions_pot_check;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_pot_check
  CHECK (pot IN ('spend', 'save', 'invest', 'donate'));
