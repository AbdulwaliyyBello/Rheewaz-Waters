"use client";
import React, { useState, useEffect } from "react";
import { C, Card, Stat, Field, Btn, ConfirmModal, SubmittedFlash, naira, inputStyle , CardSkeleton } from "@/lib/ui";
import { api, ApiError } from "@/lib/api-client";

type Summary = {
  weekStart: string; bagsSold: number; currentWeekCommission: number; previousOutstanding: number;
  repaymentsMade: number; remainingOutstanding: number; entitlement: number;
  repayments: { id: string; amount: number; remainingOutstanding: number; submittedAt: string }[];
};

export default function DebtPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [justPaid, setJustPaid] = useState(false);
  const [err, setErr] = useState("");

  const load = () => api<Summary>("/api/debt").then(setSummary);
  useEffect(() => { load(); }, []);

  if (!summary) return <div><CardSkeleton /><CardSkeleton /></div>;

  const openConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    if (amount <= 0) return setErr("Enter an amount greater than zero.");
    if (amount > summary.remainingOutstanding) return setErr("You can't repay more than the outstanding balance.");
    setShowConfirm(true);
  };

  const confirmRepay = async () => {
    setSubmitting(true); setErr("");
    try {
      await api("/api/debt", { method: "POST", body: JSON.stringify({ amount }) });
      setShowConfirm(false);
      setJustPaid(true);
      setAmount(0);
      await load();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Something went wrong.");
      setShowConfirm(false);
    } finally { setSubmitting(false); }
  };

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>Repay Previous Outstanding</div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 16 }}>Repayments are final once confirmed and reduce what's owed against your entitlement.</div>

      {justPaid && <div style={{ marginBottom: 14 }}><SubmittedFlash label="Repayment Submitted" /></div>}

      <Card style={{ marginBottom: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ borderRight: `1px solid ${C.line}`, borderBottom: `1px solid ${C.line}` }}><Stat label="Current Week Commission" value={naira(summary.currentWeekCommission)} /></div>
          <div style={{ borderBottom: `1px solid ${C.line}` }}><Stat label="Bags Sold" value={String(summary.bagsSold)} /></div>
          <div style={{ borderRight: `1px solid ${C.line}` }}><Stat label="Previous Outstanding" value={naira(summary.previousOutstanding)} tone={summary.previousOutstanding ? "bad" : undefined} /></div>
          <div><Stat label="Repayments Made" value={naira(summary.repaymentsMade)} /></div>
        </div>
      </Card>

      <Card style={{ marginBottom: 16, background: "#F7FAF9" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          <div style={{ borderRight: `1px solid ${C.line}` }}><Stat label="Remaining Outstanding" value={naira(summary.remainingOutstanding)} tone={summary.remainingOutstanding ? "bad" : "good"} /></div>
          <div><Stat label="This Week's Entitlement" value={naira(summary.entitlement)} tone={summary.entitlement >= 0 ? "good" : "bad"} /></div>
        </div>
      </Card>

      {summary.remainingOutstanding > 0 ? (
        <Card style={{ padding: 18, marginBottom: 16 }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Repay Outstanding</div>
          <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 14 }}>Outstanding balance: {naira(summary.remainingOutstanding)}. You can repay all or part of it.</div>
          <form onSubmit={openConfirm}>
            <Field label="Amount to repay (₦)">
              <input type="number" min={1} max={summary.remainingOutstanding} style={inputStyle} value={amount || ""} onChange={(e) => setAmount(Number(e.target.value))} />
            </Field>
            {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
            <Btn type="submit" style={{ width: "100%" }}>Continue</Btn>
          </form>
        </Card>
      ) : (
        <div style={{ padding: 20, textAlign: "center", color: C.green, fontWeight: 600, fontSize: 14 }}>No outstanding balance — you're all settled up.</div>
      )}

      {summary.repayments.length > 0 && (
        <Card style={{ padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10 }}>Repayment History</div>
          {summary.repayments.map((r, i) => (
            <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: i ? `1px solid ${C.line}` : "none", fontSize: 13 }}>
              <span style={{ color: C.inkSoft }}>{new Date(r.submittedAt).toLocaleDateString()}</span>
              <span style={{ fontWeight: 600 }}>{naira(r.amount)}</span>
              <span style={{ color: C.inkSoft }}>→ {naira(r.remainingOutstanding)} left</span>
            </div>
          ))}
        </Card>
      )}

      {showConfirm && (
        <ConfirmModal
          title="Confirm Debt Repayment"
          rows={[
            { label: "Previous Outstanding", value: naira(summary.remainingOutstanding) },
            { label: "Repayment", value: naira(amount) },
            { label: "Remaining Outstanding", value: naira(summary.remainingOutstanding - amount), emphasis: true },
          ]}
          note="Once submitted, this repayment cannot be altered."
          onCancel={() => setShowConfirm(false)}
          onConfirm={confirmRepay}
          confirming={submitting}
          confirmLabel="Confirm Repayment"
        />
      )}
    </div>
  );
}
