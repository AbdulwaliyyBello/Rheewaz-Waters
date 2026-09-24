# Rheewaz Waters — Phase 2 Implementation Report

This extends the existing Next.js/Drizzle/Neon application additively. No
Phase 1 table, route, or calculation was rewritten from scratch — everything
below was added alongside what already worked.

## Files changed

**Extended (not replaced) from Phase 1:**
- `src/db/schema.ts` — Phase 1 tables kept verbatim; Phase 2 tables added
- `src/lib/calc.ts` — Phase 1 formulas untouched; added `calcEntitlement()` and the truck bag-counting rules engine
- `src/middleware.ts` — added new route entries to the existing `ROUTE_ROLES` map
- `src/app/api/records/route.ts` — **behavior change**: `POST` now rejects updates to an already-submitted day (409), per Phase 2 rule #2
- `src/app/(dashboard)/layout.tsx` — nav extended per role
- `src/app/(dashboard)/workers/page.tsx` — added truck assignment UI
- `src/app/(dashboard)/today/page.tsx` — rebuilt with confirmation modal + immutability
- `src/app/(dashboard)/current/page.tsx` — added `<LiveCameraPanel>` for Boss
- `src/lib/ui.tsx` — added `ConfirmModal`, `PasswordField`, `Splash`, `Skeleton`/`CardSkeleton`, `SubmittedFlash`
- `scripts/seed.ts` — extended with truck seeding and the two known worker/truck associations

**New:**
- `src/components/LiveCameraPanel.tsx`
- `src/app/api/debt/route.ts`
- `src/app/api/trucks/route.ts`
- `src/app/api/trips/route.ts`, `src/app/api/trips/[id]/route.ts`
- `src/app/api/ai/predictions/route.ts` (inference webhook boundary)
- `src/app/api/ai/corrections/route.ts`
- `src/app/api/ai/training-runs/route.ts`, `src/app/api/ai/training-runs/[id]/route.ts`
- `src/app/api/ai/model-versions/route.ts`
- `src/app/api/ai/discrepancies/route.ts`
- `src/app/api/camera/route.ts`
- `src/app/(dashboard)/debt/page.tsx`, `trips/page.tsx`, `camera/page.tsx`, `training-center/page.tsx`
- `scripts/test-calc.ts` — runs the spec's 15 numeric acceptance tests
- `drizzle/0001_phase2.sql`

## Database migrations created

- `drizzle/0000_init.sql` (regenerated to match current `schema.ts` — Phase 1, unchanged in substance)
- `drizzle/0001_phase2.sql` — additive only: `debt_repayments`, `trucks`, `truck_assignments`, `trips`, `trip_footage`, `ai_model_versions`, `ai_training_runs`, `ai_training_examples`, `discrepancy_reviews`, plus 5 new enums. No `ALTER`/`DROP` against any Phase 1 table.

## New API routes

| Route | Purpose |
|---|---|
| `GET/POST /api/debt` | Worker entitlement summary + immutable repayment submission |
| `GET/POST /api/trucks` | Truck registry (not hard-coded to 2) |
| `GET/POST /api/trips`, `PATCH /api/trips/[id]` | Trip lifecycle, physical count entry, rules-engine calculation |
| `POST /api/ai/predictions` | Real-inference webhook boundary (secret-gated, inert until connected) |
| `GET/POST /api/ai/corrections` | Boss review → auto-creates training examples, drives the 5-correction counter |
| `GET /api/ai/training-runs`, `PATCH /api/ai/training-runs/[id]` | Training-run lifecycle, real evaluation entry, gated promotion |
| `GET /api/ai/model-versions` | Version history per truck, production flag |
| `GET /api/ai/discrepancies` | AI/Boss-verified vs worker-reported bags, per day |
| `GET /api/camera` | Boss-only camera connection status (never fakes a stream) |

`records/route.ts` `POST` also changed behavior (see above).

## New UI components

`ConfirmModal`, `PasswordField`, `Splash`, `Skeleton`/`CardSkeleton`, `SubmittedFlash`, `LiveCameraPanel`, plus five new dashboard pages (Debt, Trips, Camera, Training Center) and an extended Workers page.

## New permissions

Middleware (`ROUTE_ROLES`) and every new API route enforce:
- `/debt` — worker only
- `/trips`, `/camera`, `/training-center` and all `/api/ai/*`, `/api/trucks`, `/api/trips*`, `/api/camera` — **boss only**. Admin is explicitly excluded from all of these per spec section 42, matching the existing `requireRole(["boss"])` pattern.
- Worker cannot reach a previous week's full table through any route, including `/api/records/[weekId]` (still boss-only) and `/api/debt` (returns only the aggregate figures, never a daily breakdown).

## AI/training architecture implemented

A full, real data model and workflow: trip → (optional real AI prediction via webhook) → Boss review/correction → automatic labelled training example → 5-per-truck-type counter → training run → **manually-entered real evaluation** → gated promotion → versioned, non-destructive model history. Dyna and Hijet counters and version sequences are fully separate (enforced by `truckType` on every table and every query).

**What is NOT implemented, and why:** no code here runs computer vision or trains a model. `POST /api/ai/predictions` is a real, secret-protected endpoint ready for a real inference service to call — until one is connected, `aiDepartureBags` stays `null` on every trip and the Boss works entirely from manually-entered physical counts, which is a fully functional standalone path. `PATCH /api/ai/training-runs/[id]` requires a human (or a connected pipeline) to supply a genuine `evaluationScore` — there is no code path that promotes a model without that explicit input. This follows the spec's own rule #52 ("do not create mock AI results and present them as real").

## Environment variables required

All in `.env.example`, new ones for Phase 2:
- `SEED_WORKER1_*` / `SEED_WORKER2_*` — the two known worker/truck seed associations
- `CAMERA_STREAM_URL`, `CAMERA_LABEL` — real HLS source; omitted → honest "not configured" state
- `AI_INFERENCE_WEBHOOK_SECRET` — gates `POST /api/ai/predictions`

## Anything that still requires external infrastructure

- **Live camera**: needs a real camera + NVR/streaming server producing an HLS (`.m3u8`) URL (e.g. Frigate, a cloud NVR, or an RTSP→HLS relay). The player, connection-state UI, and Boss-only access are complete and will go live the moment `CAMERA_STREAM_URL` points at a real stream.
- **Computer vision model**: needs real training compute and a labeled dataset (which this build starts accumulating automatically via Boss corrections). The webhook, review flow, training-run/counter logic, versioning, and promotion gate are complete; only the actual model and training job are external.
- **Trip footage storage**: `trip_footage.url` expects a real object-storage URL (S3/R2/etc.) — no upload pipeline was in scope here.

## Tests performed and results

`npx tsx scripts/test-calc.ts` runs all 15 numeric acceptance tests from spec section 50 against the deterministic rules engine (also independently verified with a standalone Node script during development). **All 15 passed**, including both threshold edge cases (Dyna at 124 vs 125 bags) and the Daihatsu top-bag example (90 + 14 = 104).

Not independently run here (no live database/browser in this environment): the full `npm install` → `db:migrate` → `db:seed` → `npm run dev` flow, and Test 8/10/11 (submission immutability, worker privacy, camera role gating) end-to-end. These are implemented per the routes and middleware described above, but you should run them once against a real Neon database before treating Phase 2 as verified in production. Recommended: run `npm run dev` locally, log in as each of the three seeded roles, and walk through Tests 8–15 by hand.
