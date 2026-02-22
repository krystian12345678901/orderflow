// src/components/OrderDetailModal.jsx
import { useState, useEffect, useRef } from "react";
import { StatusBadge, CountdownTimer, Button, Input, Spinner, EmptyState } from "./ui";
import { STATUS_LABELS, STATUS_COLORS, POOL_FOR_ROLE, PROCESSING_FOR_ROLE, QC_STATES, ROLES_WITH_PII } from "../lib/constants";
import { useOrdersStore } from "../store";
import { useToastStore } from "../store";
import * as api from "../lib/api";
import { downloadFile, uploadFile } from "../lib/api";

function formatDate(d) {
  return new Date(d).toLocaleString("pl-PL", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function timeAgo(d) {
  const mins = Math.floor((Date.now() - new Date(d)) / 60000);
  if (mins < 1) return "przed chwilą";
  if (mins < 60) return `${mins} min temu`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `${h} godz. temu`;
  return `${Math.floor(h / 24)} dni temu`;
}

function InfoRow({ label, value }) {
  if (!value) return null;
  return (
    <div>
      <div style={{ fontSize: 11, color: "#475569", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4, fontWeight: 600 }}>{label}</div>
      <div style={{ padding: "8px 12px", background: "#0a0f1a", borderRadius: 6, border: "1px solid #1e293b", fontSize: 13, color: "#e2e8f0" }}>{value}</div>
    </div>
  );
}

function HistoryTimeline({ history }) {
  if (!history?.length) return <EmptyState title="Brak historii" icon="📋" />;
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {history.map((h, i) => {
        const color = h.action === "approve" ? "#22c55e" : h.action === "reject" || h.action === "cancel" ? "#ef4444" : h.action === "timeout" ? "#f59e0b" : "#60a5fa";
        return (
          <div key={h.id} style={{ display: "flex", gap: 12 }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 24 }}>
              <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#0a0f1a", border: `2px solid ${color}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color, flexShrink: 0, zIndex: 1 }}>
                {h.action === "approve" ? "✓" : h.action === "reject" || h.action === "cancel" ? "✕" : h.action === "claim" ? "→" : h.action === "complete" ? "★" : h.action === "timeout" ? "⏱" : "•"}
              </div>
              {i < history.length - 1 && <div style={{ width: 2, flex: 1, background: "#1e293b", margin: "2px 0", minHeight: 14 }}/>}
            </div>
            <div style={{ paddingBottom: 14, flex: 1 }}>
              <div style={{ fontSize: 12, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                <span style={{ color: "#e2e8f0", fontWeight: 600 }}>{h.actor_name || "System"}</span>
                <StatusBadge status={h.to_status} />
                <span style={{ color: "#475569" }}>{timeAgo(h.created_at)}</span>
              </div>
              {h.notes && <div style={{ marginTop: 5, padding: "6px 10px", background: "#0a0f1a", borderRadius: 5, fontSize: 12, color: "#94a3b8", borderLeft: "2px solid #334155" }}>{h.notes}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FileSection({ order, currentUser, onRefresh }) {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadPct, setUploadPct] = useState(0);
  const fileInput = useRef();
  const { add: toast } = useToastStore();

  const isHolder = order.current_holder_id === currentUser.id;
  const isOffice = currentUser.role === "office_employee" && ["created", "office_processing"].includes(order.status);
  const canUpload = isHolder || isOffice || currentUser.role === "administrator";

  useEffect(() => {
    api.getFiles(order.id).then(r => setFiles(r.data)).catch(() => {});
  }, [order.id]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadPct(0);
    try {
      const { data } = await uploadFile(order.id, file, setUploadPct);
      setFiles(f => [...f, data]);
      toast(`Plik "${file.name}" wgrany ✓`);
    } catch (err) {
      toast(err.response?.data?.error || "Błąd wgrywania pliku", "error");
    } finally {
      setUploading(false);
      fileInput.current.value = "";
    }
  };

  const fileIcon = (mime) => {
    if (mime?.includes("pdf")) return "📄";
    if (mime?.includes("image")) return "🖼";
    if (mime?.includes("zip") || mime?.includes("rar")) return "📦";
    if (mime?.includes("illustrator") || mime?.endsWith("/ai")) return "🎨";
    return "📎";
  };

  return (
    <div>
      {files.length === 0 && !canUpload && <EmptyState title="Brak plików" icon="📁" />}
      {files.map(f => (
        <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", background: "#0a0f1a", borderRadius: 6, marginBottom: 6, border: "1px solid #1e293b" }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>{fileIcon(f.mime_type)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.original_name}</div>
            <div style={{ fontSize: 11, color: "#475569" }}>
              {(f.file_size / 1024 / 1024).toFixed(1)} MB · {f.uploader_name} · {STATUS_LABELS[f.stage] || f.stage}
            </div>
          </div>
          <button
            onClick={() => downloadFile(order.id, f.id, f.original_name)}
            style={{ padding: "5px 12px", background: "#1e3a5f", color: "#60a5fa", border: "1px solid #1d4ed844", borderRadius: 5, cursor: "pointer", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>
            ⬇ Pobierz
          </button>
        </div>
      ))}
      {canUpload && (
        <div style={{ marginTop: 10 }}>
          <input ref={fileInput} type="file" onChange={handleUpload} style={{ display: "none" }} accept=".pdf,.docx,.doc,.txt,.ai,.psd,.indd,.png,.jpg,.jpeg,.svg,.zip" />
          {uploading ? (
            <div style={{ padding: "10px 14px", background: "#0a0f1a", borderRadius: 6, border: "1px solid #1e293b" }}>
              <div style={{ fontSize: 13, color: "#94a3b8", marginBottom: 8 }}>Wgrywanie... {uploadPct}%</div>
              <div style={{ background: "#1e293b", borderRadius: 4, height: 4 }}>
                <div style={{ background: "#1d4ed8", height: 4, borderRadius: 4, width: `${uploadPct}%`, transition: "width 0.2s" }}/>
              </div>
            </div>
          ) : (
            <button
              onClick={() => fileInput.current.click()}
              style={{ width: "100%", padding: "10px", background: "transparent", border: "1px dashed #334155", borderRadius: 6, color: "#64748b", cursor: "pointer", fontSize: 13, transition: "all 0.15s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = "#60a5fa"; e.currentTarget.style.color = "#60a5fa"; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = "#334155"; e.currentTarget.style.color = "#64748b"; }}>
              ⬆ Kliknij aby wgrać plik
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function OrderDetailModal({ order: initialOrder, currentUser, onClose }) {
  const [order, setOrder] = useState(initialOrder);
  const [tab, setTab] = useState("details");
  const [notes, setNotes] = useState("");
  const [trackingNumber, setTrackingNumber] = useState(initialOrder.tracking_number || "");
  const [busy, setBusy] = useState(false);
  const { add: toast } = useToastStore();
  const store = useOrdersStore();

  const refreshOrder = async () => {
    try {
      const updated = await store.fetchOrder(order.id);
      if (updated) setOrder(updated);
    } catch {}
  };

  const canClaim     = POOL_FOR_ROLE[currentUser.role] === order.status && !order.current_holder_id;
  const isHolder     = order.current_holder_id === currentUser.id;
  const isProcessing = PROCESSING_FOR_ROLE[currentUser.role] === order.status && isHolder;
  const isQCStage    = QC_STATES.includes(order.status) && currentUser.role === "quality_control";
  const isAdmin      = currentUser.role === "administrator";
  const showPII      = ROLES_WITH_PII.includes(currentUser.role);

  const doAction = async (fn, successMsg) => {
    setBusy(true);
    try {
      const updated = await fn();
      setOrder(updated);
      toast(successMsg);
      setNotes("");
    } catch (err) {
      toast(err.response?.data?.error || "Wystąpił błąd", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#0d1117", border: "1px solid #1e293b", borderRadius: 12, width: "100%", maxWidth: 780, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>

        {/* Header */}
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
              <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 16, fontWeight: 700, color: "#94a3b8" }}>{order.order_number}</span>
              <StatusBadge status={order.status} />
            </div>
            <div style={{ fontSize: 14, color: "#64748b" }}>{order.product_type}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {isHolder && order.claimed_at && <CountdownTimer claimedAt={order.claimed_at} />}
            <button onClick={onClose} style={{ background: "#1e293b", border: "none", color: "#94a3b8", width: 30, height: 30, borderRadius: 6, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid #1e293b", padding: "0 24px", gap: 0 }}>
          {[["details","Szczegóły"],["files","Pliki"],["history","Historia"]].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={{ background: "none", border: "none", padding: "11px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600, color: tab === k ? "#60a5fa" : "#64748b", borderBottom: `2px solid ${tab === k ? "#60a5fa" : "transparent"}`, marginBottom: -1, transition: "color 0.15s" }}>
              {l}
            </button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {tab === "details" && (
            <div style={{ display: "grid", gap: 14 }}>
              {!showPII && (
                <div style={{ padding: "12px 14px", background: "#1a0a00", border: "1px solid #f59e0b33", borderRadius: 8, color: "#f59e0b", fontSize: 13, display: "flex", gap: 8, alignItems: "center" }}>
                  <span>⚠</span> Dane klienta są ukryte dla Twojej roli.
                </div>
              )}
              {showPII && <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <InfoRow label="Nazwa klienta" value={order.client_name} />
                <InfoRow label="Email klienta" value={order.client_email} />
                <InfoRow label="Telefon" value={order.client_phone} />
                <InfoRow label="Typ produktu" value={order.product_type} />
                {order.client_notes && <div style={{ gridColumn: "1/-1" }}><InfoRow label="Uwagi klienta" value={order.client_notes} /></div>}
              </div>}
              {!showPII && <InfoRow label="Typ produktu" value={order.product_type} />}
              <InfoRow label="Numer zlecenia" value={order.order_number} />
              <InfoRow label="Data utworzenia" value={order.created_at ? formatDate(order.created_at) : null} />
              {order.tracking_number && <InfoRow label="Numer przesyłki" value={order.tracking_number} />}
            </div>
          )}

          {tab === "files" && (
            <FileSection order={order} currentUser={currentUser} onRefresh={refreshOrder} />
          )}

          {tab === "history" && (
            <HistoryTimeline history={order.history} />
          )}
        </div>

        {/* Actions */}
        {(canClaim || isProcessing || isQCStage || isAdmin) && (
          <div style={{ padding: "16px 24px", borderTop: "1px solid #1e293b", background: "#080d14" }}>
            {(isProcessing || isQCStage) && (
              <div style={{ marginBottom: 12 }}>
                <textarea
                  placeholder={isQCStage ? "Notatki kontroli jakości (opcjonalne)..." : "Opcjonalne uwagi do zmiany statusu..."}
                  value={notes} onChange={e => setNotes(e.target.value)}
                  rows={2}
                  style={{ width: "100%", padding: "8px 12px", background: "#0a0f1a", border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0", fontSize: 13, resize: "none", boxSizing: "border-box", outline: "none" }}
                />
              </div>
            )}

            {isProcessing && currentUser.role === "printer" && (
              <div style={{ marginBottom: 12 }}>
                <input
                  placeholder="Numer przesyłki (np. DHL-PL-987654321)"
                  value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", background: "#0a0f1a", border: "1px solid #334155", borderRadius: 6, color: "#e2e8f0", fontSize: 13, outline: "none", boxSizing: "border-box" }}
                />
              </div>
            )}

            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
              {canClaim && (
                <Button variant="primary" icon="→" loading={busy}
                  onClick={() => doAction(() => store.claimOrder(order.id), "Zlecenie przejęte ✓")}>
                  Przejmij zlecenie
                </Button>
              )}
              {isProcessing && (
                <>
                  <Button variant="success" icon="✓" loading={busy}
                    onClick={() => doAction(() => store.completeOrder(order.id, { notes, trackingNumber: trackingNumber || undefined }), "Zlecenie wysłane dalej →")}>
                    {currentUser.role === "printer" ? "Wyślij i zakończ" : "Wyślij do QC"}
                  </Button>
                  <Button variant="warning" icon="↩" loading={busy}
                    onClick={() => doAction(() => store.rejectOrder(order.id, notes), "Odrzucono do puli")}>
                    Odrzuć do puli
                  </Button>
                </>
              )}
              {isQCStage && (
                <>
                  <Button variant="success" icon="✓" loading={busy}
                    onClick={() => doAction(() => store.approveOrder(order.id, notes), "Zatwierdzone ✓")}>
                    Zatwierdź
                  </Button>
                  <Button variant="danger" icon="✕" loading={busy}
                    onClick={() => doAction(() => store.qcRejectOrder(order.id, notes), "Odrzucono ↩")}>
                    Odrzuć
                  </Button>
                </>
              )}
              {isAdmin && !["completed", "cancelled"].includes(order.status) && (
                <Button variant="danger" icon="✕" loading={busy}
                  onClick={() => doAction(() => store.cancelOrder(order.id, "Anulowane przez administratora"), "Zlecenie anulowane")}>
                  Anuluj zlecenie
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
