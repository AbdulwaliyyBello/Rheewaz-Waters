# Rheewaz Waters — MVP Operations & Sales App

A full-stack Next.js 14 (App Router) application backed by a real PostgreSQL
database (Neon) via Drizzle ORM. Implements the full business spec: role-based
auth with real email verification, weekly Mon–Sat sales tracking, automatic
calculations (price/outstanding/commission), factory + nylon-roll expenses,
Boss analytics, and automatic weekly rollover.

## 1. Prerequisites

- Node.js 20+
- A free [Neon](https://neon.tech) Postgres project
- (Optional but recommended for real email) a [Resend](https://resend.com) API key

## 2. Install

```bash
npm install
```

## 3. Configure environment

```bash
cp .env.example .env.local
```

Fill in:
- `DATABASE_URL` — from your Neon project dashboard
- `SESSION_SECRET` — `openssl rand -base64 32`
- `CRON_SECRET` — `openssl rand -base64 32`
- `SEED_BOSS_EMAIL` / `SEED_BOSS_PASSWORD` / `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`
- `RESEND_API_KEY` + `EMAIL_FROM` — optional. Without these, worker-invite
  verification links are printed to the server console instead of emailed,
  so you can still test the full flow locally.
- `APP_URL` — `http://localhost:3000` in dev, your real domain in production

## 4. Create the database schema

Two ways — pick one:

**A. Let Drizzle generate + apply migrations (recommended):**
```bash
npm run db:generate   # should report "no changes" the first time, since
                       # drizzle/0000_init.sql already matches schema.ts
npm run db:migrate
```

**B. Or paste `drizzle/0000_init.sql` directly into the Neon SQL editor.**

Either way, you can now inspect every table live with:
```bash
npm run db:studio
```
which opens Drizzle Studio — a browser GUI over your real Postgres tables
(or use Neon's own table editor, or any Postgres client like TablePlus/pgAdmin
pointed at your `DATABASE_URL`).

## 5. Seed the Boss and Admin accounts

```bash
npm run db:seed
```

This is idempotent — safe to re-run. It creates the two bootstrap accounts
(already `email_verified = true`, since they're trusted operators, not
self-registered) and provisions the current week's rows.

## 6. Run it

```bash
npm run dev
```

Visit `http://localhost:3000` → redirects to `/login`.

## How the pieces map to the spec

| Spec requirement | Where it lives |
|---|---|
| Roles: Boss / Admin / Worker | `users.role` enum + `middleware.ts` route gating + `requireRole()` in every API route |
| Email verification for workers | `POST /api/workers` generates a token, `lib/mail.ts` sends it, `GET /api/auth/verify-email` activates the account |
| Soft-delete workers, preserve history | `PATCH /api/workers/[id]` only flips `active`; `daily_records.worker_id` is never orphaned |
| Weekly rows exist even at zero | `lib/weeks.ts: ensureWeekProvisioned()` — idempotent upsert of all 6 days per active worker, called on every read |
| Price / Outstanding / Commission formulas | `lib/calc.ts` — the only place these are computed, called by every route that returns figures. Never trust client-submitted totals. |
| Commission Payable = week commission − previous week outstanding | `GET /api/records` computes each worker's previous week outstanding server-side |
| Company weekly rollup (Gross Income, Cash Left, etc.) | `calcCompanyWeekSummary()` in `lib/calc.ts` |
| Nylon rolls tracked separately from Factory Expenses | Separate `nylon_roll_expenses` table; `POST /api/expenses` never adds it into `factory_expenses` |
| Boss-only historical weeks | `GET /api/records/[weekId]` and `GET /api/weeks` both call `requireRole(["boss"])` |
| Boss analytics (1W/1M/6M/1Y) | `GET /api/analytics?range=` |
| Automatic Sunday 23:59:59 WAT rollover | `lib/weeks.ts: closeElapsedWeeks()`, triggered by `vercel.json`'s cron entry hitting `POST /api/weeks/rollover` (protected by `CRON_SECRET`) every Sunday at 22:59 UTC (23:59 WAT) |
| Server-side authorization, not just hidden UI | Every route calls `requireRole()` / `getSession()` before touching data; `middleware.ts` additionally blocks page navigation by role |
| Never trust frontend-calculated financial values | Worker's `POST /api/records` only accepts raw inputs (bags/cash/transfer/roadExpenses); the server recomputes price/outstanding/commission independently on every read |

## Deploying

This is a standard Next.js app — deploys cleanly to Vercel:

1. Push this repo to GitHub, import into Vercel.
2. Add all the env vars from `.env.local` to the Vercel project settings
   (use your **production** Neon connection string).
3. Vercel will automatically pick up `vercel.json`'s cron entry for weekly rollover.
4. Run `npm run db:migrate` and `npm run db:seed` once against your production
   database (from your local machine with `DATABASE_URL` pointed at prod, or
   via a one-off Vercel deployment script).

## What's intentionally NOT in this MVP

Per the spec's own priority list: inventory management, payroll, customer
accounts, chat, push notifications, GPS tracking, AI features, invoicing,
payment processing, and accounting-system integrations. These are natural
V2 candidates once the core operational loop is validated.

## Known simplifications worth knowing about

- **Session revocation**: the `sessions` table exists in the schema for
  future audit/revocation but isn't yet wired into logout — logout just
  clears the cookie. Fine for an MVP; add a `sessions` lookup to `getSession()`
  if you want server-side revocation later.
- **Rate limiting / brute-force protection** on `/api/auth/login` isn't
  implemented — add it (e.g. via Vercel's edge middleware or a service like
  Upstash) before going to production with real financial data.
- **Nylon roll rows** aren't editable/deletable via the UI yet (only
  appendable) — add a small admin list+delete view if you need to correct
  mistakes without going into the database directly.
