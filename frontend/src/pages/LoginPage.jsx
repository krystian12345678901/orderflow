// src/pages/LoginPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, useToastStore } from "../store";
import { ROLE_LABELS, ROLE_COLORS } from "../lib/constants";

const TEST_ACCOUNTS = [
  { email: "admin@firma.pl",      password: "Admin123!", role: "administrator" },
  { email: "biuro@firma.pl",      password: "Biuro123!", role: "office_employee" },
  { email: "redaktor@firma.pl",   password: "Red123!",   role: "editor" },
  { email: "qc@firma.pl",         password: "QC1234!",   role: "quality_control" },
  { email: "ilustrator@firma.pl", password: "Ilu123!",   role: "illustrator" },
  { email: "grafik@firma.pl",     password: "Graf123!",  role: "graphic_designer" },
  { email: "druk@firma.pl",       password: "Druk123!",  role: "printer" },
];

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const { add: toast } = useToastStore();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    setError("");
    setLoading(true);
    try {
      const user = await login(email, password);
      toast(`Witaj, ${user.fullName}! 👋`);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.error || "Błąd logowania. Sprawdź dane.");
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (acc) => { setEmail(acc.email); setPassword(acc.password); };

  return (
    <div style={{ minHeight: "100vh", background: "#030712", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 1080, display: "grid", gridTemplateColumns: "1fr 400px", gap: 60, alignItems: "center" }}>

        {/* Left — branding */}
        <div style={{ animation: "fadeUp 0.5s ease" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "linear-gradient(135deg, #1d4ed8, #7c3aed)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24 }}>⚙</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>OrderFlow</div>
              <div style={{ fontSize: 11, color: "#475569", letterSpacing: 2, textTransform: "uppercase" }}>System Zarządzania Zleceniami</div>
            </div>
          </div>

          <h1 style={{ fontSize: 42, fontWeight: 800, color: "#e2e8f0", lineHeight: 1.15, margin: "0 0 18px", letterSpacing: -1 }}>
            Zarządzaj zleceniami<br />
            <span style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>na każdym etapie</span>
          </h1>
          <p style={{ fontSize: 15, color: "#64748b", lineHeight: 1.7, margin: "0 0 36px" }}>
            Pełny workflow dla zespołów kreatywnych — od biura, przez redakcję, ilustrację i projekt graficzny, aż po druk. Pełna kontrola i przejrzystość na każdym kroku.
          </p>

          <div>
            <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 12 }}>Szybkie logowanie — kliknij rolę:</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {TEST_ACCOUNTS.map(acc => (
                <button key={acc.email} onClick={() => quickLogin(acc)}
                  style={{ padding: "6px 14px", background: ROLE_COLORS[acc.role] + "20", color: ROLE_COLORS[acc.role], border: `1px solid ${ROLE_COLORS[acc.role]}44`, borderRadius: 20, cursor: "pointer", fontSize: 12, fontWeight: 600, transition: "all 0.12s" }}
                  onMouseEnter={e => { e.currentTarget.style.background = ROLE_COLORS[acc.role] + "44"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = ROLE_COLORS[acc.role] + "20"; }}>
                  {ROLE_LABELS[acc.role]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right — form */}
        <div style={{ background: "#0d1117", border: "1px solid #1e293b", borderRadius: 16, padding: 34, animation: "fadeUp 0.5s ease 0.1s both" }}>
          <h2 style={{ margin: "0 0 26px", fontSize: 20, fontWeight: 700, color: "#e2e8f0" }}>Zaloguj się</h2>
          <form onSubmit={handleLogin} style={{ display: "grid", gap: 16 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, fontWeight: 600 }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="twoj@email.pl" required
                style={{ width: "100%", padding: "11px 14px", background: "#080d14", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = "#60a5fa"}
                onBlur={e => e.target.style.borderColor = "#334155"}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5, fontWeight: 600 }}>Hasło</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                style={{ width: "100%", padding: "11px 14px", background: "#080d14", border: "1px solid #334155", borderRadius: 8, color: "#e2e8f0", fontSize: 14, outline: "none", boxSizing: "border-box" }}
                onFocus={e => e.target.style.borderColor = "#60a5fa"}
                onBlur={e => e.target.style.borderColor = "#334155"}
              />
            </div>
            {error && <div style={{ padding: "10px 14px", background: "#450a0a", border: "1px solid #ef444433", borderRadius: 8, color: "#fca5a5", fontSize: 13 }}>✕ {error}</div>}
            <button type="submit" disabled={loading}
              style={{ padding: "12px", background: loading ? "#1e293b" : "linear-gradient(135deg,#1d4ed8,#7c3aed)", color: loading ? "#64748b" : "#fff", border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, marginTop: 4, transition: "opacity 0.15s" }}>
              {loading ? "Logowanie..." : "Zaloguj się →"}
            </button>
          </form>

          <div style={{ marginTop: 22, padding: "13px", background: "#080d14", borderRadius: 8, border: "1px solid #1e293b" }}>
            <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Dane testowe</div>
            {TEST_ACCOUNTS.map(acc => (
              <div key={acc.email} onClick={() => quickLogin(acc)} style={{ display: "flex", justifyContent: "space-between", padding: "3px 0", cursor: "pointer", fontSize: 11 }}>
                <span style={{ color: ROLE_COLORS[acc.role], fontWeight: 600 }}>{ROLE_LABELS[acc.role]}</span>
                <span style={{ color: "#475569" }}>{acc.email} / {acc.password}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
