// src/pages/DashboardPage.jsx
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore, useOrdersStore, useToastStore } from "../store";
import { StatCard, EmptyState, Spinner } from "../components/ui";
import OrderCard from "../components/OrderCard";
import OrderDetailModal from "../components/OrderDetailModal";
import { PROCESSING_FOR_ROLE, POOL_FOR_ROLE, QC_STATES, ROLE_LABELS } from "../lib/constants";
import * as api from "../lib/api";

function SectionHeader({ title, count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
      <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: 1 }}>{title}</h3>
      {count !== undefined && (
        <span style={{ background: "#1e293b", color: "#60a5fa", padding: "2px 9px", borderRadius: 20, fontSize: 11, fontWeight: 600 }}>{count}</span>
      )}
    </div>
  );
}

function OrderGrid({ orders, currentUser, onSelect, emptyTitle, emptySubtitle }) {
  if (orders.length === 0) {
    return <EmptyState title={emptyTitle || "Brak zleceń"} subtitle={emptySubtitle} />;
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 10 }}>
      {orders.map(o => <OrderCard key={o.id} order={o} currentUser={currentUser} onClick={() => onSelect(o)} />)}
    </div>
  );
}

// ── ADMIN DASHBOARD ───────────────────────────────────────────────────────────
function AdminDashboard({ orders, user, onSelect }) {
  const [stats, setStats] = useState(null);
  useEffect(() => { api.getDashboardStats().then(r => setStats(r.data)).catch(() => {}); }, []);

  const active    = orders.filter(o => !["completed","cancelled"].includes(o.status));
  const completed = orders.filter(o => o.status === "completed");

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12 }}>
        <StatCard icon="📋" value={orders.length} label="Wszystkich zleceń" />
        <StatCard icon="⚡" value={active.length} label="Aktywnych" color="#f59e0b" />
        <StatCard icon="✅" value={completed.length} label="Zakończonych" color="#22c55e" />
        <StatCard icon="👥" value={stats?.userCount} label="Użytkowników" color="#6366f1" />
      </div>
      <div>
        <SectionHeader title="Wszystkie zlecenia" count={orders.length} />
        <OrderGrid orders={orders} currentUser={user} onSelect={onSelect} emptyTitle="Brak zleceń" />
      </div>
    </div>
  );
}

// ── OFFICE DASHBOARD ──────────────────────────────────────────────────────────
function OfficeDashboard({ orders, user, onSelect }) {
  const navigate = useNavigate();
  const mine   = orders.filter(o => o.created_by === user.id);
  const active = mine.filter(o => !["completed","cancelled"].includes(o.status));
  const done   = mine.filter(o => o.status === "completed");

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#e2e8f0" }}>Pracownik Biura</h2>
        <button onClick={() => navigate("/orders/new")}
          style={{ padding: "9px 18px", background: "#15803d", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
          ➕ Nowe zlecenie
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <StatCard icon="📋" value={mine.length} label="Moje zlecenia" color="#0ea5e9" />
        <StatCard icon="⚡" value={active.length} label="W toku" color="#f59e0b" />
        <StatCard icon="✅" value={done.length} label="Zakończonych" color="#22c55e" />
      </div>
      <div>
        <SectionHeader title="Aktywne zlecenia" count={active.length} />
        <OrderGrid orders={active} currentUser={user} onSelect={onSelect}
          emptyTitle="Brak aktywnych zleceń" emptySubtitle="Utwórz nowe zlecenie aby rozpocząć."
          action={<button onClick={() => navigate("/orders/new")} style={{ marginTop: 14, padding: "8px 18px", background: "#15803d", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13, fontWeight: 600 }}>➕ Nowe zlecenie</button>}
        />
      </div>
      {done.length > 0 && (
        <div>
          <SectionHeader title="Zakończone" count={done.length} />
          <OrderGrid orders={done} currentUser={user} onSelect={onSelect} />
        </div>
      )}
    </div>
  );
}

// ── WORKER DASHBOARD (Editor/Illustrator/Designer/Printer) ────────────────────
function WorkerDashboard({ orders, user, onSelect }) {
  const poolStatus       = POOL_FOR_ROLE[user.role];
  const processingStatus = PROCESSING_FOR_ROLE[user.role];
  const myActive = orders.find(o => o.current_holder_id === user.id && o.status === processingStatus);
  const pool     = orders.filter(o => o.status === poolStatus);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#e2e8f0" }}>
        {ROLE_LABELS[user.role]} — Dashboard
      </h2>

      {myActive ? (
        <div>
          <SectionHeader title="🔥 Aktywne zlecenie" />
          <div style={{ maxWidth: 360 }}>
            <OrderCard order={myActive} currentUser={user} onClick={() => onSelect(myActive)} />
          </div>
        </div>
      ) : (
        <div style={{ padding: "12px 16px", background: "#0d1117", border: "1px solid #1e293b", borderRadius: 8, fontSize: 13, color: "#64748b" }}>
          ℹ Nie masz aktywnego zlecenia. Przejmij jedno z puli poniżej.
        </div>
      )}

      <div>
        <SectionHeader title="Pula zleceń" count={pool.length} />
        <OrderGrid
          orders={pool} currentUser={user} onSelect={onSelect}
          emptyTitle="Pula jest pusta"
          emptySubtitle={myActive ? "Zakończ aktywne zlecenie, aby przejąć kolejne." : "Brak zleceń w puli. Sprawdź ponownie za chwilę."}
        />
      </div>
    </div>
  );
}

