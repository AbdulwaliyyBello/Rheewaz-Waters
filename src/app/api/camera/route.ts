import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";

/**
 * Boss-only. This never fabricates a video feed (spec rule #52). If
 * CAMERA_STREAM_URL isn't configured, it reports that honestly so the UI
 * can show "CAMERA OFFLINE — not configured" instead of a blank/fake player.
 */
export async function GET() {
  const gate = await requireRole(["boss"]);
  if ("error" in gate) return gate.error;

  const streamUrl = process.env.CAMERA_STREAM_URL || null;
  const label = process.env.CAMERA_LABEL || "Loading Dock";

  return NextResponse.json({ configured: Boolean(streamUrl), streamUrl, label });
}
