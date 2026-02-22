// src/pages/StatsPage.jsx
import { useEffect, useState } from "react";
import { getCreatorStats, getUserStats } from "../lib/api";
import { getRoleLabel, getRoleColor, formatDate } from "../lib/constants";
import { Spinner } from "../components/ui";

function StageBar({ label, value, max, color }) {
  const pct = max ? (value / max) * 100 : 0;
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>{label}</span>
        <span style={{ fontSize: 12, color, fontWeight: 700 }}>{value}</span>
      </div>
      <div style={{ height: 5, background: "#0d1117", borderRadius: 3 }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 3, transition: "width 0.5s" }} />
      </div>
    </div>
  );
}

const STAGE_LABELS = { editor: "Redakcja", illustrator: "Ilustracja", designer: "Projekt graficzny", printer: "Druk" };

export default function StatsPage() {
  const [stats, setStats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [detailData, setDetailData] = useState({});

  useEffect(() => {
    getCreatorStats()
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleExpand = async (userId) => {
    if (expanded === userId) return setExpanded(null);
    setExpanded(userId);
    if (!detailData[userId]) {
      try {
        const { data } = await getUserStats(userId);
        setDetailData(d => ({ ...d, [userId]: data }));
      } catch {}
    }
  };

  const maxCompleted = Math.max(1, ...stats.map(s => s.completed_tasks));

  if (loading) return <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={32} /></div>;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>Statystyki twórców</h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Automatycznie zliczana praca wykonana przez każdego użytkownika</p>
      </div>

      {stats.length === 0 && (
        <div style={{ textAlign: "center", padding: 60, color: "#475569" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div>Brak danych statystycznych</div>
        </div>
      )}

      <div style={{ display: "grid", gap: 10 }}>
        {stats.map((s, idx) => {
          const roles = Array.isArray(s.roles) ? s.roles : JSON.parse(s.roles || "[]");
          const detail = detailData[s.id];
          const isExpanded = expanded === s.id;
          const byStage = detail?.byStage || {};

          return (
            <div key={s.id} style={{ background: "#0d1117", border: "1px solid #1e293b", borderRadius: 10, overflow: "hidden" }}>
              {/* Header row */}
              <div onClick={() => handleExpand(s.id)}
                style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
                {/* Rank */}
                <div style={{
                  width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                  background: idx === 0 ? "#fbbf24" : idx === 1 ? "#94a3b8" : idx === 2 ? "#b45309" : "#1e293b",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 800, color: idx < 3 ? "#000" : "#64748b",
                }}>#{idx + 1}</div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0" }}>{s.full_name}</div>
                  <div style={{ display: "flex", gap: 4, marginTop: 4, flexWrap: "wrap" }}>
                    {roles.map(r => (
                      <span key={r} style={{ fontSize: 10, padding: "1px 6px", borderRadius: 10, background: getRoleColor(r) + "22", color: getRoleColor(r) }}>
                        {getRoleLabel(r)}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Stats */}
                <div style={{ display: "flex", gap: 20, flexShrink: 0 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#22c55e" }}>{s.completed_tasks}</div>
                    <div style={{ fontSize: 10, color: "#475569" }}>ukończone</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 22, fontWeight: 800, color: "#60a5fa" }}>{s.claimed_tasks}</div>
                    <div style={{ fontSize: 10, color: "#475569" }}>podjęte</div>
                  </div>
                  {s.timeouts > 0 && (
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color: "#f59e0b" }}>{s.timeouts}</div>
                      <div style={{ fontSize: 10, color: "#475569" }}>timeouty</div>
                    </div>
                  )}
                </div>

                {/* Progress bar */}
                <div style={{ width: 120, flexShrink: 0 }}>
                  <div style={{ height: 6, background: "#1e293b", borderRadius: 3 }}>
                    <div style={{
                      height: "100%", borderRadius: 3, background: "linear-gradient(90deg,#22c55e,#16a34a)",
                      width: `${(s.completed_tasks / maxCompleted) * 100}%`, transition: "width 0.4s",
                    }} />
                  </div>
                </div>

                <div style={{ color: "#475569", fontSize: 12 }}>{isExpanded ? "▲" : "▼"}</div>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid #1e293b", padding: "16px 18px", background: "#080d14" }}>
                  {!detail && <div style={{ color: "#64748b", fontSize: 13 }}>Ładowanie...</div>}
                  {detail && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                      {/* By stage */}
                      <div>
                        <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Praca wg etapu</div>
                        {Object.entries(byStage).length === 0 && <div style={{ color: "#475569", fontSize: 13 }}>Brak danych</div>}
                        {Object.entries(STAGE_LABELS).map(([key, label]) => byStage[key] ? (
                          <StageBar key={key} label={label} value={byStage[key]}
                            max={Math.max(1, ...Object.values(byStage))}
                            color={getRoleColor(key === "designer" ? "graphic_designer" : key)} />
                        ) : null)}
                      </div>

                      {/* Recent completions */}
                      <div>
                        <div style={{ fontSize: 12, color: "#475569", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, marginBottom: 12 }}>Ostatnie zakończenia</div>
                        {detail.completions.slice(0, 5).map((c, i) => (
                          <div key={i} style={{ marginBottom: 8, padding: "6px 10px", background: "#0d1117", borderRadius: 6, fontSize: 12 }}>
                            <div style={{ color: "#e2e8f0", fontFamily: "monospace" }}>{c.order_number}</div>
                            <div style={{ color: "#64748b", marginTop: 2 }}>{c.product_type} · {formatDate(c.created_at)}</div>
                          </div>
                        ))}
                        {detail.completions.length === 0 && <div style={{ color: "#475569", fontSize: 13 }}>Brak ukończonych zadań</div>}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
