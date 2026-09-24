import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";

const TRAINING_BATCH_SIZE = 5;

export async function GET(req: NextRequest) {
  const gate = await requireRole(["boss"]);
  if ("error" in gate) return gate.error;
  const truckType = req.nextUrl.searchParams.get("truckType") as "dyna" | "hijet" | null;

  const rows = truckType
    ? await db.select().from(schema.aiTrainingExamples).where(eq(schema.aiTrainingExamples.truckType, truckType))
    : await db.select().from(schema.aiTrainingExamples);

  return NextResponse.json({ examples: rows });
}

/**
 * PHASE 2 RULE #24/#28 — Boss reviews a trip's final count. If the trip
 * carries a real AI prediction (aiDepartureBags is not null — i.e. a real
 * inference service actually ran via /api/ai/predictions), this correction
 * automatically becomes a labelled training example: no separate
 * "save to training" step, and both the AI value and the Boss's value are
 * preserved forever (rule #31: never overwrite aiDepartureBags).
 *
 * If there is no AI prediction yet, this is simply the Boss's manual final
 * count for the trip — real and authoritative, but it does not fabricate a
 * training example against a prediction that never existed.
 */
export async function POST(req: NextRequest) {
  const gate = await requireRole(["boss"]);
  if ("error" in gate) return gate.error;

  const body = await req.json().catch(() => null);
  const tripId = body?.tripId as string;
  const bossActualBags = Number(body?.bossActualBags);
  const errorType = body?.errorType as string | undefined;
  const bossNote = body?.bossNote as string | undefined;

  if (!tripId || !Number.isFinite(bossActualBags)) {
    return NextResponse.json({ error: "tripId and bossActualBags are required." }, { status: 400 });
  }

  const [trip] = await db.select().from(schema.trips).where(eq(schema.trips.id, tripId));
  if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  const [truck] = await db.select().from(schema.trucks).where(eq(schema.trucks.id, trip.truckId));
  if (!truck) return NextResponse.json({ error: "Truck not found." }, { status: 404 });

  await db.update(schema.trips).set({
    bossFinalBags: bossActualBags,
    reviewedBy: gate.session.userId,
    reviewedAt: new Date(),
    status: "boss_reviewed",
    updatedAt: new Date(),
  }).where(eq(schema.trips.id, tripId));

  let trainingExampleCreated = false;
  let trainingRunCreated: string | null = null;

  if (trip.aiDepartureBags != null) {
    if (!errorType) {
      return NextResponse.json({ error: "errorType is required when correcting a real AI prediction." }, { status: 400 });
    }
    await db.insert(schema.aiTrainingExamples).values({
      tripId, truckType: truck.type, aiPredictedBags: trip.aiDepartureBags, bossActualBags,
      errorType: errorType as any, bossNote, modelVersionId: trip.aiModelVersionId ?? null, reviewedBy: gate.session.userId,
    });
    trainingExampleCreated = true;

    // Truck-specific counter: only batch examples not yet assigned to a run.
    const unbatched = await db.select().from(schema.aiTrainingExamples)
      .where(and(eq(schema.aiTrainingExamples.truckType, truck.type), isNull(schema.aiTrainingExamples.trainingRunId)));

    if (unbatched.length >= TRAINING_BATCH_SIZE) {
      const batch = unbatched.slice(0, TRAINING_BATCH_SIZE);
      const [run] = await db.insert(schema.aiTrainingRuns).values({
        truckType: truck.type,
        status: "training", // ready for an external training job to pick up — never auto-promoted (rule #32)
        startedTrainingAt: new Date(),
        notes: "Awaiting external training pipeline. Evaluate and promote via PATCH /api/ai/training-runs/[id] once a real candidate model has been trained and evaluated.",
      }).returning();
      for (const ex of batch) {
        await db.update(schema.aiTrainingExamples).set({ trainingRunId: run.id }).where(eq(schema.aiTrainingExamples.id, ex.id));
      }
      trainingRunCreated = run.id;
    }
  }

  return NextResponse.json({ ok: true, trainingExampleCreated, trainingRunCreated });
}
