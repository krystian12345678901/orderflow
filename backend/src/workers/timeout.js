// src/workers/timeout.js — In-process timeout scheduler
// In production, replace with BullMQ + Redis for reliability across restarts
const db = require("../db");
const { v4: uuidv4 } = require("uuid");
const sm = require("../state-machine");

const activeTimers = new Map(); // orderId -> timeoutHandle

function scheduleTimeout(orderId, expectedStatus) {
  // Cancel any existing timer
  cancelTimeout(orderId);

  // 2-hour timeout (shortened to 5 minutes for demo - change TIMEOUT_SECONDS in state-machine.js)
  const delayMs = sm.TIMEOUT_SECONDS * 1000;

  const handle = setTimeout(() => {
    try {
      const order = db.prepare("SELECT * FROM orders WHERE id = ?").get(orderId);
      if (!order || order.status !== expectedStatus) return; // Already transitioned

      const nextStatus = sm.getNextStatus(order.status, "timeout");
      if (!nextStatus) return;

      db.prepare(`
        UPDATE orders
        SET status = ?, current_holder_id = NULL, claimed_at = NULL, timeout_at = NULL, updated_at = datetime('now')
        WHERE id = ?
      `).run(nextStatus, orderId);

      db.prepare(`
        INSERT INTO order_history (id, order_id, from_status, to_status, action, notes)
        VALUES (?, ?, ?, ?, 'timeout', ?)
      `).run(uuidv4(), orderId, order.status, nextStatus, "Czas na wykonanie upłynął – zlecenie zwrócone do puli");

      console.log(`[TIMEOUT] Order ${orderId}: ${order.status} → ${nextStatus}`);
      activeTimers.delete(orderId);
    } catch (err) {
      console.error("[TIMEOUT] Error processing timeout:", err.message);
    }
  }, delayMs);

  activeTimers.set(orderId, handle);
  console.log(`[TIMEOUT] Scheduled for order ${orderId} in ${sm.TIMEOUT_SECONDS}s`);
}

function cancelTimeout(orderId) {
  const handle = activeTimers.get(orderId);
  if (handle) {
    clearTimeout(handle);
    activeTimers.delete(orderId);
  }
}

// On startup, reschedule timeouts for in-progress orders
function restoreTimeouts() {
  const inProgress = db.prepare(`
    SELECT id, status, claimed_at, timeout_at
    FROM orders
    WHERE status IN ('editor_processing','illustrator_processing','designer_processing','printer_processing')
    AND timeout_at IS NOT NULL
  `).all();

  let restored = 0;
  for (const order of inProgress) {
    const timeoutAt = new Date(order.timeout_at).getTime();
    const remainingMs = timeoutAt - Date.now();

    if (remainingMs <= 0) {
      // Already timed out — process immediately
      scheduleTimeout(order.id, order.status);
    } else {
      const handle = setTimeout(() => {
        scheduleTimeout(order.id, order.status);
      }, remainingMs);
      activeTimers.set(order.id, handle);
      restored++;
    }
  }

  if (restored > 0) {
    console.log(`[TIMEOUT] Restored ${restored} timeout(s) from previous session`);
  }
}

module.exports = { scheduleTimeout, cancelTimeout, restoreTimeouts };
