// src/components/OrderCard.jsx
import { useState } from "react";
import { StatusBadge, CountdownTimer } from "./ui";
import { STATUS_COLORS } from "../lib/constants";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "przed chwilą";
  if (mins < 60) return `${mins} min temu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} godz. temu`;
  return `${Math.floor(hours / 24)} dni temu`;
}

export default function OrderCard({ order, currentUser, onClick }) {
  const [hover, setHover] = useState(false);
  const isHolder = order.current_holder_id === currentUser.id;
  const color = STATUS_COLORS[order.status] || "#64748b";
  const showPII = ["administrator", "office_employee", "quality_control"].includes(currentUser.role);

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "#111827" : "#0d1117",
        border: `1px solid ${hover ? color + "88" : isHolder ? color + "55" : "#1e293b"}`,
        borderLeft: `3px solid ${color}`,
        borderRadius: 8, padding: "14px 16px",
        cursor: "pointer", transition: "all 0.15s ease",
      }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
        <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: "#64748b" }}>
          {order.order_number}
        </span>
        <StatusBadge status={order.status} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#e2e8f0", marginBottom: showPII && order.client_name ? 4 : 8 }}>
        {order.product_type}
      </div>
      {showPII && order.client_name && (
        <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{order.client_name}</div>
      )}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: "#475569" }}>{timeAgo(order.created_at)}</span>
      </div>
      {isHolder && order.claimed_at && (
        <div style={{ marginTop: 10, padding: "8px 10px", background: "#0a0f1a", borderRadius: 6, border: `1px solid ${color}33` }}>
          <CountdownTimer claimedAt={order.claimed_at} />
        </div>
      )}
    </div>
  );
}
