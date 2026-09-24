import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

const { weeks, dailyRecords, factoryExpenses, users } = schema;

export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
const TZ = "Africa/Lagos";

function nowInLagos(): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return new Date(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
}
function toISODate(d: Date): string {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function addDays(d: Date, n: number): Date { const r = new Date(d); r.setDate(r.getDate() + n); return r; }

export function currentWeekMonday(): Date {
  const now = nowInLagos();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = addDays(now, diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}
export function currentWeekStartISO(): string { return toISODate(currentWeekMonday()); }
export function weekdayForOffset(mondayISO: string, offset: number): { weekday: Weekday; dateISO: string } {
  const monday = new Date(mondayISO + "T00:00:00");
  const d = addDays(monday, offset);
  return { weekday: WEEKDAYS[offset], dateISO: toISODate(d) };
}

export async function ensureWeekProvisioned(weekStartISO: string): Promise<string> {
  let [week] = await db.select().from(weeks).where(eq(weeks.weekStart, new Date(weekStartISO)));
  if (!week) {
    const weekEnd = toISODate(addDays(new Date(weekStartISO + "T00:00:00"), 5));
    const inserted = await db.insert(weeks)
      .values({ weekStart: new Date(weekStartISO), weekEnd: new Date(weekEnd), status: "open" })
      .onConflictDoNothing({ target: weeks.weekStart }).returning();
    week = inserted[0] ?? (await db.select().from(weeks).where(eq(weeks.weekStart, new Date(weekStartISO))))[0];
  }
  const activeWorkers = await db.select().from(users).where(and(eq(users.role, "worker"), eq(users.active, true)));
  for (let offset = 0; offset < 6; offset++) {
    const { weekday, dateISO } = weekdayForOffset(weekStartISO, offset);
    await db.insert(factoryExpenses).values({
      weekId: week.id, weekday, date: new Date(dateISO), amount: "0", submitted: false, createdBy: null,
    }).onConflictDoNothing({ target: [factoryExpenses.weekId, factoryExpenses.weekday] });
    for (const worker of activeWorkers) {
      await db.insert(dailyRecords).values({
        weekId: week.id, workerId: worker.id, weekday, date: new Date(dateISO),
        bags: 0, cash: "0", transfer: "0", roadExpenses: "0", submitted: false,
      }).onConflictDoNothing({ target: [dailyRecords.weekId, dailyRecords.workerId, dailyRecords.weekday] });
    }
  }
  return week.id;
}

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
  await ensureWeekProvisioned(currentMondayISO);
  return closedIds;
}

export function prevWeekStartISO(weekStartISO: string): string {
  const d = new Date(weekStartISO + "T00:00:00");
  d.setDate(d.getDate() - 7);
  return toISODate(d);
}
