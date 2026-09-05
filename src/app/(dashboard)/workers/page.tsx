"use client";
import React, { useEffect, useState } from "react";
import { C, Card, Field, Btn, Pill, inputStyle } from "@/lib/ui";
import { api, ApiError } from "@/lib/api-client";

type Worker = { id: string; name: string; email: string; active: boolean; emailVerified: boolean };

export default function WorkersPage() {
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const refresh = () => api<{ workers: Worker[] }>("/api/workers").then((res) => setWorkers(res.workers));
  useEffect(() => { refresh(); }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setMsg("");
    try {
      const res = await api<{ emailDelivered: boolean; devVerifyUrl?: string }>("/api/workers", {
        method: "POST",
        body: JSON.stringify({ name, email, password }),
      });
      setName(""); setEmail(""); setPassword(""); setShowForm(false);
      setMsg(
        res.emailDelivered
          ? "Worker created. A verification email has been sent."
          : `Worker created. Email sending isn't configured yet — verification link: ${res.devVerifyUrl}`
      );
      refresh();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Something went wrong.");
    }
  };

  const toggleActive = async (w: Worker) => {
    await api(`/api/workers/${w.id}`, { method: "PATCH", body: JSON.stringify({ active: !w.active }) });
    refresh();
  };

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
            <Field label="Temporary password"><input required minLength={6} style={inputStyle} value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
            <div style={{ display: "flex", gap: 10 }}>
              <Btn type="submit">Create account</Btn>
              <Btn type="button" variant="ghost" onClick={() => setShowForm(false)}>Cancel</Btn>
            </div>
          </form>
        </Card>
      )}

      {workers.length === 0 && <div style={{ padding: 24, textAlign: "center", color: C.inkSoft }}>No workers yet.</div>}

      {workers.map((w) => (
        <Card key={w.id} style={{ padding: 14, marginBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14.5 }}>{w.name}</div>
            <div style={{ fontSize: 12.5, color: C.inkSoft }}>{w.email}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!w.emailVerified && <Pill tone="gold">Unverified</Pill>}
            <Pill tone={w.active ? "good" : "bad"}>{w.active ? "Active" : "Deactivated"}</Pill>
            <button
              onClick={() => toggleActive(w)}
              style={{ background: "none", border: `1px solid ${C.line}`, borderRadius: 8, padding: "5px 10px", cursor: "pointer", fontSize: 12, color: w.active ? C.red : C.green }}
            >
              {w.active ? "Deactivate" : "Reactivate"}
            </button>
          </div>
        </Card>
      ))}
      <div style={{ fontSize: 11.5, color: C.inkSoft, marginTop: 6 }}>
        Deactivating a worker preserves all their historical sales records and prevents them from logging in.
      </div>
    </div>
  );
}
