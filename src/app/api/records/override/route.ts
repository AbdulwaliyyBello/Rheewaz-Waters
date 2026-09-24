import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import { WEEKDAYS } from "@/lib/weeks";
import { calcDay } from "@/lib/calc";

export async function PATCH(req: NextRequest) {
  // This endpoint is exclusively for the Boss.
  const gate = await requireRole(["boss"]);

  if ("error" in gate) return gate.error;

  const body = await req.json().catch(() => null);

  const weekStartISO = body?.weekStart;
  const workerId = body?.workerId;
  const weekday = body?.weekday;

  if (
    typeof weekStartISO !== "string" ||
    typeof workerId !== "string" ||
    typeof weekday !== "string"
  ) {
    return NextResponse.json(
      { error: "weekStart, workerId and weekday are required." },
      { status: 400 }
    );
  }

  if (!WEEKDAYS.includes(weekday as any)) {
    return NextResponse.json(
      { error: "Invalid weekday." },
      { status: 400 }
    );
  }

  // Only raw input values are accepted from the client.
  // Price, Outstanding and Commission are calculated server-side.
  const bags = Math.max(
    0,
    Math.trunc(Number(body?.bags) || 0)
  );

  const cash = Math.max(
    0,
    Number(body?.cash) || 0
  );

  const transfer = Math.max(
    0,
    Number(body?.transfer) || 0
  );

  const roadExpenses = Math.max(
    0,
    Number(body?.roadExpenses) || 0
  );

  // Find the requested week.
  const [week] = await db
    .select()
    .from(schema.weeks)
    .where(eq(schema.weeks.weekStart, new Date(weekStartISO)));

  if (!week) {
    return NextResponse.json(
      { error: "No such week on record." },
      { status: 404 }
    );
  }

  // Make sure the worker actually exists.
  const [worker] = await db
    .select()
    .from(schema.users)
    .where(
      and(
        eq(schema.users.id, workerId),
        eq(schema.users.role, "worker")
      )
    );

  if (!worker) {
    return NextResponse.json(
      { error: "Worker not found." },
      { status: 404 }
    );
  }

  // Find the exact daily record.
  const [existing] = await db
    .select()
    .from(schema.dailyRecords)
    .where(
      and(
        eq(schema.dailyRecords.weekId, week.id),
        eq(schema.dailyRecords.workerId, workerId),
        eq(schema.dailyRecords.weekday, weekday as any)
      )
    );

  if (!existing) {
    return NextResponse.json(
      { error: "Daily record not found." },
      { status: 404 }
    );
  }

  // Calculate the authoritative values using the same calculation
  // engine used everywhere else in the application.
  const calculated = calcDay({
    weekday,
    bags,
    cash,
    transfer,
    roadExpenses,
    submitted: existing.submitted,
  });

  // Boss override:
  // - change the worker's raw figures
  // - preserve submitted status
  // - preserve submittedAt
  // - update updatedAt
  //
  // This deliberately does NOT turn the record into a new submission.
  await db
    .update(schema.dailyRecords)
    .set({
      bags: calculated.bags,
      cash: String(calculated.cash),
      transfer: String(calculated.transfer),
      roadExpenses: String(calculated.roadExpenses),
      updatedAt: new Date(),
    })
    .where(eq(schema.dailyRecords.id, existing.id));

  return NextResponse.json({
    success: true,
    weekStart: weekStartISO,
    workerId,
    weekday,
    row: {
      weekday: calculated.weekday,
      bags: calculated.bags,
      price: calculated.price,
      cash: calculated.cash,
      transfer: calculated.transfer,
      roadExpenses: calculated.roadExpenses,
      outstanding: calculated.outstanding,
      commission: calculated.commission,
    },
  });
}