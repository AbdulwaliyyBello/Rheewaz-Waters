import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import { calcTripBagCounts, geometryForTruckType } from "@/lib/calc";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["boss"]);
  if ("error" in gate) return gate.error;
  const { id } = await params;

  const [trip] = await db.select().from(schema.trips).where(eq(schema.trips.id, id));
  if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  const [truck] = await db.select().from(schema.trucks).where(eq(schema.trucks.id, trip.truckId));
  if (!truck) return NextResponse.json({ error: "Truck not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  const patch: Record<string, unknown> = { updatedAt: new Date() };

  if (body?.loadingStartedAt) { patch.loadingStartedAt = new Date(); patch.status = "loading"; }
  if (body?.loadingCompletedAt) { patch.loadingCompletedAt = new Date(); patch.status = "loading_complete"; }
  if (body?.departedAt) { patch.departedAt = new Date(); patch.status = "departed"; }

  // Recording the final physical departure count (observed by the Boss
  // today; by a real vision model once one is connected) triggers the
  // deterministic rules engine — this is where new-bags/bonus/company get
  // computed. Nothing here is guessed; both arrival and departure counts
  // must be actual observed values.
  if (body?.physicalArrivalBags != null) patch.physicalArrivalBags = Number(body.physicalArrivalBags);
  if (body?.physicalDepartureBags != null) {
    const arrival = body?.physicalArrivalBags != null ? Number(body.physicalArrivalBags) : (trip.physicalArrivalBags ?? 0);
    const departure = Number(body.physicalDepartureBags);
    const geometry = geometryForTruckType(truck.type as "dyna" | "hijet");
    const { newBagsLoaded, bonusBags, companyBags } = calcTripBagCounts(geometry, arrival, departure);
    patch.physicalDepartureBags = departure;
    patch.newBagsLoaded = newBagsLoaded;
    patch.bonusBags = bonusBags;
    patch.companyBags = companyBags;
    if (trip.status === "arrived" || trip.status === "loading") patch.status = "loading_complete";
  }

  await db.update(schema.trips).set(patch as any).where(eq(schema.trips.id, id));
  const [updated] = await db.select().from(schema.trips).where(eq(schema.trips.id, id));
  return NextResponse.json({ trip: updated });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const gate = await requireRole(["boss"]);
  if ("error" in gate) return gate.error;
  const { id } = await params;
  const [trip] = await db.select().from(schema.trips).where(eq(schema.trips.id, id));
  if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });
  const footage = await db.select().from(schema.tripFootage).where(eq(schema.tripFootage.tripId, id));
  return NextResponse.json({ trip, footage });
}
