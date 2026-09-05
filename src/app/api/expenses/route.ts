import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole, getSession } from "@/lib/session";
import { currentWeekStartISO, ensureWeekProvisioned, WEEKDAYS, weekdayForOffset } from "@/lib/weeks";
import { num } from "@/lib/calc";

export async function GET() {
  const gate = await requireRole(["boss", "admin"]);
  if ("error" in gate) return gate.error;

  const weekStartISO = currentWeekStartISO();
  const weekId = await ensureWeekProvisioned(weekStartISO);

  const factoryRows = await db.select().from(schema.factoryExpenses).where(eq(schema.factoryExpenses.weekId, weekId));
  const nylonRows = await db
    .select()
    .from(schema.nylonRollExpenses)
    .where(eq(schema.nylonRollExpenses.weekId, weekId));

  const days = WEEKDAYS.map((wd) => {
    const f = factoryRows.find((r) => r.weekday === wd);
    const nylonForDay = nylonRows.filter((r) => r.weekday === wd);
    return {
      weekday: wd,
      factory: num(f?.amount),
      submitted: f?.submitted ?? false,
      nylon: nylonForDay.map((n) => ({ id: n.id, amount: num(n.amount) })),
    };
  });

  return NextResponse.json({
    weekStart: weekStartISO,
    days,
    factoryTotal: factoryRows.reduce((a, r) => a + num(r.amount), 0),
    nylonTotal: nylonRows.reduce((a, r) => a + num(r.amount), 0),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireRole(["admin", "boss"]);
  if ("error" in gate) return gate.error;
  const session = await getSession();

  const body = await req.json().catch(() => null);
  const weekday = body?.weekday as string;
  if (!WEEKDAYS.includes(weekday as any)) {
    return NextResponse.json({ error: "Invalid weekday." }, { status: 400 });
  }
  const factoryAmount = Math.max(0, Number(body?.factoryAmount) || 0);
  const nylonYes = Boolean(body?.nylonYes);
  const nylonAmount = Math.max(0, Number(body?.nylonAmount) || 0);

  const weekStartISO = currentWeekStartISO();
  const weekId = await ensureWeekProvisioned(weekStartISO);
  const { dateISO } = weekdayForOffset(weekStartISO, WEEKDAYS.indexOf(weekday as any));

  await db
    .update(schema.factoryExpenses)
    .set({
      amount: String(factoryAmount),
      submitted: true,
      createdBy: session!.userId,
      updatedAt: new Date(),
    })
    .where(and(eq(schema.factoryExpenses.weekId, weekId), eq(schema.factoryExpenses.weekday, weekday as any)));

  // Nylon rolls are logged as their own event rows, deliberately kept OUT of
  // the factory_expenses total so they don't distort weekly operational accounting.
  if (nylonYes && nylonAmount > 0) {
    await db.insert(schema.nylonRollExpenses).values({
      weekId,
      weekday: weekday as any,
      date: new Date(dateISO),
      amount: String(nylonAmount),
      createdBy: session!.userId,
    });
  }

  return NextResponse.json({ ok: true });
}
