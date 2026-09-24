import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull, desc, count } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";

const TRAINING_BATCH_SIZE = 5;

export async function GET(req: NextRequest) {
  const gate = await requireRole(["boss"]);
  if ("error" in gate) return gate.error;
  const truckType = req.nextUrl.searchParams.get("truckType") as "dyna" | "hijet" | null;

  const runs = truckType
    ? await db.select().from(schema.aiTrainingRuns).where(eq(schema.aiTrainingRuns.truckType, truckType)).orderBy(desc(schema.aiTrainingRuns.createdAt))
    : await db.select().from(schema.aiTrainingRuns).orderBy(desc(schema.aiTrainingRuns.createdAt));

  // Truck-specific "next training in N more corrections" counters — Dyna and
  // Daihatsu are never mixed (spec rule #29).
  const counters: Record<string, { unbatched: number; remaining: number }> = {};
  for (const t of ["dyna", "hijet"] as const) {
    const unbatched = await db.select().from(schema.aiTrainingExamples)
      .where(and(eq(schema.aiTrainingExamples.truckType, t), isNull(schema.aiTrainingExamples.trainingRunId)));
    counters[t] = { unbatched: unbatched.length, remaining: Math.max(0, TRAINING_BATCH_SIZE - unbatched.length) };
  }

  return NextResponse.json({ runs, counters });
}
