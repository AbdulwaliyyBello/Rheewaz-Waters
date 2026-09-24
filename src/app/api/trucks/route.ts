import { NextRequest, NextResponse } from "next/server";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import { DYNA_GEOMETRY, HIJET_GEOMETRY } from "@/lib/calc";

export async function GET() {
  const gate = await requireRole(["boss", "admin"]);
  if ("error" in gate) return gate.error;
  const trucks = await db.select().from(schema.trucks);
  return NextResponse.json({ trucks });
}

// Creates a truck with the correct geometry defaults for its type, per spec
// section 11 — the app supports any number of trucks, not just the two seeded.
export async function POST(req: NextRequest) {
  const gate = await requireRole(["boss", "admin"]);
  if ("error" in gate) return gate.error;
  const body = await req.json().catch(() => null);
  const name = (body?.name || "").trim();
  const type = body?.type as "dyna" | "hijet";
  if (!name || (type !== "dyna" && type !== "hijet")) {
    return NextResponse.json({ error: "name and type ('dyna' | 'hijet') are required." }, { status: 400 });
  }
  const geometry = type === "dyna" ? DYNA_GEOMETRY : HIJET_GEOMETRY;
  const [truck] = await db.insert(schema.trucks).values({
    name, type, active: true,
    bagsAcross: geometry.bagsAcross, bagLines: geometry.bagLines,
    bonusBags: geometry.bonusBags, bonusThreshold: geometry.bonusThreshold,
  }).returning();
  return NextResponse.json({ truck });
}
