import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireRole } from "@/lib/session";
import { hashPassword } from "@/lib/auth";
import { generateVerificationToken, sendVerificationEmail } from "@/lib/mail";

export async function GET() {
  const gate = await requireRole(["boss", "admin"]);
  if ("error" in gate) return gate.error;

  const workers = await db.select().from(schema.users).where(eq(schema.users.role, "worker"));

  // Attach current truck assignment (if any) per worker.
  const assignments = await db.select().from(schema.truckAssignments);
  const trucks = await db.select().from(schema.trucks);

  const result = workers.map((w) => {
    const active = assignments.find((a) => a.workerId === w.id && !a.unassignedAt);
    const truck = active ? trucks.find((t) => t.id === active.truckId) : null;
    return {
      id: w.id, name: w.name, email: w.email, active: w.active, emailVerified: w.emailVerified,
      createdAt: w.createdAt, truck: truck ? { id: truck.id, name: truck.name, type: truck.type } : null,
    };
  });
  return NextResponse.json({ workers: result });
}

export async function POST(req: NextRequest) {
  const gate = await requireRole(["boss", "admin"]);
  if ("error" in gate) return gate.error;
  const body = await req.json().catch(() => null);
  const name = (body?.name || "").trim();
  const email = (body?.email || "").trim().toLowerCase();
  const password = body?.password || "";
  const truckId = body?.truckId as string | undefined;

  if (!name || !email || password.length < 6) {
    return NextResponse.json({ error: "Name, email, and a password of at least 6 characters are required." }, { status: 400 });
  }
  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing) return NextResponse.json({ error: "That email is already in use." }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const { token, expiresAt } = generateVerificationToken();
  const [worker] = await db.insert(schema.users).values({
    name, email, passwordHash, role: "worker", active: true, emailVerified: false,
    verificationToken: token, verificationTokenExpiresAt: expiresAt,
  }).returning();

  if (truckId) {
    await db.insert(schema.truckAssignments).values({ workerId: worker.id, truckId, assignedByUserId: gate.session.userId });
  }

  const mailResult = await sendVerificationEmail({ to: email, name, token });
  return NextResponse.json({
    worker: { id: worker.id, name: worker.name, email: worker.email, active: worker.active },
    emailDelivered: mailResult.delivered,
    devVerifyUrl: mailResult.delivered ? undefined : mailResult.verifyUrl,
  });
}
