"use client";
import React, { useEffect, useState } from "react";
import { ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import { C, Card, naira , CardSkeleton } from "@/lib/ui";
import { api } from "@/lib/api-client";

type Row = { weekStart: string; bags: number; grossIncome: number; nylon: number; netOfNylon: number };

export default function AnalyticsPage() {
  const [range, setRange] = useState("1M");
  const [data, setData] = useState<Row[] | null>(null);

  useEffect(() => { setData(null); api<{ data: Row[] }>(`/api/analytics?range=${range}`).then((res) => setData(res.data)); }, [range]);
  const chartData = (data || []).map((r) => ({ ...r, label: r.weekStart.slice(5) }));

  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {["1W", "1M", "6M", "1Y"].map((r) => (
          <button key={r} onClick={() => setRange(r)} style={{ padding: "7px 14px", borderRadius: 999, border: `1px solid ${r === range ? C.teal : C.line}`, background: r === range ? C.teal : "#fff", color: r === range ? "#fff" : C.inkSoft, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>{r}</button>
        ))}
      </div>
      {!data ? <div><CardSkeleton /><CardSkeleton /></div> : data.length === 0 ? (
        <div style={{ padding: 30, textAlign: "center", color: C.inkSoft }}>No data yet for this period.</div>
      ) : (
        <>
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 14 }}>Bags sold</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData}><CartesianGrid strokeDasharray="3 3" stroke={C.line} /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} /><Tooltip /><Bar dataKey="bags" fill={C.aqua} radius={[4, 4, 0, 0]} /></BarChart>
            </ResponsiveContainer>
          </Card>
          <Card style={{ padding: 16, marginBottom: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 4, fontSize: 14 }}>Gross income</div>
            <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 12 }}>Dashed line includes nylon roll spend</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke={C.line} /><XAxis dataKey="label" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `₦${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => naira(v)} /><Legend wrapperStyle={{ fontSize: 12 }} />
                <Line type="monotone" dataKey="grossIncome" name="Gross income" stroke={C.green} strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="netOfNylon" name="Net of nylon" stroke={C.gold} strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}
    </div>
  );
}
