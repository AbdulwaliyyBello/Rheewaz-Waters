import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const COOKIE_NAME = "rw_session";
const DEFAULT_SESSION_TTL_SECONDS = 60 * 60 * 24; // 1 day — used when "Remember me" is unchecked
const REMEMBER_ME_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days — used when "Remember me" is checked

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not set.");
  return new TextEncoder().encode(secret);
}

export type SessionPayload = { userId: string; role: "boss" | "admin" | "worker"; name: string; email: string };

/**
 * "Remember me" only ever changes how long the signed, server-verified
 * session cookie lives — the password itself is never stored anywhere
 * beyond its bcrypt hash in the users table.
 */
export async function createSessionToken(payload: SessionPayload, rememberMe = false): Promise<string> {
  const ttl = rememberMe ? REMEMBER_ME_TTL_SECONDS : DEFAULT_SESSION_TTL_SECONDS;
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${ttl}s`)
    .sign(secretKey());
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return payload as unknown as SessionPayload;
  } catch { return null; }
}

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

/**
 * When rememberMe is false, the cookie is set WITHOUT maxAge — a true
 * browser session cookie that disappears when the browser closes, on top
 * of the JWT's own 1-day expiry. When true, it persists for 30 days.
 */
export function attachSessionCookie(res: NextResponse, token: string, rememberMe = false) {
  const base = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  if (rememberMe) {
    res.cookies.set(COOKIE_NAME, token, { ...base, maxAge: REMEMBER_ME_TTL_SECONDS });
  } else {
    res.cookies.set(COOKIE_NAME, token, base); // session cookie — no maxAge
  }
  return res;
}
export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(COOKIE_NAME, "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
export const SESSION_COOKIE_NAME = COOKIE_NAME;

export async function requireRole(
  allowed: Array<"boss" | "admin" | "worker">
): Promise<{ session: SessionPayload } | { error: NextResponse }> {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "Not authenticated." }, { status: 401 }) };
  if (!allowed.includes(session.role)) {
    return { error: NextResponse.json({ error: "Not authorized for this action." }, { status: 403 }) };
  }
  return { session };
}
