# Rheewaz Waters — Operations, Sales & Verification App

Next.js 14 (App Router) + Drizzle ORM + Neon Postgres. Phase 1 (roles, weekly
sales, expenses, analytics) plus Phase 2 (debt repayment, immutable worker
submissions, trucks/trips, AI verification & training architecture, live
camera boundary) — see `IMPLEMENTATION_REPORT.md` for exactly what changed
and why.

## 1. Install

```bash
npm install
```

## 2. Configure environment

```bash
cp .env.example .env.local
```
Fill in `DATABASE_URL` (Neon), `SESSION_SECRET`, `CRON_SECRET` (all via
`openssl rand -base64 32`), the seed account credentials, and optionally
`RESEND_API_KEY` (email), `CAMERA_STREAM_URL` (live camera), and
`AI_INFERENCE_WEBHOOK_SECRET` (real vision-model integration).

## 3. Run migrations

Apply in order:
```bash
npm run db:generate   # should report "no changes" — files already match schema.ts
npm run db:migrate
```
or paste `drizzle/0000_init.sql` then `drizzle/0001_phase2.sql` into the Neon
SQL editor. Inspect real tables anytime with `npm run db:studio`.

## 4. Seed

```bash
npm run db:seed
```
Creates Boss + Admin, the two trucks (Toyota Dyna, Daihatsu Hijet), and — if
`SEED_WORKER1_EMAIL` / `SEED_WORKER2_EMAIL` are set — the two known workers
with their truck assignments.

## 5. Verify the bag-counting rules

```bash
npx tsx scripts/test-calc.ts
```
Runs all 15 numeric acceptance tests from the spec. Should print 15/15 passed.

## 6. Run it

```bash
npm run dev
```

## What's real vs. what's an honest boundary

Everything in the table below is real, working code against a real
Postgres database — nothing is mocked:
- Auth, roles, weekly sales, expenses, analytics (Phase 1)
- Debt repayment, immutable worker submissions with confirmation modal, truck/trip entities, discrepancy detection, AI training data model, training-run/versioning workflow (Phase 2)

Two things are deliberately left as **honest integration boundaries** rather
than faked, per the spec's own instruction not to mock AI/CCTV:
- **Live camera** (`/camera`, `/api/camera`) — shows real `LIVE`/`CONNECTING`/`OFFLINE` states; only plays actual video once `CAMERA_STREAM_URL` points at a real HLS source.
- **AI bag counting** (`/api/ai/predictions`) — the counting *rules* (rows→bags, bonus thresholds) are real and tested; there is no computer-vision model running here. The Boss enters physical counts directly (fully functional today), and the webhook is ready for a real inference service to plug into later.

See `IMPLEMENTATION_REPORT.md` for the full file-by-file breakdown, required
env vars, and what still needs external infrastructure.
