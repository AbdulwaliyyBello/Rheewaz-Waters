import { NextRequest, NextResponse } from "next/server";
import { and, eq, isNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["boss", "admin"]);
  if ("error" in gate) return gate.error;
  const { id } = await params;
  const body = await req.json().catch(() => null);

  const [worker] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!worker || worker.role !== "worker") return NextResponse.json({ error: "Worker not found." }, { status: 404 });

  if (typeof body?.active === "boolean") {
    // Soft-delete only — history (daily_records, trips, debt_repayments) stays intact.
    await db.update(schema.users).set({ active: body.active, updatedAt: new Date() }).where(eq(schema.users.id, id));
  }

  if (typeof body?.truckId === "string") {
    // Close out any current assignment, then open a new one. Never overwrite history.
    await db.update(schema.truckAssignments)
      .set({ unassignedAt: new Date() })
      .where(and(eq(schema.truckAssignments.workerId, id), isNull(schema.truckAssignments.unassignedAt)));
    await db.insert(schema.truckAssignments).values({ workerId: id, truckId: body.truckId, assignedByUserId: gate.session.userId });
  }

  return NextResponse.json({ ok: true });
}
