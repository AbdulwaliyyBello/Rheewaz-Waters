import { NextRequest, NextResponse } from "next/server";
import { closeElapsedWeeks } from "@/lib/weeks";

export async function POST(req: NextRequest) {
  const provided = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET || ""}`;
  if (!process.env.CRON_SECRET || provided !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const closed = await closeElapsedWeeks();
  return NextResponse.json({ ok: true, closedWeekIds: closed });
}

// Vercel Cron sends GET by default unless you configure otherwise — support both.
export async function GET(req: NextRequest) {
  return POST(req);
}
