"use client";
import React, { useEffect, useState } from "react";
import { C, WeekTable, weekLabel } from "@/lib/ui";
import { api } from "@/lib/api-client";

export default function MyWeekPage() {
  const [data, setData] = useState<{ weekStart: string; worker: { rows: any[]; totals: any } } | null>(null);
  useEffect(() => { api("/api/records").then(setData as any); }, []);
  if (!data) return <div style={{ padding: 30, textAlign: "center", color: C.inkSoft }}>Loading…</div>;
  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>My Week</div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 16 }}>{weekLabel(data.weekStart)}</div>
      <WeekTable workerName="My Sales" rows={data.worker.rows} totals={data.worker.totals} />
    </div>
  );
}
