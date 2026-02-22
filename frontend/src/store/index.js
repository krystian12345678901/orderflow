// src/store/index.js — Zustand global state
import { create } from "zustand";
import * as api from "../lib/api";

// ── AUTH STORE ────────────────────────────────────────────────────────────────
export const useAuthStore = create((set, get) => ({
  user: null,
  loading: true,

  init: async () => {
    const token = localStorage.getItem("access_token");
    if (!token) return set({ loading: false });
    try {
      const { data } = await api.getMe();
      set({ user: data, loading: false });
    } catch {
      localStorage.removeItem("access_token");
      set({ user: null, loading: false });
    }
  },

  login: async (email, password) => {
    const { data } = await api.login(email, password);
    localStorage.setItem("access_token", data.accessToken);
    set({ user: data.user });
    return data.user;
  },

  logout: async () => {
    try { await api.logout(); } catch {}
    localStorage.removeItem("access_token");
    set({ user: null });
  },
}));

// ── ORDERS STORE ──────────────────────────────────────────────────────────────
export const useOrdersStore = create((set, get) => ({
  orders: [],
  selectedOrder: null,
  loading: false,
  error: null,

  fetchOrders: async (params) => {
    set({ loading: true, error: null });
    try {
      const { data } = await api.getOrders(params);
      set({ orders: data.orders, loading: false });
    } catch (err) {
      set({ error: err.response?.data?.error || "Błąd pobierania zleceń", loading: false });
    }
  },

  fetchOrder: async (id) => {
    try {
      const { data } = await api.getOrder(id);
      set({ selectedOrder: data });
      // Update in list too
      set(s => ({
        orders: s.orders.map(o => o.id === id ? { ...o, ...data } : o),
      }));
      return data;
    } catch (err) {
      throw err;
    }
  },

  createOrder: async (orderData) => {
    const { data } = await api.createOrder(orderData);
    set(s => ({ orders: [data, ...s.orders] }));
    return data;
  },

  submitOrder: async (id, notes) => {
    const { data } = await api.submitOrder(id, notes);
    set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, ...data } : o), selectedOrder: data }));
    return data;
  },

  claimOrder: async (id) => {
    const { data } = await api.claimOrder(id);
    set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, ...data } : o), selectedOrder: data }));
    return data;
  },

  completeOrder: async (id, formData) => {
    const { data } = await api.completeOrder(id, formData);
    set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, ...data } : o), selectedOrder: data }));
    return data;
  },

  rejectOrder: async (id, notes) => {
    const { data } = await api.rejectOrder(id, notes);
    set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, ...data } : o), selectedOrder: data }));
    return data;
  },

  approveOrder: async (id, notes) => {
    const { data } = await api.approveOrder(id, notes);
    set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, ...data } : o), selectedOrder: data }));
    return data;
  },

  qcRejectOrder: async (id, notes) => {
    const { data } = await api.qcRejectOrder(id, notes);
    set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, ...data } : o), selectedOrder: data }));
    return data;
  },

  cancelOrder: async (id, reason) => {
    const { data } = await api.cancelOrder(id, reason);
    set(s => ({ orders: s.orders.map(o => o.id === id ? { ...o, ...data } : o), selectedOrder: data }));
    return data;
  },

  selectOrder: (order) => set({ selectedOrder: order }),
  clearSelected: () => set({ selectedOrder: null }),
}));

// ── TOAST STORE ───────────────────────────────────────────────────────────────
export const useToastStore = create((set) => ({
  toasts: [],
  add: (message, type = "success") => {
    const id = Math.random().toString(36).slice(2);
    set(s => ({ toasts: [...s.toasts, { id, message, type }] }));
    setTimeout(() => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })), 4000);
  },
  remove: (id) => set(s => ({ toasts: s.toasts.filter(t => t.id !== id) })),
}));
