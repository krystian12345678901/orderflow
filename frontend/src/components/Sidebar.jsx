// src/components/Sidebar.jsx
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { RoleBadge } from "./ui";
import { ROLE_COLORS } from "../lib/constants";
import { useAuthStore } from "../store";

const NAV_ITEMS = {
  administrator:    [{ path: "/", icon: "📊", label: "Dashboard" }, { path: "/orders", icon: "📋", label: "Zlecenia" }, { path: "/users", icon: "👥", label: "Użytkownicy" }, { path: "/admin/config", icon: "⚙", label: "Konfiguracja" }],
  office_employee:  [{ path: "/", icon: "📊", label: "Dashboard" }, { path: "/orders/new", icon: "➕", label: "Nowe zlecenie" }, { path: "/orders", icon: "📋", label: "Moje zlecenia" }],
  editor:           [{ path: "/", icon: "📊", label: "Dashboard" }, { path: "/pool", icon: "🗂", label: "Pula zleceń" }],
  quality_control:  [{ path: "/", icon: "📊", label: "Dashboard" }, { path: "/qc", icon: "🔍", label: "Do sprawdzenia" }, { path: "/orders", icon: "📋", label: "Wszystkie zlecenia" }],
  illustrator:      [{ path: "/", icon: "📊", label: "Dashboard" }, { path: "/pool", icon: "🗂", label: "Pula zleceń" }],
  graphic_designer: [{ path: "/", icon: "📊", label: "Dashboard" }, { path: "/pool", icon: "🗂", label: "Pula zleceń" }],
  printer:          [{ path: "/", icon: "📊", label: "Dashboard" }, { path: "/pool", icon: "🗂", label: "Pula zleceń" }],
};

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [hoverLogout, setHoverLogout] = useState(false);

  if (!user) return null;
  const color = ROLE_COLORS[user.role] || "#60a5fa";
  const initials = user.fullName?.split(" ").map(p => p[0]).join("") || "?";
  const navItems = NAV_ITEMS[user.role] || NAV_ITEMS.administrator;

  return (
    <div style={{ width: 230, flexShrink: 0, background: "#080d14", borderRight: "1px solid #1e293b", display: "flex", flexDirection: "column", padding: "20px 0", overflowY: "auto" }}>

      {/* Logo */}
      <div style={{ padding: "0 16px 20px", borderBottom: "1px solid #1e293b", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: "linear-gradient(135deg,#1d4ed8,#7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>⚙</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#e2e8f0", letterSpacing: 0.3 }}>OrderFlow</div>
            <div style={{ fontSize: 10, color: "#475569", letterSpacing: 1.5, textTransform: "uppercase" }}>System Zleceń</div>
          </div>
        </div>
      </div>

      {/* User card */}
      <div style={{ margin: "0 10px 20px", padding: "11px 12px", background: "#0d1117", borderRadius: 8, border: `1px solid ${color}33` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: color + "33", border: `2px solid ${color}66`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color, flexShrink: 0 }}>
            {initials}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.fullName}</div>
            <div style={{ fontSize: 11, color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.email}</div>
          </div>
        </div>
        <RoleBadge role={user.role} />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "0 10px" }}>
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 6, border: "none",
                background: active ? "#1e293b" : "transparent",
                color: active ? "#e2e8f0" : "#64748b",
                cursor: "pointer", fontSize: 13, fontWeight: active ? 600 : 400,
                marginBottom: 2, textAlign: "left", transition: "all 0.12s",
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = "#111827"; e.currentTarget.style.color = "#94a3b8"; }}}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#64748b"; }}}
            >
              <span style={{ fontSize: 15 }}>{item.icon}</span>
              <span>{item.label}</span>
              {active && <div style={{ marginLeft: "auto", width: 4, height: 4, borderRadius: "50%", background: "#60a5fa" }}/>}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div style={{ padding: "16px 10px 0", borderTop: "1px solid #1e293b" }}>
        <button
          onClick={() => { logout(); navigate("/login"); }}
          onMouseEnter={() => setHoverLogout(true)}
          onMouseLeave={() => setHoverLogout(false)}
          style={{
            width: "100%", padding: "9px 12px", background: hoverLogout ? "#1a0a0a" : "transparent",
            border: `1px solid ${hoverLogout ? "#ef444433" : "#1e293b"}`,
            color: hoverLogout ? "#ef4444" : "#64748b",
            borderRadius: 6, cursor: "pointer", fontSize: 13, textAlign: "left",
            display: "flex", alignItems: "center", gap: 8, transition: "all 0.15s",
          }}>
          <span>⏻</span> Wyloguj się
        </button>
      </div>
    </div>
  );
}
