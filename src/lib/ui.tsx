"use client";
import React from "react";

export const C = {
  ink: "#0E2A2E",
  inkSoft: "#3C5B5E",
  paper: "#F7FAF9",
  card: "#FFFFFF",
  line: "#DCE6E4",
  teal: "#0F6E77",
  tealDeep: "#0A4B52",
  aqua: "#2C9DA8",
  gold: "#B98A3E",
  green: "#2E8B57",
  greenBg: "#EAF5EE",
  red: "#B14A3B",
  redBg: "#FBEDEA",
  amberBg: "#FBF3E6",
};

export const DAY_LABEL: Record<string, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
};
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat"];

export const naira = (n: number) => {
  const v = Math.round(Number(n) || 0);
  const sign = v < 0 ? "-" : "";
  return `${sign}₦${Math.abs(v).toLocaleString("en-NG")}`;
};

export function weekLabel(weekStartISO: string) {
  const start = new Date(weekStartISO + "T00:00:00");
  const end = new Date(start);
  end.setDate(end.getDate() + 5);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  const startStr = start.toLocaleDateString("en-US", opts);
  const endStr = end.toLocaleDateString("en-US", { ...opts, year: "numeric" });
  return `Week of ${startStr} – ${endStr}`;
}

export function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ background: C.card, border: `1px solid ${C.line}`, borderRadius: 14, ...style }}>{children}</div>;
}

export function Stat({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  const color = tone === "good" ? C.green : tone === "bad" ? C.red : C.ink;
  return (
    <div style={{ padding: "14px 16px" }}>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 21, fontWeight: 700, color, fontVariantNumeric: "tabular-nums" as any }}>{value}</div>
    </div>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  );
}

export const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "11px 12px",
  borderRadius: 10,
  border: `1px solid ${C.line}`,
  fontSize: 15.5,
  color: C.ink,
  background: "#fff",
  outline: "none",
};

export function Btn({
  children,
  onClick,
  variant = "primary",
  style,
  type = "button",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  style?: React.CSSProperties;
  type?: "button" | "submit";
  disabled?: boolean;
}) {
  const base: React.CSSProperties = {
    padding: "11px 18px",
    borderRadius: 10,
    fontSize: 14.5,
    fontWeight: 600,
    cursor: disabled ? "default" : "pointer",
    border: "none",
    transition: "opacity .15s",
    opacity: disabled ? 0.5 : 1,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: C.teal, color: "#fff" },
    ghost: { background: "transparent", color: C.teal, border: `1px solid ${C.teal}` },
    danger: { background: C.redBg, color: C.red },
  };
  return (
    <button type={type} disabled={disabled} onClick={onClick} style={{ ...base, ...variants[variant], ...style }}>
      {children}
    </button>
  );
}

export function Pill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "good" | "bad" | "neutral" | "gold" }) {
  const map = {
    good: { bg: C.greenBg, fg: C.green },
    bad: { bg: C.redBg, fg: C.red },
    neutral: { bg: "#EEF3F2", fg: C.inkSoft },
    gold: { bg: C.amberBg, fg: C.gold },
  } as const;
  const t = map[tone];
  return (
    <span style={{ background: t.bg, color: t.fg, fontSize: 12, fontWeight: 600, padding: "3px 9px", borderRadius: 999 }}>
      {children}
    </span>
  );
}

export function Wordmark({ size = 22, color = C.ink }: { size?: number; color?: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <svg width={size + 4} height={size + 4} viewBox="0 0 24 24" fill="none" stroke={C.teal} strokeWidth={1.8}>
        <path d="M12 2C8 8 5 11.5 5 15a7 7 0 0 0 14 0c0-3.5-3-7-7-13Z" />
      </svg>
      <span
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontStyle: "italic",
          fontWeight: 600,
          fontSize: size,
          color,
          letterSpacing: 0.2,
        }}
      >
        Rheewaz Waters
      </span>
    </span>
  );
}

type Row = { weekday: string; bags: number; price: number; cash: number; transfer: number; roadExpenses: number; outstanding: number; commission: number };
type Totals = { bags: number; price: number; cash: number; transfer: number; roadExpenses: number; outstanding: number; commission: number };

export function WeekTable({
  workerName,
  rows,
  totals,
  showCommissionPayable,
  previousOutstanding,
}: {
  workerName: string;
  rows: Row[];
  totals: Totals;
  showCommissionPayable?: boolean;
  previousOutstanding?: number;
}) {
  const commissionPayable = showCommissionPayable ? totals.commission - (previousOutstanding || 0) : null;
  return (
    <Card style={{ marginBottom: 16, overflow: "hidden" }}>
      <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.line}`, fontWeight: 700, fontSize: 15, color: C.ink }}>
        {workerName}
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 640, fontSize: 13.5 }}>
          <thead>
            <tr style={{ background: "#F2F7F6" }}>
              {["Day", "Bags", "Price", "Cash", "Transfer", "Road Exp.", "Outstanding", "Commission"].map((h, i) => (
                <th
                  key={h}
                  style={{
                    textAlign: i === 0 ? "left" : "right",
                    padding: "9px 12px",
                    color: C.inkSoft,
                    fontWeight: 600,
                    position: i === 0 ? "sticky" : "static",
                    left: 0,
                    background: "#F2F7F6",
                    whiteSpace: "nowrap",
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.weekday} style={{ borderTop: `1px solid ${C.line}` }}>
                <td style={{ padding: "9px 12px", fontWeight: 600, position: "sticky", left: 0, background: C.card }}>
                  {DAY_LABEL[r.weekday]}
                </td>
                <td style={{ padding: "9px 12px", textAlign: "right" }}>{r.bags}</td>
                <td style={{ padding: "9px 12px", textAlign: "right" }}>{naira(r.price)}</td>
                <td style={{ padding: "9px 12px", textAlign: "right" }}>{naira(r.cash)}</td>
                <td style={{ padding: "9px 12px", textAlign: "right" }}>{naira(r.transfer)}</td>
                <td style={{ padding: "9px 12px", textAlign: "right" }}>{naira(r.roadExpenses)}</td>
                <td style={{ padding: "9px 12px", textAlign: "right", color: r.outstanding > 0 ? C.red : C.inkSoft }}>
                  {naira(r.outstanding)}
                </td>
                <td style={{ padding: "9px 12px", textAlign: "right", color: C.gold, fontWeight: 600 }}>{naira(r.commission)}</td>
              </tr>
            ))}
            <tr style={{ borderTop: `2px solid ${C.ink}`, background: "#F7FAF9" }}>
              <td style={{ padding: "10px 12px", fontWeight: 800, position: "sticky", left: 0, background: "#F7FAF9" }}>TOTAL</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800 }}>{totals.bags}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800 }}>{naira(totals.price)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800 }}>{naira(totals.cash)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800 }}>{naira(totals.transfer)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800 }}>{naira(totals.roadExpenses)}</td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: totals.outstanding > 0 ? C.red : C.ink }}>
                {naira(totals.outstanding)}
              </td>
              <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: C.gold }}>{naira(totals.commission)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      {showCommissionPayable && (
        <div style={{ display: "flex", flexWrap: "wrap", borderTop: `1px solid ${C.line}` }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Stat label="Week Commission" value={naira(totals.commission)} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Stat label="Previous Outstanding" value={naira(previousOutstanding || 0)} tone={previousOutstanding ? "bad" : undefined} />
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <Stat label="Commission Payable" value={naira(commissionPayable!)} tone={commissionPayable! >= 0 ? "good" : "bad"} />
          </div>
        </div>
      )}
    </Card>
  );
}
