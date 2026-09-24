"use client";
import React, { useState } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";

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
  return `Week of ${start.toLocaleDateString("en-US", opts)} – ${end.toLocaleDateString("en-US", { ...opts, year: "numeric" })}`;
}

export function Card({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        background: C.card,
        border: `1px solid ${C.line}`,
        borderRadius: 14,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "good" | "bad";
}) {
  const color = tone === "good" ? C.green : tone === "bad" ? C.red : C.ink;
  return (
    <div style={{ padding: "14px 16px" }}>
      <div style={{ fontSize: 12.5, color: C.inkSoft, marginBottom: 4 }}>
        {label}
      </div>
      <div
        style={{
          fontSize: 21,
          fontWeight: 700,
          color,
          fontVariantNumeric: "tabular-nums" as any,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      <div style={{ fontSize: 13, color: C.inkSoft, marginBottom: 6 }}>
        {label}
      </div>
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

/** Standard show/hide password input (spec section 40). */
export function PasswordField({
  value,
  onChange,
  required,
  minLength,
}: {
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  minLength?: number;
}) {
  const [show, setShow] = useState(false);
  return (
    <div style={{ position: "relative" }}>
      <input
        style={{ ...inputStyle, paddingRight: 40 }}
        type={show ? "text" : "password"}
        value={value}
        required={required}
        minLength={minLength}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        style={{
          position: "absolute",
          right: 10,
          top: 10,
          background: "none",
          border: "none",
          cursor: "pointer",
          color: C.inkSoft,
          display: "flex",
        }}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}

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
    transition: "opacity .15s, transform .1s",
    opacity: disabled ? 0.5 : 1,
  };
  const variants: Record<string, React.CSSProperties> = {
    primary: { background: C.teal, color: "#fff" },
    ghost: {
      background: "transparent",
      color: C.teal,
      border: `1px solid ${C.teal}`,
    },
    danger: { background: C.redBg, color: C.red },
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      style={{ ...base, ...variants[variant], ...style }}
    >
      {children}
    </button>
  );
}

export function Pill({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "good" | "bad" | "neutral" | "gold";
}) {
  const map = {
    good: { bg: C.greenBg, fg: C.green },
    bad: { bg: C.redBg, fg: C.red },
    neutral: { bg: "#EEF3F2", fg: C.inkSoft },
    gold: { bg: C.amberBg, fg: C.gold },
  } as const;
  const t = map[tone];
  return (
    <span
      style={{
        background: t.bg,
        color: t.fg,
        fontSize: 12,
        fontWeight: 600,
        padding: "3px 9px",
        borderRadius: 999,
      }}
    >
      {children}
    </span>
  );
}

export function Wordmark({
  size = 22,
  color = C.ink,
}: {
  size?: number;
  color?: string;
}) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <svg
        width={size + 4}
        height={size + 4}
        viewBox="0 0 24 24"
        fill="none"
        stroke={C.teal}
        strokeWidth={1.8}
      >
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

/** Splash animation — short, premium, non-blocking beyond ~1.2s (spec section 37). */
export function Splash({ onDone }: { onDone: () => void }) {
  const [show, setShow] = useState(true);
  React.useEffect(() => {
    const t1 = setTimeout(() => setShow(false), 900);
    const t2 = setTimeout(onDone, 1200);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: C.tealDeep,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        opacity: show ? 1 : 0,
        transition: "opacity .3s ease",
      }}
    >
      <div
        style={{
          textAlign: "center",
          animation: "rw-rise .7s cubic-bezier(.2,.8,.2,1)",
        }}
      >
        <svg
          width={40}
          height={40}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fff"
          strokeWidth={1.6}
          style={{ marginBottom: 10 }}
        >
          <path d="M12 2C8 8 5 11.5 5 15a7 7 0 0 0 14 0c0-3.5-3-7-7-13Z" />
        </svg>
        <div
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: "italic",
            fontWeight: 600,
            fontSize: 28,
            color: "#fff",
          }}
        >
          Rheewaz Waters
        </div>
      </div>
      <style>{`@keyframes rw-rise { from { opacity:0; transform: translateY(10px) scale(.98);} to { opacity:1; transform:translateY(0) scale(1);} }`}</style>
    </div>
  );
}

/**
 * Lightweight branded loading state shown while the app fetches session/
 * backend data on initial load — distinct from the login page's Splash,
 * which is a fixed short animation. This one lasts exactly as long as the
 * real fetch takes.
 */
