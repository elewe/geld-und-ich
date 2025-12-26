# Kids Money Lab — AI Agent Guide

Kurzanleitung, damit Automationen sicher in diesem Next.js + Supabase Projekt arbeiten können.

## Stack & Laufzeit
- Next.js App Router, Client Components für alle Supabase-Zugriffe (`'use client'` nicht vergessen).
- Styling: TailwindCSS. Mobile-first Layout, Container meist `max-w-xl mx-auto p-6 md:p-10`.
- Supabase Client: `createClient()` aus `@/supabase/browser`. Kein server-side Supabase, keine Server Actions.
- Auth: `supabase.auth.getUser()`. Wenn kein User → `router.replace('/login')`.
- Routing-Hooks: `useParams()` (Param kann optional sein), `useRouter()` für Redirects.
- CLI: bevorzugt `rg` für Suchen; Edits mit `apply_patch`. Keine destruktiven Git-Befehle.

## Datenmodell (wichtigste Tabellen)
- `children`: `id`, `name`, `age`, `weekly_amount` (CHF), `user_id`, `created_at`.
- `balances`: pro Kind: `spend_cents`, `save_cents`, `invest_cents`, `last_interest_on`, `user_id`.
- `settings`: `interest_apr_bp` (Basispunkte p.a.), `invest_threshold_cents`, `payout_weekday`, `user_id`.
- `transactions`: `type`, `pot` (`spend` | `save` | `invest`), `amount_cents`, `occurred_on`, `meta`.
- Geldwerte immer in Cents speichern, Anzeige via `formatCHF(cents)`.

## UI-Bausteine
- `components/ui/Button`: Varianten `primary`, `secondary`, `ghost`; große Tap-Targes.
- `components/ui/Card`: Standardkarte; `tone="plain"` für farbige Pot-Karten.
- `components/ui/Badge`, `components/ui/Progress`: neutrale Helfer.
- Geld & Pötte: `components/money/format.ts`, `components/money/pots.ts`, `components/money/PotCard.tsx`.
- Farben: Spend (amber), Save (emerald), Invest (sky). Page BG meist `bg-slate-50`.

## Seitenfluss (Kernpfade)
- `/login`: Auth.
- `/dashboard`: Übersicht der Kinder.
- `/children/[childId]`: Detailseite mit drei Töpfen, Aktionen, letzte Transaktionen.
- Weitere Aktionen: `/children/[childId]/payout`, `/extra`, `/transfer`, `/edit`.

## Defensive Patterns
- Beim Laden: `loading`/`error` Zustände rendern, keine nackten Exceptions.
- Ownership prüfen (`user_id === user.id`) bevor Kind/Balances/Settings genutzt werden.
- Fallbacks für fehlende Rows (Balances/Settings) mit Null-Werten erzeugen.
- Datumsberechnungen defensiv (`Number.isNaN` Check), `daysSince` nutzen.

## Lokal starten
- `npm run dev` und App unter `http://localhost:3000`.

## Was AI-Agents vermeiden sollten
- Kein Netzwerkzugriff ohne Freigabe; keine Package-Installs ohne Bedarf.
- Keine Server Actions oder server-seitige Supabase-Clients einbauen.
- Keine destruktiven Git-Befehle (`git reset --hard`, etc.).
