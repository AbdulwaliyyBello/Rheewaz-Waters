"use client";
import React, { useEffect, useState } from "react";
import { C, Card, Field, Btn, Pill, PasswordField, CardSkeleton, inputStyle } from "@/lib/ui";
import { api, ApiError } from "@/lib/api-client";

type Truck = { id: string; name: string; type: "dyna" | "hijet" };
type Worker = { id: string; name: string; email: string; active: boolean; emailVerified: boolean; truck: Truck | null };

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[] | null>(null);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [truckId, setTruckId] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const refresh = () => {
    api<{ workers: Worker[] }>("/api/workers").then((res) => setWorkers(res.workers));
    api<{ trucks: Truck[] }>("/api/trucks").then((res) => setTrucks(res.trucks));
  };
  useEffect(() => { refresh(); }, []);

  if (workers === null) return <div><CardSkeleton /><CardSkeleton /></div>;

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      const res = await api<{ emailDelivered: boolean; devVerifyUrl?: string }>("/api/workers", {
        method: "POST", body: JSON.stringify({ name, email, password, truckId: truckId || undefined }),
      });
      setName(""); setEmail(""); setPassword(""); setTruckId(""); setShowForm(false);
      setMsg(res.emailDelivered ? "Worker created. A verification email has been sent." : `Worker created. Email sending isn't configured — verification link: ${res.devVerifyUrl}`);
      refresh();
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Something went wrong."); }
  };

  const toggleActive = async (w: Worker) => { await api(`/api/workers/${w.id}`, { method: "PATCH", body: JSON.stringify({ active: !w.active }) }); refresh(); };
  const reassignTruck = async (w: Worker, newTruckId: string) => { await api(`/api/workers/${w.id}`, { method: "PATCH", body: JSON.stringify({ truckId: newTruckId }) }); refresh(); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>Workers</div>
        <Btn onClick={() => setShowForm((s) => !s)}>New worker</Btn>
      </div>

      {msg && <div style={{ marginBottom: 12, fontSize: 13, color: C.green, wordBreak: "break-all" }}>{msg}</div>}
      {err && <div style={{ marginBottom: 12, fontSize: 13, color: C.red }}>{err}</div>}

      {showForm && (
        <Card style={{ padding: 18, marginBottom: 16 }}>
          <form onSubmit={create}>
            <Field label="Worker name"><input required style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} /></Field>
            <Field label="Email"><input required type="email" style={inputStyle} value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
            <Field label="Temporary password"><PasswordField value={password} onChange={setPassword} required minLength={6} /></Field>
            <Field label="Assign truck (optional)">
              <select style={inputStyle} value={truckId} onChange={(e) => setTruckId(e.target.value)}>
                <option value="">No truck yet</option>
                {trucks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </Field>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn type="submit">Create account</Btn>
              <Btn type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
            </div>
          </form>
        </Card>
      )}

      {workers.length === 0 && <div style={{ padding: 24, textAlign: "center", color: C.inkSoft }}>No workers yet.</div>}

      {workers.map((w) => (
        <Card key={w.id} style={{ padding: 14, marginBottom: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14.5 }}>{w.name}</div>
              <div style={{ fontSize: 12.5, color: C.inkSoft }}>{w.email}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {!w.emailVerified && <Pill tone="gold">Unverified</Pill>}
              <Pill tone={w.active ? "good" : "bad"}>{w.active ? "Active" : "Deactivated"}</Pill>
              <button onClick={() => toggleActive(w)} style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: w.active ? C.red : C.green }}>
                {w.active ? "Deactivate" : "Reactivate"}
              </button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, borderTop: `1px solid ${C.line}`, paddingTop: 10 }}>
            <span style={{ fontSize: 12.5, color: C.inkSoft }}>Truck:</span>
            <select style={{ ...inputStyle, width: "auto", padding: "5px 10px", fontSize: 13 }} value={w.truck?.id || ""} onChange={(e) => reassignTruck(w, e.target.value)}>
              <option value="">Unassigned</option>
              {trucks.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </Card>
      ))}
      <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 6 }}>Deactivating a worker preserves all their historical sales records and prevents them from logging in.</div>
    </div>
  );
}
