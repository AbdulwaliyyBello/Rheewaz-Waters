"use client";
import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { C, Card, Field, Btn, Wordmark, inputStyle } from "@/lib/ui";
import { api, ApiError } from "@/lib/api-client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const verified = params.get("verified");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);
    try {
      const res = await api<{ user: { role: string } }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      router.push(res.user.role === "worker" ? "/today" : "/current");
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: C.paper, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ marginBottom: 28 }}>
        <Wordmark size={26} />
      </div>
      <Card style={{ width: "100%", maxWidth: 380, padding: 26 }}>
        <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 18 }}>Sign in to view operations, sales and cash position.</div>
        {verified === "1" && (
          <div style={{ background: C.greenBg, color: C.green, fontSize: 13, padding: "8px 12px", borderRadius: 8, marginBottom: 14 }}>
            Email verified — you can sign in now.
          </div>
        )}
        {verified === "0" && (
          <div style={{ background: C.redBg, color: C.red, fontSize: 13, padding: "8px 12px", borderRadius: 8, marginBottom: 14 }}>
            That verification link is invalid or has expired. Ask your admin to resend an invite.
          </div>
        )}
        <form onSubmit={submit}>
          <Field label="Email">
            <input style={inputStyle} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <input style={inputStyle} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}
          <Btn type="submit" disabled={loading} style={{ width: "100%" }}>
            {loading ? "Signing in…" : "Sign in"}
          </Btn>
        </form>
      </Card>
      <div style={{ marginTop: 22, fontSize: 12, color: C.inkSoft, maxWidth: 380, textAlign: "center", lineHeight: 1.5 }}>
        First time setting up? Run <code>npm run db:seed</code> to create the initial Boss and Admin accounts.
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
