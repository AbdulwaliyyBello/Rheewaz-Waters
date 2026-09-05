import { NextRequest, NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import { calcWeekTotals, calcCompanyWeekSummary, num, type RawDay } from "@/lib/calc";
import { WEEKDAYS } from "@/lib/weeks";

const RANGE_WEEKS: Record<string, number> = { "1W": 1, "1M": 4, "6M": 26, "1Y": 52 };

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export async function GET(req: NextRequest) {
  const gate = await requireRole(["boss"]);
  if ("error" in gate) return gate.error;

  const range = req.nextUrl.searchParams.get("range") || "1M";
  const limit = RANGE_WEEKS[range] ?? 4;

  const recentWeeks = await db.select().from(schema.weeks).orderBy(desc(schema.weeks.weekStart)).limit(limit);
  recentWeeks.reverse(); // chronological order for charting

  const result = [];
  for (const week of recentWeeks) {
    const recordRows = await db.select().from(schema.dailyRecords).where(eq(schema.dailyRecords.weekId, week.id));
    const workerIds = Array.from(new Set(recordRows.map((r) => r.workerId)));

    const perWorkerTotals = workerIds.map((workerId) => {
      const raw: RawDay[] = WEEKDAYS.map((wd) => {
        const r = recordRows.find((x) => x.workerId === workerId && x.weekday === wd);
        return {
          weekday: wd,
          bags: r?.bags ?? 0,
          cash: num(r?.cash),
          transfer: num(r?.transfer),
          roadExpenses: num(r?.roadExpenses),
          submitted: r?.submitted ?? false,
        };
      });
      return calcWeekTotals(raw).totals;
    });

    const expRows = await db.select().from(schema.factoryExpenses).where(eq(schema.factoryExpenses.weekId, week.id));
    const factoryTotal = expRows.reduce((a, r) => a + num(r.amount), 0);
    const nylonRows = await db
      .select()
      .from(schema.nylonRollExpenses)
      .where(eq(schema.nylonRollExpenses.weekId, week.id));
    const nylonTotal = nylonRows.reduce((a, r) => a + num(r.amount), 0);

    const summary = calcCompanyWeekSummary(perWorkerTotals, factoryTotal, nylonTotal);
    const bags = perWorkerTotals.reduce((a, t) => a + t.bags, 0);

    result.push({
      weekStart: toISO(new Date(week.weekStart)),
      bags,
      grossIncome: summary.grossIncome,
      nylon: nylonTotal,
      netOfNylon: summary.grossIncome - nylonTotal,
    });
  }

  return NextResponse.json({ range, data: result });
}
