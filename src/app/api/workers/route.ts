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
  return NextResponse.json({
    workers: workers.map((w) => ({
      id: w.id,
      name: w.name,
      email: w.email,
      active: w.active,
      emailVerified: w.emailVerified,
      createdAt: w.createdAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const gate = await requireRole(["boss", "admin"]);
  if ("error" in gate) return gate.error;

  const body = await req.json().catch(() => null);
  const name = (body?.name || "").trim();
  const email = (body?.email || "").trim().toLowerCase();
  const password = body?.password || "";

  if (!name || !email || password.length < 6) {
    return NextResponse.json(
      { error: "Name, email, and a password of at least 6 characters are required." },
      { status: 400 }
    );
  }

  const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (existing) return NextResponse.json({ error: "That email is already in use." }, { status: 409 });

  const passwordHash = await hashPassword(password);
  const { token, expiresAt } = generateVerificationToken();

  const [worker] = await db
    .insert(schema.users)
    .values({
      name,
      email,
      passwordHash,
      role: "worker",
      active: true,
      emailVerified: false,
      verificationToken: token,
      verificationTokenExpiresAt: expiresAt,
    })
    .returning();

  const mailResult = await sendVerificationEmail({ to: email, name, token });

  return NextResponse.json({
    worker: { id: worker.id, name: worker.name, email: worker.email, active: worker.active },
    emailDelivered: mailResult.delivered,
    // Included only to make local testing possible without email configured;
    // remove this field once RESEND_API_KEY is set in production.
    devVerifyUrl: mailResult.delivered ? undefined : mailResult.verifyUrl,
  });
}
