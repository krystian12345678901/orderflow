// src/components/ui.jsx — Shared UI components
import { useState, useEffect } from "react";
import { STATUS_LABELS, STATUS_COLORS, ROLE_LABELS, ROLE_COLORS, TIMEOUT_SECONDS } from "../lib/constants";
import { useToastStore } from "../store";

// ── STATUS BADGE ──────────────────────────────────────────────────────────────
export function StatusBadge({ status }) {
  const color = STATUS_COLORS[status] || "#64748b";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px",
      borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5,
      background: color + "22", color, border: `1px solid ${color}44`,
      textTransform: "uppercase", whiteSpace: "nowrap",
    }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: color, flexShrink: 0 }}/>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

// ── ROLE BADGE ────────────────────────────────────────────────────────────────
export function RoleBadge({ role }) {
  const color = ROLE_COLORS[role] || "#64748b";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", padding: "2px 9px",
      borderRadius: 4, fontSize: 11, fontWeight: 600,
      background: color + "22", color, border: `1px solid ${color}44`,
    }}>
      {ROLE_LABELS[role] || role}
    </span>
  );
}

// ── COUNTDOWN TIMER ───────────────────────────────────────────────────────────
export function CountdownTimer({ claimedAt, timeoutSeconds = TIMEOUT_SECONDS }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const update = () => {
      const elapsed = Date.now() - new Date(claimedAt).getTime();
      setRemaining(Math.max(0, timeoutSeconds * 1000 - elapsed));
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [claimedAt, timeoutSeconds]);

  const hours = Math.floor(remaining / 3600000);
  const mins  = Math.floor((remaining % 3600000) / 60000);
  const secs  = Math.floor((remaining % 60000) / 1000);
  const pct   = (remaining / (timeoutSeconds * 1000)) * 100;
  const urgent = pct < 20;
  const warn   = pct < 50;
  const color  = urgent ? "#ef4444" : warn ? "#f59e0b" : "#22c55e";
  const R = 18;
  const circ = 2 * Math.PI * R;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ position: "relative", width: 44, height: 44, flexShrink: 0 }}>
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r={R} fill="none" stroke="#1e293b" strokeWidth="4"/>
          <circle cx="22" cy="22" r={R} fill="none"
            stroke={color} strokeWidth="4"
            strokeDasharray={circ}
            strokeDashoffset={circ * (1 - pct / 100)}
            strokeLinecap="round"
            transform="rotate(-90 22 22)"
            style={{ transition: "stroke-dashoffset 1s linear, stroke 0.3s" }}
          />
        </svg>
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, color }}>
          {urgent ? "⚠" : "⏱"}
        </div>
      </div>
      <div>
        <div style={{ fontFamily: "'Space Mono', monospace", fontSize: 18, fontWeight: 700, letterSpacing: 1, color }}>
          {String(hours).padStart(2,"0")}:{String(mins).padStart(2,"0")}:{String(secs).padStart(2,"0")}
        </div>
        <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>pozostały czas</div>
      </div>
    </div>
  );
}

// ── BUTTON ────────────────────────────────────────────────────────────────────
export function Button({ children, onClick, variant = "primary", disabled, style: extraStyle, icon, type = "button", loading }) {
  const [hover, setHover] = useState(false);
  const variants = {
    primary:   { bg: "#1d4ed8", hoverBg: "#2563eb", color: "#fff",    border: "transparent" },
    success:   { bg: "#15803d", hoverBg: "#16a34a", color: "#fff",    border: "transparent" },
    danger:    { bg: "#b91c1c", hoverBg: "#dc2626", color: "#fff",    border: "transparent" },
    warning:   { bg: "#b45309", hoverBg: "#d97706", color: "#fff",    border: "transparent" },
    ghost:     { bg: "transparent", hoverBg: "#1e293b", color: "#94a3b8", border: "#1e293b" },
    secondary: { bg: "#1e293b", hoverBg: "#273548",  color: "#e2e8f0", border: "transparent" },
  };
  const v = variants[variant] || variants.primary;
  const isDisabled = disabled || loading;
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: "9px 18px", borderRadius: 6, border: `1px solid ${v.border}`,
        background: isDisabled ? "#1e293b" : hover ? v.hoverBg : v.bg,
        color: isDisabled ? "#4b5563" : v.color,
        cursor: isDisabled ? "not-allowed" : "pointer",
        fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6,
        transition: "all 0.15s ease", whiteSpace: "nowrap",
        ...extraStyle,
      }}>
      {loading ? <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⟳</span> : icon}
      {children}
    </button>
  );
}

