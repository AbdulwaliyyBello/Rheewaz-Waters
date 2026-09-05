import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const appUrl = process.env.APP_URL || req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(new URL("/login?verified=0&reason=missing_token", appUrl));
  }

  const [user] = await db.select().from(schema.users).where(eq(schema.users.verificationToken, token));

  if (!user) {
    return NextResponse.redirect(new URL("/login?verified=0&reason=invalid_token", appUrl));
  }
  if (user.verificationTokenExpiresAt && user.verificationTokenExpiresAt.getTime() < Date.now()) {
    return NextResponse.redirect(new URL("/login?verified=0&reason=expired", appUrl));
  }

  await db
    .update(schema.users)
    .set({ emailVerified: true, verificationToken: null, verificationTokenExpiresAt: null, updatedAt: new Date() })
    .where(and(eq(schema.users.id, user.id)));

  return NextResponse.redirect(new URL("/login?verified=1", appUrl));
}
