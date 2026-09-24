"use client";
import React from "react";
import { C } from "@/lib/ui";
import { LiveCameraPanel } from "@/components/LiveCameraPanel";

export default function CameraPage() {
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Live Camera</div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 16 }}>Real-time loading-dock monitoring. Recorded trip evidence lives separately under Trips.</div>
      <LiveCameraPanel />
    </div>
  );
}
