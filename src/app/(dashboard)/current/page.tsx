"use client";
import React, { useEffect, useState } from "react";
import {
  C,
  Card,
  Stat,
  WeekTable,
  CardSkeleton,
  naira,
  weekLabel,
} from "@/lib/ui";
import { api } from "@/lib/api-client";

type WorkerBlock = {
  worker: { id: string; name: string; active: boolean };
  rows: any[];
  totals: any;
  previousOutstanding: number;
};
type Data = {
  weekStart: string;
  workers: WorkerBlock[];
  summary: {
    totalPrice: number;
    totalCash: number;
    totalTransfer: number;
    totalOutstanding: number;
    totalCommission: number;
    factoryExpenses: number;
    nylonRollExpenses: number;
    grossIncome: number;
    cashLeft: number;
  };
};

export default function CurrentWeekPage() {
  const [data, setData] = useState<Data | null>(null);

  useEffect(() => {
    api<Data>("/api/records").then(setData);
  }, []);

  if (!data) {
    return (
      <div>
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  }

  const { summary } = data;

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>
          {weekLabel(data.weekStart)}
        </div>
        <div style={{ fontSize: 12.5, color: C.inkSoft }}>
          Monday – Saturday · Africa/Lagos
        </div>
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)" }}>
          <div
            style={{
              borderRight: `1px solid ${C.line}`,
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <Stat
              label="Total Sales (Price)"
              value={naira(summary.totalPrice)}
            />
          </div>
          <div style={{ borderBottom: `1px solid ${C.line}` }}>
            <Stat label="Total Cash" value={naira(summary.totalCash)} />
          </div>
          <div
            style={{
              borderRight: `1px solid ${C.line}`,
              borderBottom: `1px solid ${C.line}`,
            }}
          >
            <Stat label="Total Transfer" value={naira(summary.totalTransfer)} />
          </div>
          <div style={{ borderBottom: `1px solid ${C.line}` }}>
            <Stat
              label="Total Outstanding"
              value={naira(summary.totalOutstanding)}
              tone={summary.totalOutstanding > 0 ? "bad" : undefined}
            />
          </div>
          <div style={{ borderRight: `1px solid ${C.line}` }}>
            <Stat
              label="Factory Expenses"
              value={naira(summary.factoryExpenses)}
            />
          </div>
          <div>
            <Stat
              label="Total Commission"
              value={naira(summary.totalCommission)}
            />
          </div>
        </div>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)" }}>
          <div style={{ borderRight: `1px solid ${C.line}` }}>
            <Stat
              label="Gross Income"
              value={naira(summary.grossIncome)}
              tone={summary.grossIncome >= 0 ? "good" : "bad"}
            />
          </div>
          <div>
            <Stat
              label="Cash Left"
              value={naira(summary.cashLeft)}
              tone={summary.cashLeft >= 0 ? "good" : "bad"}
            />
          </div>
        </div>
        {summary.nylonRollExpenses > 0 && (
          <div
            style={{
              padding: "10px 16px",
              borderTop: `1px solid ${C.line}`,
              background: C.amberBg,
              fontSize: 12.5,
              color: C.gold,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>
              Nylon roll expense this week (kept separate from Factory Expenses)
            </span>
            <strong>{naira(summary.nylonRollExpenses)}</strong>
          </div>
        )}
      </Card>

      {data.workers.length === 0 && (
        <div style={{ padding: 24, textAlign: "center", color: C.inkSoft }}>
          No workers yet. Add a driver from the Workers section.
        </div>
      )}

      {data.workers.map((w) => (
        <div key={w.worker.id}>
          <WeekTable
            workerName={
              w.worker.name + (w.worker.active ? "" : " (deactivated)")
            }
            rows={w.rows}
            totals={w.totals}
            showCommissionPayable
            previousOutstanding={w.previousOutstanding}
            canEdit
            weekStart={data.weekStart}
            workerId={w.worker.id}
          />
        </div>
      ))}
    </div>
  );
}
