// src/pages/CreateOrderPage.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input, Button, Select } from "../components/ui";
import { useOrdersStore, useToastStore } from "../store";
import * as api from "../lib/api";

export function CreateOrderPage() {
  const navigate = useNavigate();
  const { createOrder } = useOrdersStore();
  const { add: toast } = useToastStore();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    clientName: "", clientEmail: "", clientPhone: "",
    productType: "", clientNotes: "",
  });
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form.clientName || !form.productType) return;
    setBusy(true);
    try {
      const order = await createOrder(form);
      // Auto-submit into workflow
      await api.submitOrder(order.id, "Zlecenie przesłane do redakcji");
      toast(`Zlecenie ${order.order_number} utworzone i przekazane do puli redaktorów ✓`);
      navigate("/");
    } catch (err) {
      toast(err.response?.data?.error || "Błąd tworzenia zlecenia", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 580, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ margin: "0 0 4px", fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>Nowe zlecenie</h2>
        <p style={{ margin: 0, color: "#64748b", fontSize: 14 }}>Wprowadź dane klienta i szczegóły produktu</p>
      </div>

      <form onSubmit={handleSubmit} style={{ background: "#0d1117", border: "1px solid #1e293b", borderRadius: 10, padding: 28, display: "grid", gap: 18 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Nazwa klienta" value={form.clientName} onChange={set("clientName")} placeholder="Firma ABC Sp. z o.o." required />
          </div>
          <Input label="Email klienta" type="email" value={form.clientEmail} onChange={set("clientEmail")} placeholder="kontakt@firma.pl" />
          <Input label="Telefon" value={form.clientPhone} onChange={set("clientPhone")} placeholder="+48 123 456 789" />
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Typ produktu" value={form.productType} onChange={set("productType")} placeholder="Katalog produktowy, Broszura, Roll-up..." required />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <Input label="Uwagi klienta" value={form.clientNotes} onChange={set("clientNotes")} placeholder="Styl, kolory firmowe, specjalne wymagania..." multiline rows={4} />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <Button variant="ghost" onClick={() => navigate(-1)}>Anuluj</Button>
          <Button type="submit" variant="success" icon="→" loading={busy} disabled={!form.clientName || !form.productType}>
            Utwórz i wyślij do redaktorów
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── ORDERS LIST PAGE ──────────────────────────────────────────────────────────
// src/pages/OrdersPage.jsx
import { useEffect, useState as useStateOrders } from "react";
import { useAuthStore } from "../store";
import OrderCard from "../components/OrderCard";
import OrderDetailModal from "../components/OrderDetailModal";
import { Spinner, EmptyState } from "../components/ui";
import { StatusBadge } from "../components/ui";
import { STATUS_LABELS } from "../lib/constants";
import { getOrders, getOrder } from "../lib/api";

export function OrdersPage() {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState("");

  useEffect(() => {
    setLoading(true);
    getOrders({ status: filterStatus || undefined })
      .then(r => setOrders(r.data.orders))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [filterStatus]);

  const handleSelect = async (o) => {
    try { const { data } = await getOrder(o.id); setSelected(data); }
    catch { setSelected(o); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#e2e8f0" }}>Zlecenia</h2>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: "8px 12px", background: "#0d1117", border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0", fontSize: 13 }}>
          <option value="">Wszystkie statusy</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={36} /></div>
      ) : orders.length === 0 ? (
        <EmptyState title="Brak zleceń" subtitle="Nie znaleziono zleceń spełniających kryteria." />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 10 }}>
          {orders.map(o => <OrderCard key={o.id} order={o} currentUser={user} onClick={() => handleSelect(o)} />)}
        </div>
      )}

      {selected && <OrderDetailModal order={selected} currentUser={user} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ── USERS PAGE ────────────────────────────────────────────────────────────────
import { getUsers, createUser, updateUser } from "../lib/api";
import { RoleBadge, Modal, Button as Btn, Input as Inp } from "../components/ui";
import { ROLE_COLORS, ROLE_LABELS } from "../lib/constants";

const ROLES = Object.entries(ROLE_LABELS).map(([value, label]) => ({ value, label }));

export function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState(null);
  const { add: toast } = useToastStore();

  const load = () => { setLoading(true); getUsers().then(r => setUsers(r.data)).finally(() => setLoading(false)); };
  useEffect(load, []);

  const handleCreate = async (form) => {
    try {
      await createUser(form);
      toast("Użytkownik utworzony ✓");
      load(); setShowCreate(false);
    } catch (err) { toast(err.response?.data?.error || "Błąd", "error"); }
  };

  const handleToggle = async (u) => {
    try {
      await updateUser(u.id, { isActive: !u.is_active });
      toast(`Konto ${u.is_active ? "dezaktywowane" : "aktywowane"}`, u.is_active ? "warning" : "success");
      load();
    } catch { toast("Błąd", "error"); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#e2e8f0" }}>Użytkownicy</h2>
        <button onClick={() => setShowCreate(true)} style={{ padding: "9px 18px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          ➕ Nowy użytkownik
        </button>
      </div>

      {loading ? <div style={{ display: "flex", justifyContent: "center", padding: 60 }}><Spinner size={36} /></div> : (
        <div style={{ display: "grid", gap: 8 }}>
          {users.map(u => (
            <div key={u.id} style={{ background: "#0d1117", border: "1px solid #1e293b", borderRadius: 8, padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: "50%", background: ROLE_COLORS[u.role] + "33", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: ROLE_COLORS[u.role], flexShrink: 0 }}>
                {u.full_name?.split(" ").map(p => p[0]).join("") || "?"}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: u.is_active ? "#e2e8f0" : "#64748b" }}>{u.full_name}</div>
                <div style={{ fontSize: 12, color: "#475569" }}>{u.email}</div>
              </div>
              <RoleBadge role={u.role} />
              <button onClick={() => handleToggle(u)}
                style={{ padding: "5px 12px", background: u.is_active ? "#1a0a0a" : "#052e16", color: u.is_active ? "#ef4444" : "#22c55e", border: `1px solid ${u.is_active ? "#ef444433" : "#22c55e33"}`, borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 600 }}>
                {u.is_active ? "Dezaktywuj" : "Aktywuj"}
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <UserFormModal onClose={() => setShowCreate(false)} onSubmit={handleCreate} title="Nowy użytkownik" />
      )}
    </div>
  );
}

function UserFormModal({ onClose, onSubmit, title }) {
  const [form, setForm] = useState({ email: "", password: "", fullName: "", role: "" });
  const set = (k) => (v) => setForm(f => ({ ...f, [k]: v }));
  const [busy, setBusy] = useState(false);

  const handle = async (e) => {
    e.preventDefault();
    setBusy(true);
    try { await onSubmit(form); }
    finally { setBusy(false); }
  };

  return (
    <Modal title={title} onClose={onClose} maxWidth={480}>
      <form onSubmit={handle} style={{ padding: 24, display: "grid", gap: 16 }}>
        <Inp label="Imię i nazwisko" value={form.fullName} onChange={set("fullName")} placeholder="Jan Kowalski" required />
        <Inp label="Email" type="email" value={form.email} onChange={set("email")} placeholder="jan@firma.pl" required />
        <Inp label="Hasło" type="password" value={form.password} onChange={set("password")} placeholder="Minimum 8 znaków" required />
        <Select label="Rola" value={form.role} onChange={set("role")} options={ROLES} placeholder="Wybierz rolę..." />
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ padding: "9px 18px", background: "#1e293b", color: "#94a3b8", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 }}>Anuluj</button>
          <button type="submit" disabled={busy || !form.role} style={{ padding: "9px 18px", background: "#1d4ed8", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            {busy ? "Tworzenie..." : "Utwórz"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
