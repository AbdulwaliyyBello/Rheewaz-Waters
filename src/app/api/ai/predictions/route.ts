import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * This is the integration boundary for a real computer-vision inference
 * service, per spec section 14/34 ("the architecture must allow
 * AI-generated trip events to be reviewed by the Boss"). This app does not
 * run a vision model itself. Until AI_INFERENCE_WEBHOOK_SECRET is set and a
 * real service calls this endpoint, aiDepartureBags/aiConfidence stay null
 * on every trip and the Boss works entirely from manually-entered physical
 * counts (see PATCH /api/trips/[id]) — which remain fully functional on
 * their own.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.AI_INFERENCE_WEBHOOK_SECRET;
  const provided = req.headers.get("authorization");
  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized. Set AI_INFERENCE_WEBHOOK_SECRET and call with a matching Authorization header." }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const tripId = body?.tripId as string;
  const modelVersionId = body?.modelVersionId as string;
  if (!tripId || !modelVersionId) return NextResponse.json({ error: "tripId and modelVersionId are required." }, { status: 400 });

  const [trip] = await db.select().from(schema.trips).where(eq(schema.trips.id, tripId));
  if (!trip) return NextResponse.json({ error: "Trip not found." }, { status: 404 });

  await db.update(schema.trips).set({
    aiArrivalBags: body?.aiArrivalBags ?? null,
    aiDepartureBags: body?.aiDepartureBags ?? null,
    aiNewBags: body?.aiNewBags ?? null,
    aiBonusBags: body?.aiBonusBags ?? null,
    aiCompanyBags: body?.aiCompanyBags ?? null,
    aiConfidence: body?.aiConfidence ?? null,
    aiModelVersionId: modelVersionId,
    status: "ai_review",
    updatedAt: new Date(),
  }).where(eq(schema.trips.id, tripId));

  return NextResponse.json({ ok: true });
}
