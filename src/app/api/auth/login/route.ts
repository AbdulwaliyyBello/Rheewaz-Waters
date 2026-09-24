import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { verifyPassword } from "@/lib/auth";
import { createSessionToken, attachSessionCookie } from "@/lib/session";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = (body?.email || "").trim().toLowerCase();
  const password = body?.password || "";
  const rememberMe = Boolean(body?.rememberMe);
  if (!email || !password) return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
  if (!user) return NextResponse.json({ error: "No account with that email." }, { status: 401 });
  if (!user.active) return NextResponse.json({ error: "This account has been deactivated." }, { status: 403 });
  if (!user.emailVerified) return NextResponse.json({ error: "Please verify your email before logging in." }, { status: 403 });

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Incorrect password." }, { status: 401 });

  const token = await createSessionToken({ userId: user.id, role: user.role, name: user.name, email: user.email }, rememberMe);
  const res = NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role } });
  return attachSessionCookie(res, token, rememberMe);
}
