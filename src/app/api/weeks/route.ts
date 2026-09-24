import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import { currentWeekStartISO } from "@/lib/weeks";

function toISO(d: Date) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, "0"), day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
export async function GET() {
  const gate = await requireRole(["boss"]);
  if ("error" in gate) return gate.error;
  const all = await db.select().from(schema.weeks).orderBy(desc(schema.weeks.weekStart));
  const currentISO = currentWeekStartISO();
  return NextResponse.json({
    weeks: all.map((w) => ({ weekStart: toISO(new Date(w.weekStart)), status: w.status })).filter((w) => w.weekStart !== currentISO),
  });
}
