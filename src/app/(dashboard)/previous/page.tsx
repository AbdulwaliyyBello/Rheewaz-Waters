"use client";
import React, { useEffect, useState } from "react";
import {
  C,
  Card,
  Stat,
  WeekTable,
  Field,
  CardSkeleton,
  naira,
  weekLabel,
  inputStyle,
} from "@/lib/ui";
import { api } from "@/lib/api-client";

export default function PreviousWeeksPage() {
  const [weeks, setWeeks] = useState<
    { weekStart: string; status: string }[] | null
  >(null);
  const [sel, setSel] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api<{ weeks: { weekStart: string; status: string }[] }>("/api/weeks").then(
      (res) => {
        setWeeks(res.weeks);
        if (res.weeks.length) setSel(res.weeks[0].weekStart);
      },
    );
  }, []);
  useEffect(() => {
    if (sel) api(`/api/records/${sel}`).then(setData);
  }, [sel]);

  if (weeks === null)
    return (
      <div>
        <CardSkeleton />
        <CardSkeleton />
      </div>
    );
  if (!weeks.length)
    return (
      <div style={{ padding: 30, textAlign: "center", color: C.inkSoft }}>
        No historical weeks yet. Once the current week closes, it will appear
        here.
      </div>
    );

  return (
    <div>
      <Field label="Select a week">
        <select
          style={inputStyle}
          value={sel || ""}
          onChange={(e) => setSel(e.target.value)}
        >
          {weeks.map((w) => (
            <option key={w.weekStart} value={w.weekStart}>
              {weekLabel(w.weekStart)}
            </option>
          ))}
        </select>
      </Field>
      {data && (
        <div>
          <Card style={{ marginBottom: 16 }}>
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)" }}
            >
              <div
                style={{
                  borderRight: `1px solid ${C.line}`,
                  borderBottom: `1px solid ${C.line}`,
                }}
              >
                <Stat
                  label="Total Sales (Price)"
                  value={naira(data.summary.totalPrice)}
                />
              </div>
              <div style={{ borderBottom: `1px solid ${C.line}` }}>
                <Stat
                  label="Total Cash"
                  value={naira(data.summary.totalCash)}
                />
              </div>
              <div style={{ borderRight: `1px solid ${C.line}` }}>
                <Stat
                  label="Factory Expenses"
                  value={naira(data.summary.factoryExpenses)}
                />
              </div>
              <div>
                <Stat
                  label="Total Commission"
                  value={naira(data.summary.totalCommission)}
                />
              </div>
            </div>
          </Card>
          <Card style={{ marginBottom: 16 }}>
            <div
              style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)" }}
            >
              <div style={{ borderRight: `1px solid ${C.line}` }}>
                <Stat
                  label="Gross Income"
                  value={naira(data.summary.grossIncome)}
                  tone={data.summary.grossIncome >= 0 ? "good" : "bad"}
                />
              </div>
              <div>
                <Stat
                  label="Cash Left"
                  value={naira(data.summary.cashLeft)}
                  tone={data.summary.cashLeft >= 0 ? "good" : "bad"}
                />
              </div>
            </div>
          </Card>
          {data.workers.map((w: any) => (
            <WeekTable
              key={w.worker.id}
              workerName={
                w.worker.name + (w.worker.active ? "" : " (deactivated)")
              }
              rows={w.rows}
              totals={w.totals}
              canEdit
              weekStart={data.weekStart}
              workerId={w.worker.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
