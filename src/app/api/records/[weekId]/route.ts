import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import { WEEKDAYS } from "@/lib/weeks";
import { calcWeekTotals, calcCompanyWeekSummary, num, type RawDay } from "@/lib/calc";

// PHASE 2 RULE #44 — this route is Boss-only. Workers must never be able to
// pull a previous week's complete records via this or any other endpoint.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ weekId: string }> }) {
  const gate = await requireRole(["boss"]);
  if ("error" in gate) return gate.error;
  const { weekId: weekStartISO } = await params;

  const [week] = await db.select().from(schema.weeks).where(eq(schema.weeks.weekStart, new Date(weekStartISO)));
  if (!week) return NextResponse.json({ error: "No such week on record." }, { status: 404 });

  const recordRows = await db.select().from(schema.dailyRecords).where(eq(schema.dailyRecords.weekId, week.id));
  const workerIds = Array.from(new Set(recordRows.map((r) => r.workerId)));

  const perWorker = [];
  for (const workerId of workerIds) {
    const [w] = await db.select().from(schema.users).where(eq(schema.users.id, workerId));
    const raw: RawDay[] = WEEKDAYS.map((wd) => {
      const r = recordRows.find((x) => x.workerId === workerId && x.weekday === wd);
      return { weekday: wd, bags: r?.bags ?? 0, cash: num(r?.cash), transfer: num(r?.transfer), roadExpenses: num(r?.roadExpenses), submitted: r?.submitted ?? false };
    });
    const { rows, totals } = calcWeekTotals(raw);
    perWorker.push({ worker: { id: workerId, name: w?.name ?? "Unknown", active: w?.active ?? false }, rows, totals });
  }

  const expRows = await db.select().from(schema.factoryExpenses).where(eq(schema.factoryExpenses.weekId, week.id));
  const factoryTotal = expRows.reduce((a, r) => a + num(r.amount), 0);
  const nylonRows = await db.select().from(schema.nylonRollExpenses).where(eq(schema.nylonRollExpenses.weekId, week.id));
  const nylonTotal = nylonRows.reduce((a, r) => a + num(r.amount), 0);
  const summary = calcCompanyWeekSummary(perWorker.map((p) => p.totals), factoryTotal, nylonTotal);

  return NextResponse.json({ weekStart: weekStartISO, status: week.status, workers: perWorker, summary });
}
