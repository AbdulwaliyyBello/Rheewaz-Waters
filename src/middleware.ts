import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "rw_session";

const ROUTE_ROLES: Record<string, Array<"boss" | "admin" | "worker">> = {
  "/current": ["boss", "admin"],
  "/previous": ["boss"],
  "/analytics": ["boss"],
  "/workers": ["boss", "admin"],
  "/expenses": ["admin"],
  "/today": ["worker"],
  "/myweek": ["worker"],
  "/settings": ["boss", "admin", "worker"],
  // Phase 2
  "/debt": ["worker"],
  "/trips": ["boss"],
  "/camera": ["boss"],
  "/training-center": ["boss"],
};

function secretKey() {
  return new TextEncoder().encode(process.env.SESSION_SECRET || "");
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const matchedRoute = Object.keys(ROUTE_ROLES).find((r) => pathname.startsWith(r));
  if (!matchedRoute) return NextResponse.next();

  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return NextResponse.redirect(new URL("/login", req.url));

  try {
    const { payload } = await jwtVerify(token, secretKey());
    const role = payload.role as string;
    const allowed = ROUTE_ROLES[matchedRoute];
    if (!allowed.includes(role as "boss" | "admin" | "worker")) {
      const home = role === "worker" ? "/today" : "/current";
      return NextResponse.redirect(new URL(home, req.url));
    }
    return NextResponse.next();
  } catch {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}

export const config = {
  matcher: [
    "/current/:path*", "/previous/:path*", "/analytics/:path*", "/workers/:path*",
    "/expenses/:path*", "/today/:path*", "/myweek/:path*", "/settings/:path*",
    "/debt/:path*", "/trips/:path*", "/camera/:path*", "/training-center/:path*",
  ],
};
