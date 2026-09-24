"use client";
import React, { useEffect, useState } from "react";
import { C, Card, Stat, WeekTable, CardSkeleton, naira, weekLabel } from "@/lib/ui";
import { api } from "@/lib/api-client";

type RecordsData = { weekStart: string; worker: { rows: any[]; totals: any } };
type DebtSummary = {
  bagsSold: number; currentWeekCommission: number; previousOutstanding: number;
  repaymentsMade: number; remainingOutstanding: number; entitlement: number;
};

export default function MyWeekPage() {
  const [records, setRecords] = useState<RecordsData | null>(null);
  const [debt, setDebt] = useState<DebtSummary | null>(null);

  useEffect(() => {
    api<RecordsData>("/api/records").then(setRecords);
    api<DebtSummary>("/api/debt").then(setDebt);
  }, []);

  if (!records || !debt) {
    return <div><CardSkeleton /><CardSkeleton /></div>;
  }

  const t = records.worker.totals;

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>My Week</div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 16 }}>{weekLabel(records.weekStart)}</div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ borderRight: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}><Stat label="Bags Sold" value={String(t.bags)} /></div>
          <div style={{ borderBottom: `1px solid ${C.line}` }}><Stat label="Total Sales" value={naira(t.price)} /></div>
          <div style={{ borderRight: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}><Stat label="Cash" value={naira(t.cash)} /></div>
          <div style={{ borderBottom: `1px solid ${C.line}` }}><Stat label="Transfer" value={naira(t.transfer)} /></div>
          <div style={{ borderRight: `1px solid ${C.line}` }}><Stat label="Road Expenses" value={naira(t.roadExpenses)} /></div>
          <div><Stat label="Current Commission" value={naira(t.commission)} /></div>
        </div>
      </Card>

      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8, color: C.inkSoft }}>Debt</div>
      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ borderRight: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}><Stat label="Previous Outstanding" value={naira(debt.previousOutstanding)} tone={debt.previousOutstanding ? "bad" : undefined} /></div>
          <div style={{ borderBottom: `1px solid ${C.line}` }}><Stat label="Repayments This Week" value={naira(debt.repaymentsMade)} /></div>
          <div><Stat label="Remaining Outstanding" value={naira(debt.remainingOutstanding)} tone={debt.remainingOutstanding ? "bad" : "good"} /></div>
        </div>
      </Card>

      <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 8, color: C.inkSoft }}>Earnings</div>
      <Card style={{ marginBottom: 16, background: "#F7FAF9" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ borderRight: `1px solid ${C.line}` }}><Stat label="Current-Week Commission" value={naira(debt.currentWeekCommission)} /></div>
          <div><Stat label="This Week's Entitlement" value={naira(debt.entitlement)} tone={debt.entitlement >= 0 ? "good" : "bad"} /></div>
        </div>
      </Card>

      <WeekTable workerName="My Sales" rows={records.worker.rows} totals={records.worker.totals} />
    </div>
  );
}