// ── QC DASHBOARD ──────────────────────────────────────────────────────────────
function QCDashboard({ orders, user, onSelect }) {
  const qcOrders = orders.filter(o => QC_STATES.includes(o.status));
  const approved = orders.filter(o => o.history?.some(h => h.action === "approve")).length;
  const rejected = orders.filter(o => o.history?.some(h => h.action === "reject" && h.actor_id === user.id)).length;

  return (
    <div style={{ display: "grid", gap: 24 }}>
      <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: "#e2e8f0" }}>Kontrola Jakości</h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12 }}>
        <StatCard icon="🔍" value={qcOrders.length} label="Do sprawdzenia" color="#10b981" />
        <StatCard icon="✅" value={approved} label="Zatwierdzeń" color="#22c55e" />
        <StatCard icon="↩" value={rejected} label="Odrzuceń" color="#ef4444" />
      </div>
      <div>
        <SectionHeader title="Oczekuje na QC" count={qcOrders.length} />
        <OrderGrid orders={qcOrders} currentUser={user} onSelect={onSelect}
          emptyTitle="Brak zleceń do sprawdzenia" emptySubtitle="Dobra robota! Wszystko sprawdzone 🎉" icon="✅" />
      </div>
      <div>
        <SectionHeader title="Pozostałe zlecenia" />
        <OrderGrid orders={orders.filter(o => !QC_STATES.includes(o.status))} currentUser={user} onSelect={onSelect}
          emptyTitle="Brak innych zleceń" />
      </div>
    </div>
  );
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuthStore();
  const { orders, fetchOrders, loading } = useOrdersStore();
  const [selectedOrder, setSelectedOrder] = useState(null);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 15000); // Poll every 15s
    return () => clearInterval(interval);
  }, []);

  if (loading && orders.length === 0) {
    return (
      <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
        <Spinner size={36} />
      </div>
    );
  }

  const handleSelect = async (order) => {
    // Re-fetch to get history + files
    try {
      const { data } = await (await import("../lib/api")).getOrder(order.id);
      setSelectedOrder(data);
    } catch {
      setSelectedOrder(order);
    }
  };

  const dashboards = {
    administrator:    <AdminDashboard orders={orders} user={user} onSelect={handleSelect} />,
    office_employee:  <OfficeDashboard orders={orders} user={user} onSelect={handleSelect} />,
    editor:           <WorkerDashboard orders={orders} user={user} onSelect={handleSelect} />,
    illustrator:      <WorkerDashboard orders={orders} user={user} onSelect={handleSelect} />,
    graphic_designer: <WorkerDashboard orders={orders} user={user} onSelect={handleSelect} />,
    printer:          <WorkerDashboard orders={orders} user={user} onSelect={handleSelect} />,
    quality_control:  <QCDashboard orders={orders} user={user} onSelect={handleSelect} />,
  };

  return (
    <div style={{ flex: 1 }}>
      {dashboards[user?.role] || null}

      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          currentUser={user}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
}