export function AppLoading() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        background: C.paper,
      }}
    >
      <Wordmark size={20} />
      <div style={{ display: "flex", gap: 5 }}>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: C.teal,
              animation: `rw-dot 1.1s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
      <style>{`@keyframes rw-dot { 0%,80%,100% { opacity: .25; transform: scale(.85); } 40% { opacity: 1; transform: scale(1); } }`}</style>
    </div>
  );
}

/** Skeleton block for loading states — never a blank white screen (spec section 38). */
export function Skeleton({
  height = 16,
  width = "100%",
  style,
}: {
  height?: number;
  width?: string | number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{
        height,
        width,
        borderRadius: 8,
        background:
          "linear-gradient(90deg,#EEF3F2 25%,#F7FAF9 37%,#EEF3F2 63%)",
        backgroundSize: "400% 100%",
        animation: "rw-shimmer 1.4s ease infinite",
        ...style,
      }}
    >
      <style>{`@keyframes rw-shimmer { 0% { background-position: 100% 50%; } 100% { background-position: 0 50%; } }`}</style>
    </div>
  );
}
export function CardSkeleton() {
  return (
    <Card style={{ padding: 16, marginBottom: 16 }}>
      <Skeleton height={14} width="40%" style={{ marginBottom: 10 }} />
      <Skeleton height={22} width="60%" />
    </Card>
  );
}

/**
 * Generic confirmation modal — used by Worker daily-report submission and
 * debt-repayment submission (spec sections 2 and 6). Shows the exact values
 * about to be submitted; disables the confirm button while the request is
 * in flight so a double-tap can't double-submit.
 */
export function ConfirmModal({
  title,
  rows,
  note,
  onCancel,
  onConfirm,
  confirming,
  confirmLabel = "Confirm & Submit",
  cancelLabel = "Go Back",
}: {
  title: string;
  rows: { label: string; value: string; emphasis?: boolean }[];
  note?: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirming: boolean;
  confirmLabel?: string;
  cancelLabel?: string;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(14,42,46,0.45)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        style={{
          background: C.card,
          borderRadius: "16px 16px 0 0",
          width: "100%",
          maxWidth: 460,
          padding: 22,
          animation: "rw-slideup .25s ease",
        }}
      >
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 14 }}>
          {title}
        </div>
        <div
          style={{
            border: `1px solid ${C.line}`,
            borderRadius: 10,
            overflow: "hidden",
            marginBottom: 14,
          }}
        >
          {rows.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                justifyContent: "space-between",
                padding: "10px 14px",
                borderTop: i ? `1px solid ${C.line}` : "none",
                background: r.emphasis ? "#F7FAF9" : "transparent",
              }}
            >
              <span style={{ fontSize: 13.5, color: C.inkSoft }}>
                {r.label}
              </span>
              <span
                style={{
                  fontSize: 14.5,
                  fontWeight: r.emphasis ? 800 : 600,
                  color: C.ink,
                }}
              >
                {r.value}
              </span>
            </div>
          ))}
        </div>
        {note && (
          <div style={{ fontSize: 12, color: C.inkSoft, marginBottom: 16 }}>
            {note}
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <Btn
            variant="ghost"
            onClick={onCancel}
            style={{ flex: 1 }}
            disabled={confirming}
          >
            {cancelLabel}
          </Btn>
          <Btn onClick={onConfirm} style={{ flex: 1 }} disabled={confirming}>
            {confirming ? "Submitting…" : confirmLabel}
          </Btn>
        </div>
      </div>
      <style>{`@keyframes rw-slideup { from { transform: translateY(24px); opacity: .6; } to { transform: translateY(0); opacity: 1; } }`}</style>
    </div>
  );
}

/** Brief success flash shown right after a confirmed, immutable submission. */
export function SubmittedFlash({
  label = "Submitted Successfully",
}: {
  label?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        background: C.greenBg,
        color: C.green,
        padding: "10px 14px",
        borderRadius: 10,
        fontSize: 14,
        fontWeight: 600,
      }}
    >
      <Check size={16} /> {label}
    </div>
  );
}

type Row = {
  weekday: string;
  bags: number;
  price: number;
  cash: number;
  transfer: number;
  roadExpenses: number;
  outstanding: number;
  commission: number;
};

type Totals = {
  bags: number;
  price: number;
  cash: number;
  transfer: number;
  roadExpenses: number;
  outstanding: number;
  commission: number;
};

type EditValues = {
  bags: string;
  cash: string;
  transfer: string;
  roadExpenses: string;
};

export function WeekTable({
  workerName,
  rows,
  totals,
  showCommissionPayable,
  previousOutstanding,
  canEdit = false,
  weekStart,
  workerId,
}: {
  workerName: string;
  rows: Row[];
  totals: Totals;
  showCommissionPayable?: boolean;
  previousOutstanding?: number;
  canEdit?: boolean;
  weekStart?: string;
  workerId?: string;
}) {
  const commissionPayable = showCommissionPayable
    ? totals.commission - (previousOutstanding || 0)
    : null;

  const [editingRow, setEditingRow] = React.useState<Row | null>(null);

  const [editValues, setEditValues] = React.useState<EditValues>({
    bags: "",
    cash: "",
    transfer: "",
    roadExpenses: "",
  });

  const [confirming, setConfirming] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);

  const openEdit = (row: Row) => {
    setEditingRow(row);
    setEditValues({
      bags: String(row.bags),
      cash: String(row.cash),
      transfer: String(row.transfer),
      roadExpenses: String(row.roadExpenses),
    });
    setError(null);
    setSuccess(false);
    setConfirming(false);
  };

  const closeEdit = () => {
    if (saving) return;

    setEditingRow(null);
    setConfirming(false);
    setError(null);
  };

  const updateField = (field: keyof EditValues, value: string) => {
    setEditValues((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveEdit = async () => {
    if (!editingRow || !weekStart || !workerId) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/records/override", {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          weekStart,
          workerId,
          weekday: editingRow.weekday,
          bags: Math.max(0, Math.trunc(Number(editValues.bags) || 0)),
          cash: Math.max(0, Number(editValues.cash) || 0),
          transfer: Math.max(0, Number(editValues.transfer) || 0),
          roadExpenses: Math.max(0, Number(editValues.roadExpenses) || 0),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || "Could not save the correction.");
      }

      setSuccess(true);
      setConfirming(false);

      // Give the user a short success state before refreshing the
      // parent page's authoritative server data.
      window.setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the correction.",
      );
      setConfirming(false);
    } finally {
      setSaving(false);
    }
  };

  const inputProps = (field: keyof EditValues) => ({
    value: editValues[field],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      updateField(field, e.target.value),
    type: "number" as const,
    min: 0,
    step: field === "bags" ? 1 : 0.01,
    style: {
      width: "100%",
      boxSizing: "border-box" as const,
      padding: "10px 11px",
      borderRadius: 9,
      border: `1px solid ${C.line}`,
      background: C.card,
      color: C.ink,
      fontSize: 14,
      outline: "none",
    },
  });

  return (
    <>
      <Card style={{ marginBottom: 16, overflow: "hidden" }}>
        <div
          style={{
            padding: "12px 16px",
            borderBottom: `1px solid ${C.line}`,
            fontWeight: 700,
            fontSize: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span>{workerName}</span>

          {canEdit && (
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 600,
                color: C.inkSoft,
                whiteSpace: "nowrap",
              }}
            >
              Boss editing enabled
            </span>
          )}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              borderCollapse: "collapse",
              width: "100%",
              minWidth: canEdit ? 760 : 640,
              fontSize: 13.5,
            }}
          >
            <thead>
              <tr style={{ background: "#F2F7F6" }}>
                {[
                  "Day",
                  "Bags",
                  "Price",
                  "Cash",
                  "Transfer",
                  "Road Exp.",
                  "Outstanding",
                  "Commission",
                  ...(canEdit ? ["Actions"] : []),
                ].map((h, i) => (
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
                <tr
                  key={r.weekday}
                  style={{
                    borderTop: `1px solid ${C.line}`,
                  }}
                >
                  <td
                    style={{
                      padding: "9px 12px",
                      fontWeight: 600,
                      position: "sticky",
                      left: 0,
                      background: C.card,
                    }}
                  >
                    {DAY_LABEL[r.weekday]}
                  </td>

                  <td
                    style={{
                      padding: "9px 12px",
                      textAlign: "right",
                    }}
                  >
                    {r.bags}
                  </td>

                  <td
                    style={{
                      padding: "9px 12px",
                      textAlign: "right",
                    }}
                  >
                    {naira(r.price)}
                  </td>

                  <td
                    style={{
                      padding: "9px 12px",
                      textAlign: "right",
                    }}
                  >
                    {naira(r.cash)}
                  </td>

                  <td
                    style={{
                      padding: "9px 12px",
                      textAlign: "right",
                    }}
                  >
                    {naira(r.transfer)}
                  </td>

                  <td
                    style={{
                      padding: "9px 12px",
                      textAlign: "right",
                    }}
                  >
                    {naira(r.roadExpenses)}
                  </td>

                  <td
                    style={{
                      padding: "9px 12px",
                      textAlign: "right",
                      color: r.outstanding > 0 ? C.red : C.inkSoft,
                    }}
                  >
                    {naira(r.outstanding)}
                  </td>

                  <td
                    style={{
                      padding: "9px 12px",
                      textAlign: "right",
                      color: C.gold,
                      fontWeight: 600,
                    }}
                  >
                    {naira(r.commission)}
                  </td>

                  {canEdit && (
                    <td
                      style={{
                        padding: "7px 10px",
                        textAlign: "right",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => openEdit(r)}
                        style={{
                          border: `1px solid ${C.teal}`,
                          background: "transparent",
                          color: C.teal,
                          borderRadius: 8,
                          padding: "6px 10px",
                          fontSize: 12.5,
                          fontWeight: 600,
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                      >
                        Edit
                      </button>
                    </td>
                  )}
                </tr>
              ))}

              <tr
                style={{
                  borderTop: `2px solid ${C.ink}`,
                  background: "#F7FAF9",
                }}
              >
                <td
                  style={{
                    padding: "10px 12px",
                    fontWeight: 800,
                    position: "sticky",
                    left: 0,
                    background: "#F7FAF9",
                  }}
                >
                  TOTAL
                </td>

                <td
                  style={{
                    padding: "10px 12px",
                    textAlign: "right",
                    fontWeight: 800,
                  }}
                >
                  {totals.bags}
                </td>

                <td
                  style={{
                    padding: "10px 12px",
                    textAlign: "right",
                    fontWeight: 800,
                  }}
                >
                  {naira(totals.price)}
                </td>

                <td
                  style={{
                    padding: "10px 12px",
                    textAlign: "right",
                    fontWeight: 800,
                  }}
                >
                  {naira(totals.cash)}
                </td>

                <td
                  style={{
                    padding: "10px 12px",
                    textAlign: "right",
                    fontWeight: 800,
                  }}
                >
                  {naira(totals.transfer)}
                </td>

                <td
                  style={{
                    padding: "10px 12px",
                    textAlign: "right",
                    fontWeight: 800,
                  }}
                >
                  {naira(totals.roadExpenses)}
                </td>

                <td
                  style={{
                    padding: "10px 12px",
                    textAlign: "right",
                    fontWeight: 800,
                    color: totals.outstanding > 0 ? C.red : C.ink,
                  }}
                >
                  {naira(totals.outstanding)}
                </td>

                <td
                  style={{
                    padding: "10px 12px",
                    textAlign: "right",
                    fontWeight: 800,
                    color: C.gold,
                  }}
                >
                  {naira(totals.commission)}
                </td>

                {canEdit && (
                  <td
                    style={{
                      padding: "10px 12px",
                    }}
                  />
                )}
              </tr>
            </tbody>
          </table>
        </div>

        {showCommissionPayable && (
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              borderTop: `1px solid ${C.line}`,
            }}
          >
            <div style={{ flex: 1, minWidth: 140 }}>
              <Stat label="Week Commission" value={naira(totals.commission)} />
            </div>

            <div style={{ flex: 1, minWidth: 140 }}>
              <Stat
                label="Previous Outstanding"
                value={naira(previousOutstanding || 0)}
                tone={previousOutstanding ? "bad" : undefined}
              />
            </div>

            <div style={{ flex: 1, minWidth: 140 }}>
              <Stat
                label="Commission Payable"
                value={naira(commissionPayable!)}
                tone={commissionPayable! >= 0 ? "good" : "bad"}
              />
            </div>
          </div>
        )}
      </Card>

      {editingRow && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,.38)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              background: C.card,
              borderRadius: "18px 18px 0 0",
              padding: 20,
              boxSizing: "border-box",
              boxShadow: "0 -10px 40px rgba(0,0,0,.15)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 18,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: C.ink,
                  }}
                >
                  Edit {DAY_LABEL[editingRow.weekday]} report
                </div>

                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12.5,
                    color: C.inkSoft,
                  }}
                >
                  {workerName}
                </div>
              </div>

              <button
                type="button"
                onClick={closeEdit}
                disabled={saving}
                style={{
                  border: "none",
                  background: "transparent",
                  color: C.inkSoft,
                  fontSize: 22,
                  cursor: saving ? "default" : "pointer",
                  padding: 2,
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: C.inkSoft,
                    marginBottom: 6,
                  }}
                >
                  Bags
                </div>
                <input {...inputProps("bags")} />
              </div>

              <div>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: C.inkSoft,
                    marginBottom: 6,
                  }}
                >
                  Cash
                </div>
                <input {...inputProps("cash")} />
              </div>

              <div>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: C.inkSoft,
                    marginBottom: 6,
                  }}
                >
                  Transfer
                </div>
                <input {...inputProps("transfer")} />
              </div>

              <div>
                <div
                  style={{
                    fontSize: 12.5,
                    fontWeight: 600,
                    color: C.inkSoft,
                    marginBottom: 6,
                  }}
                >
                  Road Expenses
                </div>
                <input {...inputProps("roadExpenses")} />
              </div>
            </div>

            <div
              style={{
                marginTop: 16,
                padding: 12,
                borderRadius: 10,
                background: "#F7FAF9",
                border: `1px solid ${C.line}`,
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  color: C.inkSoft,
                  marginBottom: 4,
                }}
              >
                Calculated values
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, 1fr)",
                  gap: 8,
                  fontSize: 12.5,
                }}
              >
                <div>
                  <strong>Price</strong>
                  <div>
                    {naira(
                      Math.max(0, Math.trunc(Number(editValues.bags) || 0)) *
                        350,
                    )}
                  </div>
                </div>

                <div>
                  <strong>Outstanding</strong>
                  <div>
                    {naira(
                      Math.max(0, Math.trunc(Number(editValues.bags) || 0)) *
                        350 -
                        Math.max(0, Number(editValues.cash) || 0) -
                        Math.max(0, Number(editValues.transfer) || 0) -
                        Math.max(0, Number(editValues.roadExpenses) || 0),
                    )}
                  </div>
                </div>

                <div>
                  <strong>Commission</strong>
                  <div>
                    {naira(
                      Math.max(0, Math.trunc(Number(editValues.bags) || 0)) *
                        12,
                    )}
                  </div>
                </div>
              </div>
            </div>

            {error && (
              <div
                style={{
                  marginTop: 14,
                  padding: 11,
                  borderRadius: 9,
                  background: C.redBg,
                  color: C.red,
                  fontSize: 13,
                }}
              >
                {error}
              </div>
            )}

            {success && (
              <div
                style={{
                  marginTop: 14,
                  padding: 11,
                  borderRadius: 9,
                  background: "#EAF7F2",
                  color: C.teal,
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                Correction saved successfully.
              </div>
            )}

            {!confirming && !success && (
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  marginTop: 18,
                }}
              >
                <Btn variant="ghost" onClick={closeEdit} disabled={saving}>
                  Cancel
                </Btn>

                <Btn
                  onClick={() => {
                    setError(null);
                    setConfirming(true);
                  }}
                  disabled={saving}
                >
                  Review Correction
                </Btn>
              </div>
            )}

            {confirming && !success && (
              <div
                style={{
                  marginTop: 18,
                  padding: 14,
                  borderRadius: 11,
                  background: C.amberBg,
                  border: `1px solid ${C.line}`,
                }}
              >
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    marginBottom: 6,
                  }}
                >
                  Confirm Boss override
                </div>

                <div
                  style={{
                    fontSize: 12.5,
                    color: C.inkSoft,
                    lineHeight: 1.5,
                  }}
                >
                  This will replace the existing values for{" "}
                  <strong>{DAY_LABEL[editingRow.weekday]}</strong> with the
                  figures above. The worker's submission status will remain
                  unchanged.
                </div>

                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "flex-end",
                    marginTop: 14,
                  }}
                >
                  <Btn
                    variant="ghost"
                    onClick={() => setConfirming(false)}
                    disabled={saving}
                  >
                    Go Back
                  </Btn>

                  <Btn onClick={saveEdit} disabled={saving}>
                    {saving ? "Saving..." : "Confirm & Save"}
                  </Btn>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
