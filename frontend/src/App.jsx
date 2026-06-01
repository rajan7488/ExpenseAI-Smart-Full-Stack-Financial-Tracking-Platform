import { useEffect, lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster, toast } from "react-hot-toast";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import Layout from "./components/layout/Layout";
import socket from "./Socket";
import { useAuth } from "./context/AuthContext";
import BankRedirectSandbox from "./components/pages/Auth/BankRedirectSandbox";

// ✅ LAZY LOAD all pages — they now load only when the user visits them
// This reduces the initial bundle from 934KB to ~150-200KB
const Dashboard = lazy(() => import("./components/pages/Dashboard/Dashboard"));
const Login = lazy(() => import("./components/pages/Auth/Login"));
const Register = lazy(() => import("./components/pages/Auth/Register"));
const Expenses = lazy(() => import("./components/Expenses/Expenses"));
const AddExpense = lazy(() => import("./components/Expenses/AddExpense"));
const Reports = lazy(() => import("./components/pages/Dashboard/Report"));
const AIInsights = lazy(() => import("./components/AI/AIInsights"));
const Profile = lazy(() => import("./components/pages/Auth/Profile"));

// ✅ Full-screen loading fallback shown while a lazy page chunk is downloading
function PageLoader() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
      background: "#0f0f1a",
      color: "#a78bfa",
      gap: "16px",
      fontFamily: "sans-serif",
    }}>
      <div style={{
        width: "40px",
        height: "40px",
        border: "3px solid #1e1e2e",
        borderTop: "3px solid #a78bfa",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span style={{ fontSize: "14px", opacity: 0.7 }}>Loading...</span>
    </div>
  );
}

function App() {
  const { user } = useAuth();

  // ── 🔔 GLOBAL REAL-TIME TOAST POPUP LISTENER ──
  useEffect(() => {
    socket.on("notification", (data) => {
      const rawMessage = data.notification?.message || data.message || "";
      console.log("📥 Global Socket Interceptor Raw Message Captured:", rawMessage);

      if (!rawMessage) return;

      const cleanMessage = rawMessage
        .replace(/[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g, "")
        .trim()
        .toLowerCase();

      // 1. STANDARD EXPENSE CONFIRMATION TOAST
      if (cleanMessage.includes("added") && (cleanMessage.includes("for") || cleanMessage.includes("dining"))) {
        toast.success(rawMessage, {
          id: "standard-expense-toast",
          position: "top-right",
          duration: 4000,
        });
      }

      // 2. BUDGET LIMIT ALERT POPUP
      else if (
        cleanMessage.includes("heads up") ||
        cleanMessage.includes("budget") ||
        cleanMessage.includes("used") ||
        cleanMessage.includes("crossed") ||
        cleanMessage.includes("limit") ||
        cleanMessage.includes("threshold") ||
        cleanMessage.includes("alert") ||
        cleanMessage.includes("critical") ||
        cleanMessage.includes("warning")
      ) {
        const alertsEnabled = user?.notifications?.spending !== false;

        if (!alertsEnabled) {
          console.log("🚫 Alert suppressed: spendingAlerts toggle is turned OFF.");
          return;
        }

        toast.dismiss("standard-expense-toast");

        toast(
          (t) => {
            const isCritical = cleanMessage.includes("critical");
            return (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, fontFamily: "'DM Sans', sans-serif" }}>
                <span style={{ fontSize: "20px", marginTop: "-2px" }}>
                  {isCritical ? "🚨" : "⚠️"}
                </span>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 700, color: isCritical ? "#b91c1c" : "#b45309", fontSize: "13px" }}>
                    {isCritical ? "Critical Budget Breach" : "Budget Limit Alert"}
                  </p>
                  <p style={{ margin: "4px 0 0", color: "#4b5563", fontSize: "12px", lineHeight: "1.5", fontWeight: 500 }}>
                    {rawMessage}
                  </p>
                </div>
              </div>
            );
          },
          {
            duration: 10000,
            position: "top-right",
            style: {
              background: cleanMessage.includes("critical") ? "#fef2f2" : "#fffbeb",
              padding: "14px 16px",
              borderRadius: "16px",
              border: `1px solid ${cleanMessage.includes("critical") ? "#f87171" : "#fcd34d"}`,
              boxShadow: "0 10px 30px rgba(0,0,0,0.05)",
              maxWidth: "360px",
            },
          }
        );
      }
    });

    return () => {
      socket.off("notification");
    };
  }, [user]);

  return (
    <BrowserRouter>
      <Toaster position="top-right" />

      {/* ✅ Suspense catches lazy page loads and shows PageLoader while the chunk downloads */}
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* PUBLIC */}
          <Route
            path="/login"
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            }
          />

          {/* PROTECTED + LAYOUT */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <Layout>
                  <Expenses />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/add-expense"
            element={
              <ProtectedRoute>
                <Layout>
                  <AddExpense />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/ai-insights"
            element={
              <ProtectedRoute>
                <Layout>
                  <AIInsights />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Layout>
                  <Profile />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/bank-redirect-sandbox" element={<ProtectedRoute><BankRedirectSandbox /></ProtectedRoute>} />

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;