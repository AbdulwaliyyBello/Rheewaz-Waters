"use client";
import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { C, Wordmark, Pill } from "@/lib/ui";
import { api } from "@/lib/api-client";

type SessionUser = { id: string; name: string; email: string; role: "boss" | "admin" | "worker" };

const NAV: Record<string, { key: string; label: string; href: string }[]> = {
  boss: [
    { key: "current", label: "Current Week", href: "/current" },
    { key: "previous", label: "Previous Weeks", href: "/previous" },
    { key: "analytics", label: "Analytics", href: "/analytics" },
    { key: "workers", label: "Workers", href: "/workers" },
    { key: "settings", label: "Settings", href: "/settings" },
  ],
  admin: [
    { key: "current", label: "Current Week", href: "/current" },
    { key: "expenses", label: "Factory Expenses", href: "/expenses" },
    { key: "workers", label: "Workers", href: "/workers" },
    { key: "settings", label: "Settings", href: "/settings" },
  ],
  worker: [
    { key: "today", label: "Today's Report", href: "/today" },
    { key: "myweek", label: "My Week", href: "/myweek" },
    { key: "settings", label: "Settings", href: "/settings" },
  ],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api<{ user: SessionUser }>("/api/auth/me")
      .then((res) => setUser(res.user))
      .catch(() => router.replace("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  const logout = async () => {
    await api("/api/auth/logout", { method: "POST" });
    router.replace("/login");
  };

  if (loading || !user) {
    return <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: C.inkSoft }}>Loading…</div>;
  }

  const items = NAV[user.role];

  return (
    <div style={{ minHeight: "100vh", background: C.paper }}>
      <div style={{ position: "sticky", top: 0, zIndex: 20, background: C.card, borderBottom: `1px solid ${C.line}` }}>
        <div style={{ maxWidth: 1040, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Wordmark size={17} />
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Pill tone="neutral">{user.role === "boss" ? "Boss" : user.role === "admin" ? "Admin" : user.name}</Pill>
            <button onClick={logout} title="Log out" style={{ background: "none", border: "none", cursor: "pointer", color: C.inkSoft }}>
              Log out
            </button>
          </div>
        </div>
        <div className="rw-desktop-nav" style={{ maxWidth: 1040, margin: "0 auto", padding: "0 16px", display: "none" }}>
          {items.map((it) => (
            <Link
              key={it.key}
              href={it.href}
              style={{
                padding: "10px 4px",
                marginRight: 22,
                fontSize: 14,
                fontWeight: 600,
                color: pathname?.startsWith(it.href) ? C.teal : C.inkSoft,
                borderBottom: pathname?.startsWith(it.href) ? `2px solid ${C.teal}` : "2px solid transparent",
                textDecoration: "none",
                display: "inline-block",
              }}
            >
              {it.label}
            </Link>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1040, margin: "0 auto", padding: "18px 14px 90px" }}>{children}</div>

      <div
        className="rw-mobile-nav"
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: C.card,
          borderTop: `1px solid ${C.line}`,
          display: "flex",
          justifyContent: "space-around",
          padding: "8px 4px",
          zIndex: 20,
        }}
      >
        {items.map((it) => {
          const active = pathname?.startsWith(it.href);
          return (
            <Link
              key={it.key}
              href={it.href}
              style={{
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                color: active ? C.teal : C.inkSoft,
                flex: 1,
                padding: "4px 0",
                fontSize: 10.5,
                fontWeight: active ? 700 : 500,
              }}
            >
              {it.label}
            </Link>
          );
        })}
      </div>
      <style>{`
        @media (min-width: 860px) {
          .rw-desktop-nav { display: flex !important; }
          .rw-mobile-nav { display: none !important; }
        }
      `}</style>
    </div>
  );
}
