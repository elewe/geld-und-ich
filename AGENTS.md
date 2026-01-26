# AI Project Guide (Kids Money Lab)

## Purpose
Kids Money Lab is a Next.js app for managing kid money pots (spend/save/invest/donate), with a parent dashboard and per-child detail views.

## Stack
- Next.js 16 / React 19 / TypeScript
- Tailwind CSS v4 (via `app/globals.css`)
- Supabase (DB + auth + storage)

## Key Routes
- Dashboard: `app/page.tsx` (Parent dashboard)
- Child detail: `app/children/[childId]/page.tsx`
- Child settings: `app/children/[childId]/edit/page.tsx`
- Create child: `app/children/create/page.tsx`
- Add money (payout): `app/children/[childId]/payout/page.tsx`
- Add expense: `app/children/[childId]/add-expense/[pot]/page.tsx`
- Activities: `app/children/[childId]/activities/page.tsx`
- Pot detail: `app/children/[childId]/pots/[pot]/page.tsx`
- Wishes: `app/children/[childId]/wishes/page.tsx`
- Year review (PDF): `app/children/[childId]/year-review/page.tsx`

## Data Model Notes
- `children` table includes `donate_enabled` (boolean, default false).
- Balances in `balances` table include `donate_cents`.
- `donate` pot is shown if age >= 7, `donate_enabled` true, or donate balance > 0.
- `wishes` table includes `image_url` (text) and `redeemed_at` (date) for wish media + redemption status.
- `transactions` type check includes `spend` (expense) and `payout`, and pot check includes `donate`.

## Design Sources
- Figma is the source of truth; match spacing/typography exactly when referenced.
- Donut chart visuals should follow the provided screenshots if Figma is incorrect.

## Local DB Workflow
- Dev schema applies via `scripts/db_apply_dev.sh` (requires `DEV_DB_HOST` + `DEV_DB_PASSWORD`).
- If IPv4 is unavailable, use IPv6 fallback (`DEV_DB_ALLOW_IPV6=1` or `--allow-ipv6`).

## Documentation Rule (keep this up to date)
At the end of each coding session:
1) Update this file if you changed routes, data model, or UI flow.
2) Add any new scripts/env vars or Supabase schema changes.
3) Note any new design sources or exceptions.
