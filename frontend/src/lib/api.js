// src/lib/api.js — Axios client with JWT refresh interceptor
import axios from "axios";

const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 30000,
});

// ── REQUEST: Attach access token ──────────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// ── RESPONSE: Auto-refresh on 401 ────────────────────────────────────────────
let isRefreshing = false;
let pendingRequests = [];

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    original._retry = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        pendingRequests.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      });
    }

    isRefreshing = true;
    try {
      const { data } = await axios.post("/api/auth/refresh", {}, { withCredentials: true });
      localStorage.setItem("access_token", data.accessToken);
      original.headers.Authorization = `Bearer ${data.accessToken}`;
      pendingRequests.forEach(({ resolve }) => resolve(data.accessToken));
      pendingRequests = [];
      return api(original);
    } catch (refreshErr) {
      localStorage.removeItem("access_token");
      pendingRequests.forEach(({ reject }) => reject(refreshErr));
      pendingRequests = [];
      window.location.href = "/login";
      return Promise.reject(refreshErr);
    } finally {
      isRefreshing = false;
    }
  }
);

// ── API FUNCTIONS ─────────────────────────────────────────────────────────────

// Auth
export const login = (email, password) => api.post("/auth/login", { email, password });
export const logout = () => api.post("/auth/logout");
export const getMe = () => api.get("/auth/me");

// Users
export const getUsers = () => api.get("/users");
export const createUser = (data) => api.post("/users", data);
export const updateUser = (id, data) => api.patch(`/users/${id}`, data);

// Orders
export const getOrders = (params) => api.get("/orders", { params });
export const getOrder = (id) => api.get(`/orders/${id}`);
export const createOrder = (data) => api.post("/orders", data);
export const submitOrder = (id, notes) => api.post(`/orders/${id}/submit`, { notes });
export const claimOrder = (id) => api.post(`/orders/${id}/claim`);
export const completeOrder = (id, data) => api.post(`/orders/${id}/complete`, data);
export const rejectOrder = (id, notes) => api.post(`/orders/${id}/reject`, { notes });
export const approveOrder = (id, notes) => api.post(`/orders/${id}/approve`, { notes });
export const qcRejectOrder = (id, notes) => api.post(`/orders/${id}/qc-reject`, { notes });
export const cancelOrder = (id, reason) => api.post(`/orders/${id}/cancel`, { reason });
export const getOrderHistory = (id) => api.get(`/orders/${id}/history`);
export const getPool = (poolName) => api.get(`/orders/pool/${poolName}`);

// Files
export const getFiles = (orderId) => api.get(`/files/orders/${orderId}`);
export const uploadFile = (orderId, file, onProgress) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`/files/orders/${orderId}`, formData, {
    headers: { "Content-Type": "multipart/form-data" },
    onUploadProgress: (e) => onProgress?.(Math.round((e.loaded / e.total) * 100)),
  });
};
export const downloadFile = (orderId, fileId, fileName) => {
  api.get(`/files/orders/${orderId}/files/${fileId}/download`, { responseType: "blob" })
    .then(({ data }) => {
      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });
};
export const deleteFile = (orderId, fileId) => api.delete(`/files/orders/${orderId}/files/${fileId}`);

// Admin
export const getDashboardStats = () => api.get("/admin/dashboard");
export const getFormConfigs = (role) => api.get("/admin/form-configs", { params: { role } });
export const createFormConfig = (data) => api.post("/admin/form-configs", data);
export const updateFormConfig = (id, data) => api.patch(`/admin/form-configs/${id}`, data);
export const getAuditLogs = (params) => api.get("/admin/audit-logs", { params });

export default api;
