import { NextRequest, NextResponse } from "next/server";
import { and, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";

/**
 * Compares AI/Boss-verified company bags (from trips) against
 * worker-reported bags (from daily_records) per worker/day. This is a
 * verification discrepancy only — per spec rule #25, it never implies or
 * records wrongdoing, just a number mismatch to review.
 */
export async function GET(req: NextRequest) {
  const gate = await requireRole(["boss"]);
  if ("error" in gate) return gate.error;

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");

  const trips = from && to
    ? await db.select().from(schema.trips).where(and(gte(schema.trips.date, new Date(from)), lte(schema.trips.date, new Date(to))))
    : await db.select().from(schema.trips);

  const records = await db.select().from(schema.dailyRecords);
  const workers = await db.select().from(schema.users);

  const byWorkerDate = new Map<string, { verifiedBags: number; workerReportedBags: number; workerId: string; date: string }>();

  for (const t of trips) {
    const verified = t.bossFinalBags ?? t.companyBags;
    if (verified == null) continue;
    const dateKey = new Date(t.date).toISOString().slice(0, 10);
    const key = `${t.workerId}:${dateKey}`;
    const entry = byWorkerDate.get(key) ?? { verifiedBags: 0, workerReportedBags: 0, workerId: t.workerId, date: dateKey };
    entry.verifiedBags += verified;
    byWorkerDate.set(key, entry);
  }
  for (const r of records) {
    if (!r.submitted) continue;
    const dateKey = new Date(r.date).toISOString().slice(0, 10);
    const key = `${r.workerId}:${dateKey}`;
    const entry = byWorkerDate.get(key);
    if (entry) entry.workerReportedBags += r.bags;
  }

  const results = Array.from(byWorkerDate.values()).map((e) => ({
    ...e,
    workerName: workers.find((w) => w.id === e.workerId)?.name ?? "Unknown",
    difference: e.workerReportedBags - e.verifiedBags,
    status: e.workerReportedBags === e.verifiedBags ? "verified" : "review_required",
  }));

  return NextResponse.json({ discrepancies: results });
}