// ── INPUT ─────────────────────────────────────────────────────────────────────
export function Input({ label, type = "text", value, onChange, placeholder, required, style: extraStyle, multiline, rows = 3 }) {
  const inputStyle = {
    width: "100%", padding: "9px 12px", background: "#0f172a",
    border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0",
    fontSize: 13, outline: "none", boxSizing: "border-box",
    transition: "border-color 0.15s",
    ...extraStyle,
  };

  return (
    <div>
      {label && (
        <label style={{ display: "block", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, fontWeight: 600 }}>
          {label}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
        </label>
      )}
      {multiline
        ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} style={{ ...inputStyle, resize: "vertical" }} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
      }
    </div>
  );
}

// ── SELECT ────────────────────────────────────────────────────────────────────
export function Select({ label, value, onChange, options, placeholder }) {
  return (
    <div>
      {label && <label style={{ display: "block", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, fontWeight: 600 }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", padding: "9px 12px", background: "#0f172a", border: "1px solid #334155", borderRadius: 6, color: value ? "#e2e8f0" : "#64748b", fontSize: 13, outline: "none" }}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ── CARD ──────────────────────────────────────────────────────────────────────
export function Card({ children, style: extraStyle }) {
  return (
    <div style={{ background: "#0d1117", border: "1px solid #1e293b", borderRadius: 8, ...extraStyle }}>
      {children}
    </div>
  );
}

// ── MODAL ─────────────────────────────────────────────────────────────────────
export function Modal({ children, onClose, maxWidth = 680, title }) {
  useEffect(() => {
    const handle = (e) => e.key === "Escape" && onClose?.();
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [onClose]);

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose?.()}>
      <div style={{ background: "#0d1117", border: "1px solid #1e293b", borderRadius: 12, width: "100%", maxWidth, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>
        {title && (
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #1e293b", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{title}</h3>
            <button onClick={onClose} style={{ background: "#1e293b", border: "none", color: "#94a3b8", width: 30, height: 30, borderRadius: 6, cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        )}
        <div style={{ flex: 1, overflow: "auto" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

// ── STAT CARD ─────────────────────────────────────────────────────────────────
export function StatCard({ icon, value, label, color = "#60a5fa", onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover && onClick ? "#111827" : "#0d1117",
        border: "1px solid #1e293b",
        borderRadius: 8, padding: "16px 20px",
        cursor: onClick ? "pointer" : "default",
        transition: "background 0.15s",
      }}>
      <div style={{ fontSize: 22, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'Space Mono', monospace" }}>{value ?? "–"}</div>
      <div style={{ fontSize: 11, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
    </div>
  );
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
export function ToastContainer() {
  const { toasts, remove } = useToastStore();
  return (
    <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          background: t.type === "error" ? "#450a0a" : t.type === "warning" ? "#422006" : "#052e16",
          border: `1px solid ${t.type === "error" ? "#ef4444" : t.type === "warning" ? "#f59e0b" : "#22c55e"}44`,
          color: t.type === "error" ? "#fca5a5" : t.type === "warning" ? "#fde68a" : "#86efac",
          padding: "12px 16px", borderRadius: 8, minWidth: 260, maxWidth: 360,
          display: "flex", alignItems: "center", gap: 10, fontSize: 13,
          boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          animation: "slideIn 0.2s ease",
        }}>
          <span>{t.type === "error" ? "✕" : t.type === "warning" ? "⚠" : "✓"}</span>
          <span style={{ flex: 1 }}>{t.message}</span>
          <button onClick={() => remove(t.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "inherit", opacity: 0.6, padding: 0, fontSize: 12 }}>✕</button>
        </div>
      ))}
    </div>
  );
}

// ── LOADING SPINNER ───────────────────────────────────────────────────────────
export function Spinner({ size = 24, color = "#60a5fa" }) {
  return (
    <div style={{ width: size, height: size, border: `2px solid #1e293b`, borderTop: `2px solid ${color}`, borderRadius: "50%", animation: "spin 0.8s linear infinite" }}/>
  );
}

// ── EMPTY STATE ───────────────────────────────────────────────────────────────
export function EmptyState({ title, subtitle, icon = "📭", action }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px", background: "#080d14", borderRadius: 8, border: "1px dashed #1e293b" }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>{icon}</div>
      <div style={{ fontSize: 15, fontWeight: 600, color: "#94a3b8", marginBottom: 6 }}>{title}</div>
      {subtitle && <div style={{ fontSize: 13, color: "#475569", marginBottom: action ? 20 : 0 }}>{subtitle}</div>}
      {action}
    </div>
  );
}
