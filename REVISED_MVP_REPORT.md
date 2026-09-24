# Rheewaz Waters — Revised MVP Report (CCTV/AI frozen until December)

## What was reverted

**Nothing was deleted.** Per your instruction not to touch the camera/AI/
networking work, all Phase 2 CCTV/AI files remain exactly as they were:
`src/components/LiveCameraPanel.tsx`, `src/app/(dashboard)/camera/`,
`src/app/(dashboard)/trips/`, `src/app/(dashboard)/training-center/`, and
every `/api/ai/*`, `/api/trips*`, `/api/trucks`, `/api/camera` route.

What changed is **exposure**, not code:
- Removed "Trips", "Camera", and "AI Training" from the Boss navigation (`src/app/(dashboard)/layout.tsx`) — Boss now sees Current Week, Previous Weeks, Analytics, Workers, Settings only.
- Removed the `<LiveCameraPanel>` embed from the Boss's Current Week page (`src/app/(dashboard)/current/page.tsx`).

The routes still exist and would still work if someone navigated to
`/camera`, `/trips`, or `/training-center` directly (middleware still
protects them, boss-only), but nothing in the active app links to them
anymore. This is a deliberate "freeze," not a removal, so December's work
can pick back up without rebuilding.

## What was added

**1. Remember Me (secure, no password storage)**
- `src/lib/session.ts`: session TTL is now variable — 1 day by default, 30 days when "Remember me" is checked. The cookie itself has no `maxAge` (true browser-session cookie) unless remembered. The password is never touched beyond its existing bcrypt verification — only the signed JWT's expiry changes.
- `src/app/api/auth/login/route.ts`: accepts `rememberMe` and passes it through.
- `src/app/login/page.tsx`: added the checkbox.

**2. Worker "My Week" combined summary**
- Rewrote `src/app/(dashboard)/myweek/page.tsx` to show, on one page: bags/price/cash/transfer/road expenses/commission (from `/api/records`) *and* previous outstanding/repayments/remaining debt/entitlement (from `/api/debt`), plus the existing daily table — matching spec section 4 exactly, reusing both APIs that already existed rather than adding new ones.

**3. Session-expiration handling**
- `src/lib/api-client.ts`: any `401` now redirects to `/login` centrally, instead of every page needing its own handling.

**4. Branded, data-driven loading states**
- Added `AppLoading` (small animated dot loader under the wordmark) to `src/lib/ui.tsx`, used in the dashboard shell while the session is being fetched — replaces a plain "Loading…" text, and lasts exactly as long as the real fetch (not a fixed timer).
- Added `CardSkeleton`-based loading states (already existed as a primitive from Phase 2, now applied more broadly) to Debt, Factory Expenses, Today's Report, Analytics, Previous Weeks, and Workers pages, replacing plain "Loading…" text and the split-second empty-state flash before the first fetch resolves.

**Everything else asked for in this revision already existed from the prior
build and was left as-is, reused rather than duplicated:**
- Debt repayment (`/api/debt`, `debt_repayments` table) — dedicated entity, immutable, full/partial repayment, server-validated against the live remaining balance
- Commission Payable / entitlement formula (`calcEntitlement` in `src/lib/calc.ts`) — already exactly `Current Week Commission − Remaining Previous Debt`, remaining computed as previous outstanding minus repayments (never double-subtracted)
- Confirmation-modal + immutable submission flow for the daily report (`/today`) and debt repayment (`/debt`), with the confirm button disabled while the request is in flight
- Password visibility toggle (`PasswordField` component)
- Server-side enforcement of all financial calculations and submission immutability (`POST /api/records` rejects updates to an already-submitted day with 409; `POST /api/debt` rejects repayments exceeding the live remaining balance)
- Boss/Admin/Worker role boundaries (middleware + `requireRole()` on every route)

## Database / migration changes

None. This revision is UI/session-logic only — no schema changes.

## API changes

- `POST /api/auth/login` — now accepts an optional `rememberMe: boolean` in the request body (backward compatible; omitting it behaves as `false`).

No other endpoint's request/response shape changed.

## UI changes

- Boss nav: Trips/Camera/AI Training removed.
- Boss Current Week page: camera panel removed.
- Login: Remember me checkbox added.
- My Week: rebuilt as a combined sales + debt + entitlement view.
- Debt, Factory Expenses, Today's Report, Analytics, Previous Weeks, Workers: skeleton loading states instead of plain "Loading…" text or a flash of the empty state.
- Dashboard shell: branded `AppLoading` instead of plain text while the session loads.

## Security / authorization changes

- Session cookie behavior is now explicit about persistence (session-only vs 30-day) rather than always persisting for 7 days regardless of user intent — a small hardening, since a shared/public device now defaults to a session that dies when the browser closes.
- No change to how authorization is enforced (still fully server-side via `requireRole()`/`getSession()` on every route and `middleware.ts` on every protected page).

## Tests run and results

`npx tsx scripts/test-calc.ts` (equivalently verified via a standalone Node
script during this session): **all 15 numeric acceptance tests still pass**,
confirming this revision didn't touch the underlying price/outstanding/
commission/entitlement/bag-counting formulas.

Not independently run here (no live database/browser in this sandbox): the
full `npm install` → `db:migrate` → `db:seed` → `npm run dev` flow, and a
manual walk-through of the Remember Me cookie lifetime and the My Week page
against real data. Recommended before shipping: log in with and without
Remember Me checked and confirm the cookie's expiry in devtools; submit a
daily report and a partial repayment and confirm both lock immediately and
survive a refresh.

## Remaining limitations

- The frozen CCTV/AI code is untouched and unverified against this
  session's changes — it wasn't exercised, and per your instruction it
  should be treated as out of scope until December.
- No automated end-to-end test suite runs in this environment; the
  acceptance-test coverage that does run is the pure-calculation layer only.
