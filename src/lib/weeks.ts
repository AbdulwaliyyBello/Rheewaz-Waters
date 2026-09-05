import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { weeks, dailyRecords, factoryExpenses, users } = schema;

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Weekday = (typeof WEEKDAYS)[number];

const TZ = "Africa/Lagos"; // WAT, UTC+1, no DST

/** Current date/time as a Date whose Y/M/D reflect Africa/Lagos wall-clock time. */
function nowInLagos(): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return new Date(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/**
 * Monday of the "current" operating week, per the spec:
 * the week runs Mon–Sat and closes at Sunday 23:59:59 WAT.
 * So while today IS Sunday, the current week is still the week that
 * just finished (Mon–Sat before this Sunday) — it hasn't rolled yet.
 * Once it becomes Monday, the new week begins.
 */
export function currentWeekMonday(): Date {
  const now = nowInLagos();
  const day = now.getDay(); // 0 = Sun .. 6 = Sat
  const diff = day === 0 ? -6 : 1 - day;
  const monday = addDays(now, diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function currentWeekStartISO(): string {
  return toISODate(currentWeekMonday());
}

export function weekdayForOffset(mondayISO: string, offset: number): { weekday: Weekday; dateISO: string } {
  const monday = new Date(mondayISO + "T00:00:00");
  const d = addDays(monday, offset);
  return { weekday: WEEKDAYS[offset], dateISO: toISODate(d) };
}

/**
 * Idempotently ensures a `weeks` row exists for the given Monday, and that
 * every active worker + the company has all six Mon–Sat rows in
 * daily_records / factory_expenses (created at zero, matching the spec's
 * "rows must exist even before anyone enters data" requirement).
 * Safe to call on every page load — all writes are upserts.
 */
export async function ensureWeekProvisioned(weekStartISO: string): Promise<string> {
  let [week] = await db.select().from(weeks).where(eq(weeks.weekStart, new Date(weekStartISO)));

  if (!week) {
    const weekEnd = toISODate(addDays(new Date(weekStartISO + "T00:00:00"), 5));
    const inserted = await db
      .insert(weeks)
      .values({ weekStart: new Date(weekStartISO), weekEnd: new Date(weekEnd), status: "open" })
      .onConflictDoNothing({ target: weeks.weekStart })
      .returning();
    week = inserted[0] ?? (await db.select().from(weeks).where(eq(weeks.weekStart, new Date(weekStartISO))))[0];
  }

  const activeWorkers = await db.select().from(users).where(and(eq(users.role, "worker"), eq(users.active, true)));

  for (let offset = 0; offset < 6; offset++) {
    const { weekday, dateISO } = weekdayForOffset(weekStartISO, offset);

    // Factory expenses row (company-wide, one per day). created_by is left
    // null until an Admin actually saves a value for that day.
    await db
      .insert(factoryExpenses)
      .values({
        weekId: week.id,
        weekday,
        date: new Date(dateISO),
        amount: "0",
        submitted: false,
        createdBy: null,
      })
      .onConflictDoNothing({ target: [factoryExpenses.weekId, factoryExpenses.weekday] });

    // Daily record row per active worker
    for (const worker of activeWorkers) {
      await db
        .insert(dailyRecords)
        .values({
          weekId: week.id,
          workerId: worker.id,
          weekday,
          date: new Date(dateISO),
          bags: 0,
          cash: "0",
          transfer: "0",
          roadExpenses: "0",
          submitted: false,
        })
        .onConflictDoNothing({ target: [dailyRecords.weekId, dailyRecords.workerId, dailyRecords.weekday] });
    }
  }

  return week.id;
}

/**
 * Closes any week whose Saturday has fully passed (i.e. every week
 * before the current Monday) and are still marked 'open'. Call this
 * from the Vercel Cron endpoint (see app/api/weeks/rollover) — Vercel
 * Cron itself is what provides "run at Sunday 23:59:59 WAT" reliability;
 * this function is the idempotent unit of work it triggers.
 */
export async function closeElapsedWeeks(): Promise<string[]> {
  const currentMondayISO = currentWeekStartISO();
  const openWeeks = await db.select().from(weeks).where(eq(weeks.status, "open"));
  const closedIds: string[] = [];
  for (const w of openWeeks) {
    const wStartISO = toISODate(new Date(w.weekStart));
    if (wStartISO < currentMondayISO) {
      await db.update(weeks).set({ status: "closed", closedAt: new Date() }).where(eq(weeks.id, w.id));
      closedIds.push(w.id);
    }
  }
  // Make sure the new current week already has its rows waiting.
  await ensureWeekProvisioned(currentMondayISO);
  return closedIds;
}
