import { NextRequest, NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";

/**
 * PHASE 2 RULE #32 — a newly trained model must be EVALUATED before it can
 * replace the current production model. This route records a real
 * evaluation result (entered by whoever ran the actual training — the Boss,
 * a developer, or a connected training pipeline) and only then promotes.
 * There is no automatic, unevaluated promotion anywhere in this codebase.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["boss"]);
  if ("error" in gate) return gate.error;
  const { id } = await params;

  const [run] = await db.select().from(schema.aiTrainingRuns).where(eq(schema.aiTrainingRuns.id, id));
  if (!run) return NextResponse.json({ error: "Training run not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const evaluationScore = body?.evaluationScore != null ? Number(body.evaluationScore) : null;
  const evaluationNotes = body?.evaluationNotes as string | undefined;
  const promote = Boolean(body?.promote);

  if (evaluationScore == null) {
    return NextResponse.json({ error: "evaluationScore is required to record an evaluation." }, { status: 400 });
  }

  await db.update(schema.aiTrainingRuns).set({
    status: promote ? "promoted" : "rejected",
    evaluatedAt: new Date(),
    notes: evaluationNotes ?? run.notes,
  }).where(eq(schema.aiTrainingRuns.id, id));

  if (!promote) {
    return NextResponse.json({ ok: true, promoted: false });
  }

  // Auto-generate the next version number for this truck type.
  const existing = await db.select().from(schema.aiModelVersions)
    .where(eq(schema.aiModelVersions.truckType, run.truckType)).orderBy(desc(schema.aiModelVersions.version));
  const nextVersion = (existing[0]?.version ?? 0) + 1;

  // Demote any currently-production version for this truck type — we keep
  // it in the table (rule: never remove previous model versions), just flip
  // the flag.
  for (const v of existing) {
    if (v.isProduction) await db.update(schema.aiModelVersions).set({ isProduction: false }).where(eq(schema.aiModelVersions.id, v.id));
  }

  const [newVersion] = await db.insert(schema.aiModelVersions).values({
    truckType: run.truckType, version: nextVersion, trainingRunId: run.id,
    isProduction: true, evaluationScore, evaluationNotes, promotedAt: new Date(),
  }).returning();

  await db.update(schema.aiTrainingRuns).set({ resultingModelVersionId: newVersion.id, promotedAt: new Date() }).where(eq(schema.aiTrainingRuns.id, id));

  return NextResponse.json({ ok: true, promoted: true, modelVersion: newVersion });
}
