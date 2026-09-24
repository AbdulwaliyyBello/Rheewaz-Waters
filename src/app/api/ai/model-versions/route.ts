import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";

export async function GET(req: NextRequest) {
  const gate = await requireRole(["boss"]);
  if ("error" in gate) return gate.error;
  const truckType = req.nextUrl.searchParams.get("truckType") as "dyna" | "hijet" | null;
  const versions = truckType
    ? await db.select().from(schema.aiModelVersions).where(eq(schema.aiModelVersions.truckType, truckType)).orderBy(desc(schema.aiModelVersions.version))
    : await db.select().from(schema.aiModelVersions).orderBy(desc(schema.aiModelVersions.version));
  return NextResponse.json({ versions });
}
