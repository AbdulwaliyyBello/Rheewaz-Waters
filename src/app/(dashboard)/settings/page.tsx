"use client";
import React, { useState } from "react";
import { C, Card, Field, Btn, PasswordField } from "@/lib/ui";
import { api, ApiError } from "@/lib/api-client";

export default function SettingsPage() {
  const [cur, setCur] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(""); setMsg("");
    if (next !== confirm) return setErr("New passwords do not match.");
    try {
      await api("/api/auth/change-password", { method: "POST", body: JSON.stringify({ currentPassword: cur, newPassword: next }) });
      setMsg("Password updated."); setCur(""); setNext(""); setConfirm("");
    } catch (e) { setErr(e instanceof ApiError ? e.message : "Something went wrong."); }
  };

  return (
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 16 }}>Settings</div>
      <Card style={{ padding: 18 }}>
        <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 14.5 }}>Change password</div>
        <form onSubmit={submit}>
          <Field label="Current password"><PasswordField value={cur} onChange={setCur} required /></Field>
          <Field label="New password"><PasswordField value={next} onChange={setNext} required minLength={6} /></Field>
          <Field label="Confirm new password"><PasswordField value={confirm} onChange={setConfirm} required /></Field>
          {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
          {msg && <div style={{ color: C.green, fontSize: 13, marginBottom: 10 }}>{msg}</div>}
          <Btn type="submit">Update password</Btn>
        </form>
      </Card>
    </div>
  );
}
