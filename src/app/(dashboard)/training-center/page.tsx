"use client";
import React, { useEffect, useState } from "react";
import { C, Card, Field, Btn, Pill, inputStyle } from "@/lib/ui";
import { api } from "@/lib/api-client";

type Example = { id: string; tripId: string; aiPredictedBags: number; bossActualBags: number; errorType: string; bossNote: string | null; trainingRunId: string | null; createdAt: string };
type Run = { id: string; truckType: string; status: string; createdAt: string; evaluatedAt: string | null; promotedAt: string | null; notes: string | null; resultingModelVersionId: string | null };
type Version = { id: string; truckType: string; version: number; isProduction: boolean; evaluationScore: number | null; promotedAt: string | null };

export default function TrainingCenterPage() {
  const [truck, setTruck] = useState<"dyna" | "hijet">("dyna");
  const [examples, setExamples] = useState<Example[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [counters, setCounters] = useState<Record<string, { unbatched: number; remaining: number }>>({});
  const [versions, setVersions] = useState<Version[]>([]);

  const refresh = () => {
    api<{ examples: Example[] }>(`/api/ai/corrections?truckType=${truck}`).then((r) => setExamples(r.examples));
    api<{ runs: Run[]; counters: any }>(`/api/ai/training-runs?truckType=${truck}`).then((r) => { setRuns(r.runs); setCounters(r.counters); });
    api<{ versions: Version[] }>(`/api/ai/model-versions?truckType=${truck}`).then((r) => setVersions(r.versions));
  };
  useEffect(() => { refresh(); }, [truck]);

  const counter = counters[truck];

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 4 }}>AI Training Center</div>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 16 }}>Every Boss correction against a real AI prediction becomes labelled training data automatically.</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        {(["dyna", "hijet"] as const).map((t) => (
          <button key={t} onClick={() => setTruck(t)} style={{ padding: "8px 16px", borderRadius: 999, border: `1px solid ${t === truck ? C.teal : C.line}`, background: t === truck ? C.teal : "#fff", color: t === truck ? "#fff" : C.inkSoft, fontSize: 13, fontWeight: 700, cursor: "pointer" }}>
            {t === "dyna" ? "DYNA" : "DAIHATSU"}
          </button>
        ))}
      </div>

      <Card style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 13, color: C.inkSoft }}>Unbatched corrections</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{counter?.unbatched ?? 0} / 5</div>
          </div>
          <div style={{ textAlign: "right", fontSize: 12.5, color: C.inkSoft }}>
            {counter && counter.remaining > 0 ? `${counter.remaining} more correction${counter.remaining === 1 ? "" : "s"} until the next training run` : "Training run threshold reached"}
          </div>
        </div>
      </Card>

      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10 }}>Model Versions</div>
      {versions.length === 0 && <div style={{ padding: 16, textAlign: "center", color: C.inkSoft, fontSize: 13 }}>No trained/promoted versions yet for this truck.</div>}
      {versions.map((v) => (
        <Card key={v.id} style={{ padding: 14, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700 }}>{truck === "dyna" ? "Dyna" : "Daihatsu"} v{v.version}</div>
            <div style={{ fontSize: 12, color: C.inkSoft }}>{v.evaluationScore != null ? `Evaluation score: ${v.evaluationScore}` : "Not evaluated"}</div>
          </div>
          {v.isProduction && <Pill tone="good">Production</Pill>}
        </Card>
      ))}

      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, marginTop: 20 }}>Training Runs</div>
      {runs.length === 0 && <div style={{ padding: 16, textAlign: "center", color: C.inkSoft, fontSize: 13 }}>No training runs yet.</div>}
      {runs.map((r) => <TrainingRunCard key={r.id} run={r} onChanged={refresh} />)}

      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 10, marginTop: 20 }}>Corrections</div>
      {examples.length === 0 && <div style={{ padding: 16, textAlign: "center", color: C.inkSoft, fontSize: 13 }}>No corrections recorded yet for this truck.</div>}
      {examples.map((ex) => (
        <Card key={ex.id} style={{ padding: 14, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
            <span>AI predicted <strong>{ex.aiPredictedBags}</strong> → Boss actual <strong>{ex.bossActualBags}</strong></span>
            <Pill tone="neutral">{ex.errorType.replace(/_/g, " ")}</Pill>
          </div>
          {ex.bossNote && <div style={{ fontSize: 12, color: C.inkSoft, marginTop: 6 }}>{ex.bossNote}</div>}
        </Card>
      ))}
    </div>
  );
}

function TrainingRunCard({ run, onChanged }: { run: Run; onChanged: () => void }) {
  const [score, setScore] = useState<number>(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const pending = run.status === "training" || run.status === "evaluating";

  const evaluate = async (promote: boolean) => {
    setBusy(true);
    await api(`/api/ai/training-runs/${run.id}`, { method: "PATCH", body: JSON.stringify({ evaluationScore: score, evaluationNotes: notes, promote }) });
    setBusy(false); onChanged();
  };

  return (
    <Card style={{ padding: 14, marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{new Date(run.createdAt).toLocaleDateString()}</div>
        <Pill tone={run.status === "promoted" ? "good" : run.status === "rejected" ? "bad" : "gold"}>{run.status}</Pill>
      </div>
      {run.notes && <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>{run.notes}</div>}
      {pending && (
        <div style={{ borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 8 }}>Enter the real evaluation result from the external training pipeline before promoting — nothing is auto-promoted.</div>
          <Field label="Evaluation score"><input type="number" step="0.01" style={inputStyle} value={score} onChange={(e) => setScore(Number(e.target.value))} /></Field>
          <Field label="Notes"><input style={inputStyle} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
          <div style={{ display: "flex", gap: 10 }}>
            <Btn variant="danger" onClick={() => evaluate(false)} disabled={busy}>Reject</Btn>
            <Btn onClick={() => evaluate(true)} disabled={busy}>Promote to Production</Btn>
          </div>
        </div>
      )}
    </Card>
  );
}
