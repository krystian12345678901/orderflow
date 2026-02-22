// src/App.jsx
import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./store";
import Sidebar from "./components/Sidebar";
import { ToastContainer, Spinner } from "./components/ui";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import { CreateOrderPage, OrdersPage, UsersPage } from "./pages/OrdersPage";

function RequireAuth({ children, roles }) {
  const { user, loading } = useAuthStore();
  const location = useLocation();

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#030712" }}>
        <Spinner size={40} />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function AppLayout({ children }) {
  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", fontFamily: "'DM Sans', sans-serif", background: "#030712" }}>
      <Sidebar />
      <main style={{ flex: 1, overflow: "auto", padding: 32 }}>
        <div style={{ maxWidth: 1140, margin: "0 auto", animation: "fadeUp 0.25s ease" }}>
          {children}
        </div>
      </main>
    </div>
  );
}

export default function App() {
  const { init } = useAuthStore();

  useEffect(() => { init(); }, []);

  return (
    <>
      <Routes>
        <Route path="/login" element={<LoginPage />} />

        <Route path="/" element={
          <RequireAuth>
            <AppLayout><DashboardPage /></AppLayout>
          </RequireAuth>
        } />

        <Route path="/orders" element={
          <RequireAuth>
            <AppLayout><OrdersPage /></AppLayout>
          </RequireAuth>
        } />

        <Route path="/orders/new" element={
          <RequireAuth roles={["administrator","office_employee"]}>
            <AppLayout><CreateOrderPage /></AppLayout>
          </RequireAuth>
        } />

        <Route path="/pool" element={
          <RequireAuth roles={["editor","illustrator","graphic_designer","printer"]}>
            <AppLayout><DashboardPage /></AppLayout>
          </RequireAuth>
        } />

        <Route path="/qc" element={
          <RequireAuth roles={["quality_control","administrator"]}>
            <AppLayout><DashboardPage /></AppLayout>
          </RequireAuth>
        } />

        <Route path="/users" element={
          <RequireAuth roles={["administrator"]}>
            <AppLayout><UsersPage /></AppLayout>
          </RequireAuth>
        } />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <ToastContainer />
    </>
  );
}
