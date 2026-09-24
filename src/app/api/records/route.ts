import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession } from "@/lib/session";
import { currentWeekStartISO, ensureWeekProvisioned, WEEKDAYS, weekdayForOffset, prevWeekStartISO } from "@/lib/weeks";
import { calcWeekTotals, calcCompanyWeekSummary, num, type RawDay } from "@/lib/calc";

async function loadWeekRaw(weekId: string, workerId: string): Promise<RawDay[]> {
  const rows = await db.select().from(schema.dailyRecords)
    .where(and(eq(schema.dailyRecords.weekId, weekId), eq(schema.dailyRecords.workerId, workerId)));
  return WEEKDAYS.map((wd) => {
    const r = rows.find((x) => x.weekday === wd);
    return {
      weekday: wd, bags: r?.bags ?? 0, cash: num(r?.cash), transfer: num(r?.transfer),
      roadExpenses: num(r?.roadExpenses), submitted: r?.submitted ?? false,
    };
  });
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const weekStartISO = currentWeekStartISO();
  const weekId = await ensureWeekProvisioned(weekStartISO);

  if (session.role === "worker") {
    const raw = await loadWeekRaw(weekId, session.userId);
    const { rows, totals } = calcWeekTotals(raw);
    return NextResponse.json({ weekStart: weekStartISO, worker: { rows, totals } });
  }

  const workers = await db.select().from(schema.users).where(eq(schema.users.role, "worker"));
  const [prevWeek] = await db.select().from(schema.weeks).where(eq(schema.weeks.weekStart, new Date(prevWeekStartISO(weekStartISO))));

  const perWorker = [];
  for (const w of workers) {
    const raw = await loadWeekRaw(weekId, w.id);
    const { rows, totals } = calcWeekTotals(raw);
    let previousOutstanding = 0;
    if (prevWeek) {
      const prevRaw = await loadWeekRaw(prevWeek.id, w.id);
      previousOutstanding = calcWeekTotals(prevRaw).totals.outstanding;
    }
    perWorker.push({ worker: { id: w.id, name: w.name, active: w.active }, rows, totals, previousOutstanding });
  }

  const expRows = await db.select().from(schema.factoryExpenses).where(eq(schema.factoryExpenses.weekId, weekId));
  const factoryTotal = expRows.reduce((a, r) => a + num(r.amount), 0);
  const nylonRows = await db.select().from(schema.nylonRollExpenses).where(eq(schema.nylonRollExpenses.weekId, weekId));
  const nylonTotal = nylonRows.reduce((a, r) => a + num(r.amount), 0);
  const summary = calcCompanyWeekSummary(perWorker.map((p) => p.totals), factoryTotal, nylonTotal);

  return NextResponse.json({ weekStart: weekStartISO, workers: perWorker, summary });
}

/**
 * PHASE 2 RULE #2 — WORKER SUBMISSION IMMUTABILITY.
 * A worker may only submit a given day ONCE. If the row is already
 * `submitted = true`, this endpoint rejects the request with 409 —
 * it never silently overwrites a finalized record. There is no
 * server-side "edit" path for a submitted daily report at all.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (session.role !== "worker") {
    return NextResponse.json({ error: "Only workers submit their own daily report." }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const weekday = body?.weekday as string;
  if (!WEEKDAYS.includes(weekday as any)) return NextResponse.json({ error: "Invalid weekday." }, { status: 400 });

  const bags = Math.max(0, Math.trunc(Number(body?.bags) || 0));
  const cash = Math.max(0, Number(body?.cash) || 0);
  const transfer = Math.max(0, Number(body?.transfer) || 0);
  const roadExpenses = Math.max(0, Number(body?.roadExpenses) || 0);

  const weekStartISO = currentWeekStartISO();
  const weekId = await ensureWeekProvisioned(weekStartISO);

  const [existing] = await db.select().from(schema.dailyRecords).where(
    and(eq(schema.dailyRecords.weekId, weekId), eq(schema.dailyRecords.workerId, session.userId), eq(schema.dailyRecords.weekday, weekday as any))
  );
  if (existing?.submitted) {
    return NextResponse.json(
      { error: "This day's report has already been submitted and cannot be changed. Contact the Boss if a correction is genuinely needed." },
      { status: 409 }
    );
  }

  await db.update(schema.dailyRecords).set({
    bags, cash: String(cash), transfer: String(transfer), roadExpenses: String(roadExpenses),
    submitted: true, submittedAt: new Date(), updatedAt: new Date(),
  }).where(and(eq(schema.dailyRecords.weekId, weekId), eq(schema.dailyRecords.workerId, session.userId), eq(schema.dailyRecords.weekday, weekday as any)));

  const raw = await loadWeekRaw(weekId, session.userId);
  const { rows, totals } = calcWeekTotals(raw);
  return NextResponse.json({ weekStart: weekStartISO, worker: { rows, totals } });
}
