"use client";
import React, { useEffect, useState } from "react";
import { C, Card, Stat, Field, Btn, naira, weekLabel, inputStyle, DAY_LABEL, WEEKDAYS , CardSkeleton } from "@/lib/ui";
import { api } from "@/lib/api-client";

type DayRow = { weekday: string; factory: number; submitted: boolean; nylon: { id: string; amount: number }[] };
type Data = { weekStart: string; days: DayRow[]; factoryTotal: number; nylonTotal: number };
const todayKey = () => (({ 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat" } as Record<number, string>)[new Date().getDay()] || "mon");

export default function ExpensesPage() {
  const [data, setData] = useState<Data | null>(null);
  const [day, setDay] = useState(todayKey());
  const [factory, setFactory] = useState(0);
  const [nylonYes, setNylonYes] = useState(false);
  const [nylonAmount, setNylonAmount] = useState(0);
  const [saving, setSaving] = useState(false);

  const load = () => api<Data>("/api/expenses").then((res) => { setData(res); const d = res.days.find((x) => x.weekday === day); setFactory(d?.factory ?? 0); });
  useEffect(() => { load(); }, []); // eslint-disable-line
  useEffect(() => { const d = data?.days.find((x) => x.weekday === day); setFactory(d?.factory ?? 0); setNylonYes(false); setNylonAmount(0); }, [day, data]);

  if (!data) return <div><CardSkeleton /><CardSkeleton /></div>;

  const save = async () => { setSaving(true); await api("/api/expenses", { method: "POST", body: JSON.stringify({ weekday: day, factoryAmount: factory, nylonYes, nylonAmount }) }); await load(); setSaving(false); };

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Factory Expenses</div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 16 }}>{weekLabel(data.weekStart)}</div>
      <Field label="Day">
        <select style={inputStyle} value={day} onChange={(e) => setDay(e.target.value)}>
          {WEEKDAYS.map((wd) => { const d = data.days.find((x) => x.weekday === wd); return <option key={wd} value={wd}>{DAY_LABEL[wd]} {d?.submitted ? "· recorded" : "· pending"}</option>; })}
        </select>
      </Field>
      <Card style={{ padding: 18, marginBottom: 16 }}>
        <Field label="Factory expense (₦)"><input type="number" min={0} style={inputStyle} value={factory} onChange={(e) => setFactory(Number(e.target.value))} /></Field>
        <Field label="Nylon rolls supplied?">
          <select style={inputStyle} value={nylonYes ? "yes" : "no"} onChange={(e) => setNylonYes(e.target.value === "yes")}><option value="no">No</option><option value="yes">Yes</option></select>
        </Field>
        {nylonYes && <Field label="Nylon roll amount (₦)"><input type="number" min={0} style={inputStyle} value={nylonAmount} onChange={(e) => setNylonAmount(Number(e.target.value))} /></Field>}
        <Btn onClick={save} disabled={saving} style={{ width: "100%" }}>{saving ? "Saving…" : `Save ${DAY_LABEL[day]}'s expenses`}</Btn>
      </Card>
      <div style={{ fontSize: 11.5, color: C.inkSoft, marginBottom: 16 }}>Nylon roll spend is tracked separately and excluded from the weekly Factory Expenses total.</div>
      <Card style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ borderRight: `1px solid ${C.line}` }}><Stat label="Week Factory Expenses" value={naira(data.factoryTotal)} /></div>
        <div><Stat label="Week Nylon Roll Spend" value={naira(data.nylonTotal)} /></div>
      </Card>
    </div>
  );
}
