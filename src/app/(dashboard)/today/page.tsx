"use client";
import React, { useEffect, useState } from "react";
import { C, Card, Stat, Field, Btn, Pill, naira, weekLabel, inputStyle, DAY_LABEL } from "@/lib/ui";
import { api } from "@/lib/api-client";

const todayKey = (): string | null => {
  const map: Record<number, string> = { 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat" };
  return map[new Date().getDay()] || null;
};

export default function TodayReportPage() {
  const tk = todayKey();
  const [weekStart, setWeekStart] = useState("");
  const [row, setRow] = useState<any>(null);
  const [form, setForm] = useState({ bags: 0, cash: 0, transfer: 0, roadExpenses: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ weekStart: string; worker: { rows: any[] } }>("/api/records").then((res) => {
      setWeekStart(res.weekStart);
      const r = res.worker.rows.find((x) => x.weekday === tk);
      if (r) {
        setRow(r);
        setForm({ bags: r.bags, cash: r.cash, transfer: r.transfer, roadExpenses: r.roadExpenses });
      }
    });
  }, [tk]);

  if (!tk) {
    return (
      <div style={{ padding: 30, textAlign: "center" }}>
        <Card style={{ padding: 24 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>It's Sunday — a non-working day</div>
          <div style={{ fontSize: 13, color: C.inkSoft }}>Reporting resumes Monday.</div>
        </Card>
      </div>
    );
  }
  if (!row) return <div style={{ padding: 30, textAlign: "center", color: C.inkSoft }}>Loading…</div>;

  const price = form.bags * 350;
  const outstanding = price - form.cash - form.transfer - form.roadExpenses;
  const commission = form.bags * 12;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await api<{ worker: { rows: any[] } }>("/api/records", {
      method: "POST",
      body: JSON.stringify({ weekday: tk, ...form }),
    });
    const r = res.worker.rows.find((x) => x.weekday === tk);
    setRow(r);
    setSaving(false);
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{DAY_LABEL[tk]}'s Report</div>
        <Pill tone={row.submitted ? "good" : "gold"}>{row.submitted ? "Completed" : "Pending"}</Pill>
      </div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 16 }}>{weekLabel(weekStart)}</div>

      <Card style={{ padding: 18, marginBottom: 16 }}>
        <form onSubmit={submit}>
          <Field label="Number of bags sold">
            <input type="number" min={0} style={inputStyle} value={form.bags} onChange={(e) => setForm((f) => ({ ...f, bags: Number(e.target.value) }))} />
          </Field>
          <Field label="Cash received (₦)">
            <input type="number" min={0} style={inputStyle} value={form.cash} onChange={(e) => setForm((f) => ({ ...f, cash: Number(e.target.value) }))} />
          </Field>
          <Field label="Bank transfer received (₦)">
            <input type="number" min={0} style={inputStyle} value={form.transfer} onChange={(e) => setForm((f) => ({ ...f, transfer: Number(e.target.value) }))} />
          </Field>
          <Field label="Road expenses (₦)">
            <input type="number" min={0} style={inputStyle} value={form.roadExpenses} onChange={(e) => setForm((f) => ({ ...f, roadExpenses: Number(e.target.value) }))} />
          </Field>
          <Btn type="submit" disabled={saving} style={{ width: "100%" }}>
            {saving ? "Saving…" : row.submitted ? "Update today's report" : "Submit today's report"}
          </Btn>
        </form>
      </Card>

      <Card style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ borderRight: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}><Stat label="Price" value={naira(price)} /></div>
        <div style={{ borderBottom: `1px solid ${C.line}` }}><Stat label="Outstanding" value={naira(outstanding)} tone={outstanding > 0 ? "bad" : undefined} /></div>
        <div style={{ gridColumn: "1 / -1" }}><Stat label="Commission" value={naira(commission)} /></div>
      </Card>
      <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 8 }}>Price, outstanding and commission are calculated automatically — you don't enter them. The server recalculates these independently before saving.</div>
    </div>
  );
}
