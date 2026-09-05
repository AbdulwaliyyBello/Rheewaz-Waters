import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["boss", "admin"]);
  if ("error" in gate) return gate.error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const active = typeof body?.active === "boolean" ? body.active : undefined;
  if (active === undefined) {
    return NextResponse.json({ error: "'active' boolean is required." }, { status: 400 });
  }

  const [worker] = await db.select().from(schema.users).where(eq(schema.users.id, id));
  if (!worker || worker.role !== "worker") {
    return NextResponse.json({ error: "Worker not found." }, { status: 404 });
  }

  // Soft-delete only. We never remove the row, so every historical
  // daily_records.worker_id foreign key stays valid and their sales
  // history remains fully queryable by the Boss.
  await db.update(schema.users).set({ active, updatedAt: new Date() }).where(eq(schema.users.id, id));

  return NextResponse.json({ ok: true, active });
}
