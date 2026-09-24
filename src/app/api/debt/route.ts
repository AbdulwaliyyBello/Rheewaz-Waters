import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession, requireRole } from "@/lib/session";
import { currentWeekStartISO, ensureWeekProvisioned, prevWeekStartISO, WEEKDAYS } from "@/lib/weeks";
import { calcWeekTotals, calcEntitlement, num, type RawDay } from "@/lib/calc";

async function loadWeekRaw(weekId: string, workerId: string): Promise<RawDay[]> {
  const rows = await db.select().from(schema.dailyRecords)
    .where(and(eq(schema.dailyRecords.weekId, weekId), eq(schema.dailyRecords.workerId, workerId)));
  return WEEKDAYS.map((wd) => {
    const r = rows.find((x) => x.weekday === wd);
    return { weekday: wd, bags: r?.bags ?? 0, cash: num(r?.cash), transfer: num(r?.transfer), roadExpenses: num(r?.roadExpenses), submitted: r?.submitted ?? false };
  });
}

/**
 * Returns everything a worker is allowed to know about their debt/entitlement
 * WITHOUT exposing the previous week's full daily table (Phase 2 rule #44).
 */
async function buildDebtSummary(workerId: string) {
  const weekStartISO = currentWeekStartISO();
  const weekId = await ensureWeekProvisioned(weekStartISO);
  const currentRaw = await loadWeekRaw(weekId, workerId);
  const currentTotals = calcWeekTotals(currentRaw).totals;

  const prevStartISO = prevWeekStartISO(weekStartISO);
  const [prevWeek] = await db.select().from(schema.weeks).where(eq(schema.weeks.weekStart, new Date(prevStartISO)));

  let previousOutstanding = 0;
  let repayments: { id: string; amount: number; remainingOutstanding: number; submittedAt: Date }[] = [];
  if (prevWeek) {
    const prevRaw = await loadWeekRaw(prevWeek.id, workerId);
    previousOutstanding = calcWeekTotals(prevRaw).totals.outstanding;

    const repaymentRows = await db.select().from(schema.debtRepayments)
      .where(and(eq(schema.debtRepayments.workerId, workerId), eq(schema.debtRepayments.sourceWeekId, prevWeek.id)));
    repayments = repaymentRows.map((r) => ({ id: r.id, amount: num(r.amount), remainingOutstanding: num(r.remainingOutstanding), submittedAt: r.submittedAt }));
  }

  const repaymentsMade = repayments.reduce((a, r) => a + r.amount, 0);
  const { remainingOutstanding, entitlement } = calcEntitlement(currentTotals.commission, previousOutstanding, repaymentsMade);

  return {
    weekStart: weekStartISO,
    bagsSold: currentTotals.bags,
    currentWeekCommission: currentTotals.commission,
    previousOutstanding,
    repaymentsMade,
    remainingOutstanding,
    entitlement,
    repayments,
    prevWeekId: prevWeek?.id ?? null,
  };
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  let workerId = session.userId;
  if (session.role !== "worker") {
    const gate = await requireRole(["boss", "admin"]);
    if ("error" in gate) return gate.error;
    const q = req.nextUrl.searchParams.get("workerId");
    if (!q) return NextResponse.json({ error: "workerId query param required." }, { status: 400 });
    workerId = q;
  }

  const summary = await buildDebtSummary(workerId);
  return NextResponse.json(summary);
}

/**
 * PHASE 2 RULE #5/#6/#7 — repayment is append-only and immutable.
 * Validates: 0 < amount <= remaining outstanding. Server computes the
 * remaining balance independently; the client-submitted "amount" is the
 * only trusted input, everything else is derived here.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  if (session.role !== "worker") return NextResponse.json({ error: "Only the worker can repay their own debt." }, { status: 403 });

  const body = await req.json().catch(() => null);
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Repayment amount must be a positive number." }, { status: 400 });
  }

  const summary = await buildDebtSummary(session.userId);
  if (!summary.prevWeekId) {
    return NextResponse.json({ error: "There is no previous week on record to repay against." }, { status: 400 });
  }
  if (summary.remainingOutstanding <= 0) {
    return NextResponse.json({ error: "There is no outstanding balance to repay." }, { status: 400 });
  }
  if (amount > summary.remainingOutstanding) {
    return NextResponse.json({ error: `Repayment cannot exceed the remaining outstanding balance of ₦${summary.remainingOutstanding.toLocaleString()}.` }, { status: 400 });
  }

  const remainingAfter = summary.remainingOutstanding - amount;

  const [repayment] = await db.insert(schema.debtRepayments).values({
    workerId: session.userId,
    sourceWeekId: summary.prevWeekId,
    previousOutstanding: String(summary.remainingOutstanding), // balance immediately before this repayment
    amount: String(amount),
    remainingOutstanding: String(remainingAfter),
    submittedByUserId: session.userId,
  }).returning();

  const updated = await buildDebtSummary(session.userId);
  return NextResponse.json({ repayment: { id: repayment.id, amount, remainingOutstanding: remainingAfter }, summary: updated });
}
