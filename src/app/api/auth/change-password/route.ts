import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSession } from "@/lib/session";
import { hashPassword, verifyPassword } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const currentPassword = body?.currentPassword || "";
  const newPassword = body?.newPassword || "";
  if (newPassword.length < 6) {
    return NextResponse.json({ error: "New password must be at least 6 characters." }, { status: 400 });
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.id, session.userId));
  if (!user) return NextResponse.json({ error: "Account not found." }, { status: 404 });

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 });

  const passwordHash = await hashPassword(newPassword);
  await db.update(schema.users).set({ passwordHash, updatedAt: new Date() }).where(eq(schema.users.id, user.id));

  return NextResponse.json({ ok: true });
}
