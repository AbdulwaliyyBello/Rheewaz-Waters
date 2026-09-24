import { NextRequest, NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";

// Boss-only per spec section 42 (trip records are part of Boss verification).
// Admin does not get trip/AI access per the explicit "Admin must NOT access" list.
export async function GET(req: NextRequest) {
  const gate = await requireRole(["boss"]);
  if ("error" in gate) return gate.error;

  const statusFilter = req.nextUrl.searchParams.get("status");
  const all = await db.select().from(schema.trips).orderBy(desc(schema.trips.createdAt)).limit(200);
  const trips = statusFilter ? all.filter((t) => t.status === statusFilter) : all;

  const workers = await db.select().from(schema.users);
  const trucks = await db.select().from(schema.trucks);

  return NextResponse.json({
    trips: trips.map((t) => ({
      ...t,
      workerName: workers.find((w) => w.id === t.workerId)?.name ?? "Unknown",
      truckName: trucks.find((tr) => tr.id === t.truckId)?.name ?? "Unknown",
    })),
  });
}

/**
 * Creates a trip record. Per spec section 14, trips aren't required to be
 * manually created by a Worker — in this build (no CCTV/AI pipeline wired
 * up yet), the Boss or Admin opens a trip when a truck arrives, recording
 * the physical arrival count observed directly. See PATCH /api/trips/[id]
 * for recording departure counts once loading finishes.
 */
export async function POST(req: NextRequest) {
  const gate = await requireRole(["boss"]);
  if ("error" in gate) return gate.error;

  const body = await req.json().catch(() => null);
  const workerId = body?.workerId as string;
  const truckId = body?.truckId as string;
  const physicalArrivalBags = body?.physicalArrivalBags != null ? Number(body.physicalArrivalBags) : null;
  if (!workerId || !truckId) return NextResponse.json({ error: "workerId and truckId are required." }, { status: 400 });

  const [trip] = await db.insert(schema.trips).values({
    workerId, truckId, date: new Date(),
    arrivalTime: new Date(),
    physicalArrivalBags,
    status: "arrived",
  }).returning();

  return NextResponse.json({ trip });
}
