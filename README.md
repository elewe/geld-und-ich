Kids Money Lab — Next.js 16.1 + Supabase (App Router)

## Getting Started

Install deps (Node 20+):

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Supabase

- Env vars required: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Migrations live in `supabase/migrations/`. Run the latest SQL in Supabase SQL editor or via CLI (psql):

  ```
  psql "$SUPABASE_DB_URL" -f supabase/migrations/202601041120_fix_schema.sql
  ```

- Latest migration normalizes `transactions.child_id/pot` and keeps `balances` as a table (plus `balances_view` for aggregation).

## Development

- Auth: Supabase magic link → `/auth/callback` exchanges the code.
- Data: Dashboards read `balances` (table) with `pot` constrained to `spend|save|invest|donate`.

## Deploy
- Ensure env vars are set on the host (e.g. Vercel).
- Run `npm run build` for a production check.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
