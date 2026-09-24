"use client";
import React, { useEffect, useState } from "react";
import { C, Card, Stat, Field, Btn, Pill, ConfirmModal, SubmittedFlash, naira, weekLabel, inputStyle, DAY_LABEL , CardSkeleton } from "@/lib/ui";
import { api, ApiError } from "@/lib/api-client";

const todayKey = (): string | null => (({ 1: "mon", 2: "tue", 3: "wed", 4: "thu", 5: "fri", 6: "sat" } as Record<number, string | undefined>)[new Date().getDay()] ?? null);

export default function TodayReportPage() {
  const tk = todayKey();
  const [weekStart, setWeekStart] = useState("");
  const [row, setRow] = useState<any>(null);
  const [form, setForm] = useState({ bags: 0, cash: 0, transfer: 0, roadExpenses: 0 });
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    api<{ weekStart: string; worker: { rows: any[] } }>("/api/records").then((res) => {
      setWeekStart(res.weekStart);
      const r = res.worker.rows.find((x) => x.weekday === tk);
      if (r) { setRow(r); setForm({ bags: r.bags, cash: r.cash, transfer: r.transfer, roadExpenses: r.roadExpenses }); }
    });
  }, [tk]);

  if (!tk) {
    return <div style={{ padding: 30, textAlign: "center" }}><Card style={{ padding: 24 }}><div style={{ fontWeight: 700, marginBottom: 6 }}>It's Sunday — a non-working day</div><div style={{ fontSize: 13, color: C.inkSoft }}>Reporting resumes Monday.</div></Card></div>;
  }
  if (!row) return <div><CardSkeleton /><CardSkeleton /></div>;

  const price = form.bags * 350;
  const outstanding = price - form.cash - form.transfer - form.roadExpenses;
  const commission = form.bags * 12;

  // PHASE 2 RULE #45 — once submitted, no Edit/Delete controls at all; the
  // form itself becomes a read-only summary.
  if (row.submitted) {
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{DAY_LABEL[tk]}'s Report</div>
          <Pill tone="good">✓ Submitted</Pill>
        </div>
        <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 16 }}>{weekLabel(weekStart)}</div>
        {justSubmitted && <div style={{ marginBottom: 14 }}><SubmittedFlash /></div>}
        <Card style={{ padding: 18, marginBottom: 16 }}>
          {[
            ["Bags", String(row.bags)], ["Cash", naira(row.cash)], ["Transfer", naira(row.transfer)], ["Road Expenses", naira(row.roadExpenses)],
          ].map(([label, value], i) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderTop: i ? `1px solid ${C.line}` : "none" }}>
              <span style={{ fontSize: 13.5, color: C.inkSoft }}>{label}</span><span style={{ fontWeight: 600 }}>{value}</span>
            </div>
          ))}
        </Card>
        <Card style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ borderRight: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}><Stat label="Price" value={naira(row.price)} /></div>
          <div style={{ borderBottom: `1px solid ${C.line}` }}><Stat label="Outstanding" value={naira(row.outstanding)} tone={row.outstanding > 0 ? "bad" : undefined} /></div>
          <div style={{ gridColumn: "1 / -1" }}><Stat label="Commission" value={naira(row.commission)} /></div>
        </Card>
        <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 8 }}>This report is final and can no longer be edited from your account.</div>
      </div>
    );
  }

  const openConfirm = (e: React.FormEvent) => { e.preventDefault(); setShowConfirm(true); };

  const confirmSubmit = async () => {
    setSubmitting(true); setErr("");
    try {
      const res = await api<{ worker: { rows: any[] } }>("/api/records", { method: "POST", body: JSON.stringify({ weekday: tk, ...form }) });
      const r = res.worker.rows.find((x) => x.weekday === tk);
      setRow(r);
      setShowConfirm(false);
      setJustSubmitted(true);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Something went wrong.");
      setShowConfirm(false);
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>{DAY_LABEL[tk]}'s Report</div>
        <Pill tone="gold">Pending</Pill>
      </div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 16 }}>{weekLabel(weekStart)}</div>

      <Card style={{ padding: 18, marginBottom: 16 }}>
        <form onSubmit={openConfirm}>
          <Field label="Number of bags sold"><input type="number" min={0} style={inputStyle} value={form.bags} onChange={(e) => setForm((f) => ({ ...f, bags: Number(e.target.value) }))} /></Field>
          <Field label="Cash received (₦)"><input type="number" min={0} style={inputStyle} value={form.cash} onChange={(e) => setForm((f) => ({ ...f, cash: Number(e.target.value) }))} /></Field>
          <Field label="Bank transfer received (₦)"><input type="number" min={0} style={inputStyle} value={form.transfer} onChange={(e) => setForm((f) => ({ ...f, transfer: Number(e.target.value) }))} /></Field>
          <Field label="Road expenses (₦)"><input type="number" min={0} style={inputStyle} value={form.roadExpenses} onChange={(e) => setForm((f) => ({ ...f, roadExpenses: Number(e.target.value) }))} /></Field>
          {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
          <Btn type="submit" style={{ width: "100%" }}>Review & Submit</Btn>
        </form>
      </Card>

      <Card style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ borderRight: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}><Stat label="Price" value={naira(price)} /></div>
        <div style={{ borderBottom: `1px solid ${C.line}` }}><Stat label="Outstanding" value={naira(outstanding)} tone={outstanding > 0 ? "bad" : undefined} /></div>
        <div style={{ gridColumn: "1 / -1" }}><Stat label="Commission" value={naira(commission)} /></div>
      </Card>
      <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 8 }}>Price, outstanding and commission are calculated automatically. Once submitted, this report is locked and cannot be edited — the server enforces this even if the app is bypassed.</div>

      {showConfirm && (
        <ConfirmModal
          title="Review Your Report"
          rows={[
            { label: "Date", value: `${DAY_LABEL[tk]}` },
            { label: "Bags", value: String(form.bags) },
            { label: "Cash", value: naira(form.cash) },
            { label: "Transfer", value: naira(form.transfer) },
            { label: "Road Expenses", value: naira(form.roadExpenses) },
            { label: "Price", value: naira(price), emphasis: true },
            { label: "Outstanding", value: naira(outstanding), emphasis: true },
            { label: "Commission", value: naira(commission), emphasis: true },
          ]}
          note="Once confirmed, this report cannot be edited or deleted."
          onCancel={() => setShowConfirm(false)}
          onConfirm={confirmSubmit}
          confirming={submitting}
        />
      )}
    </div>
  );
}
