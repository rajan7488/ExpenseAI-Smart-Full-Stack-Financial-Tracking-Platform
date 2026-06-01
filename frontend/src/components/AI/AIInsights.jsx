import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import {
  Brain, ShieldCheck, Sparkles, Target,
  RefreshCw, ArrowLeft, AlertTriangle,
  Zap, BarChart2, Award
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid
} from "recharts";

const CACHE_DURATION = 10 * 60 * 1000;

const CATEGORY_COLORS = {
  "Food & Dining": "#f97316",
  "Transportation": "#3b82f6",
  "Bills & Utilities": "#ef4444",
  "Shopping": "#ec4899",
  "Entertainment": "#8b5cf6",
  "Healthcare": "#10b981",
  "Education": "#f59e0b",
  "Other": "#6b7280",
  Food: "#f97316",
  Transport: "#3b82f6",
  Bills: "#ef4444",
  Health: "#10b981",
};

const CATEGORY_LIMITS = {
  "Food & Dining": { pct: 0.20, tip: "Try cooking at home more often" },
  Food: { pct: 0.20, tip: "Try cooking at home more often" },
  Shopping: { pct: 0.20, tip: "Avoid impulse purchases this month" },
  Entertainment: { pct: 0.10, tip: "Consider free entertainment alternatives" },
  Transport: { pct: 0.15, tip: "Try carpooling or public transit" },
  Transportation: { pct: 0.15, tip: "Try carpooling or public transit" },
  Bills: { pct: 0.25, tip: "Review subscriptions you no longer use" },
  "Bills & Utilities": { pct: 0.25, tip: "Review subscriptions you no longer use" },
  Health: { pct: 0.15, tip: "Check if any expenses are claimable" },
  Healthcare: { pct: 0.15, tip: "Check if any expenses are claimable" },
  Other: { pct: 0.15, tip: "Try categorizing 'Other' expenses for better tracking" },
};

function useBreakpoint() {
  const [width, setWidth] = useState(
    typeof window !== "undefined" ? window.innerWidth : 1280
  );
  useEffect(() => {
    const fn = () => setWidth(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return {
    isMobile: width < 640,
    isTablet: width >= 640 && width < 1024,
    isDesktop: width >= 1024,
  };
}

function AnimatedCircle({ value, size = 160, stroke = 12, color = "#6366f1" }) {
  const [current, setCurrent] = useState(0);
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (current / 100) * circ;

  useEffect(() => {
    let v = 0;
    const step = value / 60;
    const t = setInterval(() => {
      v += step;
      if (v >= value) { setCurrent(value); clearInterval(t); }
      else setCurrent(Math.round(v));
    }, 16);
    return () => clearInterval(t);
  }, [value]);

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke="var(--border-strong)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            transition: "stroke-dashoffset 0.05s linear",
            filter: `drop-shadow(0 0 10px ${color}70)`,
          }}
        />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
      }}>
        <span style={{
          fontFamily: "'Syne',sans-serif",
          fontSize: size * 0.18, fontWeight: 800,
          color: "var(--text-primary)", lineHeight: 1,
        }}>{current}</span>
        <span style={{ fontSize: size * 0.08, color: "var(--text-secondary)", marginTop: 2 }}>
          /100
        </span>
      </div>
    </div>
  );
}

function AnimNum({ value, prefix = "" }) {
  const [d, setD] = useState(0);
  const absVal = Math.abs(value);
  const isNeg = value < 0;

  useEffect(() => {
    let s = 0;
    const steps = 50;
    const inc = absVal / steps;
    let c = 0;
    const t = setInterval(() => {
      c++;
      s += inc;
      if (c >= steps) { setD(absVal); clearInterval(t); }
      else setD(Math.round(s));
    }, 20);
    return () => clearInterval(t);
  }, [absVal]);

  return <>{isNeg ? "-" : ""}{prefix}{d.toLocaleString()}</>;
}

export default function AIInsights() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();

  const [insights, setInsights] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const { isMobile, isDesktop } = useBreakpoint();

  const income = Number(insights?.metrics?.income ?? user?.monthlyIncome ?? 0);
  const savingsGoal = Number(insights?.metrics?.savingsGoal ?? user?.savingsGoal ?? 0);

  const fetchAll = useCallback(async (force = false) => {
    if (!user?._id) return;

    Object.keys(localStorage)
      .filter(k => k.startsWith("aiInsights") && !k.includes(user._id))
      .forEach(k => localStorage.removeItem(k));

    setLoading(true);
    setError("");

    const now = new Date();

    try {
      const userId = user._id;
      const cacheKey = `aiInsights_${userId}_${now.getFullYear()}_${now.getMonth()}`;
      const timeKey = `aiInsightsTime_${cacheKey}`;

      const guestKey = `aiInsights_guest_${now.getFullYear()}_${now.getMonth()}`;
      const guestTimeKey = `aiInsightsTime_${guestKey}`;
      localStorage.removeItem(guestKey);
      localStorage.removeItem(guestTimeKey);

      const [expRes, budRes] = await Promise.all([
        API.get("/expenses", {
          params: {
            month: now.getMonth(),   // June = 5
            year: now.getFullYear()  // 2026
          }
        }),
        API.get("/budget"),
      ]);
      setExpenses(expRes.data || []);
      const budgetAmt = budRes.data?.monthlyBudget || budRes.data?.amount || 0;
      setBudget(budgetAmt);

      if (!force) {
        const cached = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(timeKey);

        if (cached && cachedTime && Date.now() - Number(cachedTime) < CACHE_DURATION) {
          const parsed = JSON.parse(cached);
          const incomeOk = Number(parsed?.metrics?.income) > 0;
          const savingsOk = Number(parsed?.metrics?.savingsGoal) > 0;

          if (incomeOk && savingsOk) {
            setInsights(parsed);
            setLastUpdated(new Date(Number(cachedTime)));
            setLoading(false);
            return;
          }

          localStorage.removeItem(cacheKey);
          localStorage.removeItem(timeKey);
        }
      }

      const res = await API.get("/ai/insights", {
        params: { month: now.getMonth(), year: now.getFullYear() },
      });

      setInsights(res.data);
      localStorage.setItem(cacheKey, JSON.stringify(res.data));
      localStorage.setItem(timeKey, Date.now().toString());
      setLastUpdated(new Date());
    } catch (err) {
      console.error("AIInsights fetch error:", err);
      setError("Failed to load AI insights. Please check your API quota.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user?._id) fetchAll();
  }, [user?._id, fetchAll]);

  const totalSpent = expenses.reduce((a, e) => a + Number(e.amount), 0);
  const effectiveIncome = income > 0 ? income : budget;
  const actualSavings = effectiveIncome - totalSpent;
  const budgetUsageRatio = budget > 0 ? totalSpent / budget : 0;
  const goalProgress = savingsGoal > 0
    ? Math.min(100, Math.max(0, Math.round((actualSavings / savingsGoal) * 100)))
    : 0;

  const categoryBreakdown = expenses.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});

  const predictions = insights?.predictions || {};
  const predictionData = Object.entries(predictions)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ category: k, amount: v, color: CATEGORY_COLORS[k] || "#6b7280" }))
    .sort((a, b) => b.amount - a.amount);

  const recommendations = insights?.recommendations || [];


  let score = insights?.healthScore ?? (() => {
    let s = 100;
    if (budgetUsageRatio > 0.9) s -= 30;
    else if (budgetUsageRatio > 0.7) s -= 15;
    if (actualSavings < effectiveIncome * 0.1 && expenses.length > 2) s -= 20;
    else if (actualSavings < effectiveIncome * 0.2 && expenses.length > 2) s -= 10;
    if (categoryBreakdown["Shopping"] > budget * 0.25) s -= 10;
    if (expenses.length === 0) s = Math.min(s, 70);
    if (actualSavings > effectiveIncome * 0.35) s += 10;
    return Math.max(0, Math.min(100, Math.round(s)));
  })();

  const scoreColor = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";
  const riskLevel = score >= 80 ? "Low" : score >= 60 ? "Medium" : "High";
  const riskColor = riskLevel === "Low" ? "#10b981" : riskLevel === "Medium" ? "#f59e0b" : "#ef4444";

  const aiConfidence = insights?.metrics?.aiConfidence
    ?? Math.min(98, Math.max(65, 65 + expenses.length * 2));

  const improvement = effectiveIncome > 0
    ? Math.round((actualSavings / effectiveIncome) * 100 - 20)
    : 0;

  const habitAnalysis = insights?.habitSummary
    ? { text: insights.habitSummary, color: "#a78bfa", icon: "🤖" }
    : actualSavings > effectiveIncome * 0.35
      ? { text: "Excellent savings discipline — keep it up!", color: "#10b981", icon: "🏆" }
      : actualSavings > effectiveIncome * 0.15
        ? { text: "Balanced spending habits detected.", color: "#6366f1", icon: "✅" }
        : expenses.length < 3
          ? { text: "Add more expenses for habit analysis.", color: "#f59e0b", icon: "📊" }
          : { text: "Spending is high. Consider a budget plan.", color: "#ef4444", icon: "⚠️" };

  const allAlerts = insights?.alerts?.length > 0
    ? insights.alerts
    : (() => {
      const fallback = [];
      if (expenses.length === 0) {
        fallback.push({ type: "info", msg: "No expenses yet. Add your first expense to see live alerts.", sub: null });
      } else {
        if (budgetUsageRatio >= 1.0)
          fallback.push({ type: "critical", msg: "You've used up your entire budget this month!", sub: "Avoid all non-essential spending." });
        else if (budgetUsageRatio > 0.9)
          fallback.push({ type: "critical", msg: `${(budgetUsageRatio * 100).toFixed(0)}% of budget used — only ₹${(budget - totalSpent).toLocaleString()} left.`, sub: "Avoid any large purchases." });
        else if (budgetUsageRatio > 0.75)
          fallback.push({ type: "warning", msg: `${(budgetUsageRatio * 100).toFixed(0)}% of budget used this month.`, sub: "Keep an eye on your spending." });

        if (actualSavings < effectiveIncome * 0.1 && expenses.length > 2)
          fallback.push({ type: "critical", msg: "Your savings rate is critically low — under 10%.", sub: "Try to cut back on non-essential expenses." });

        Object.entries(categoryBreakdown).forEach(([cat, amt]) => {
          const limit = CATEGORY_LIMITS[cat];
          if (!limit) return;
          const limitAmt = budget * limit.pct;
          const overBy = amt - limitAmt;
          if (overBy <= 0) return;
          const pctOver = Math.round((overBy / limitAmt) * 100);
          const severity = pctOver > 50 ? "critical" : pctOver > 20 ? "warning" : "mild";
          fallback.push({ type: severity, msg: `${cat}: ₹${amt.toLocaleString()} spent — ${pctOver}% over recommended`, sub: limit.tip });
        });

        if (fallback.length === 0)
          fallback.push({ type: "success", msg: "All spending is within budget limits.", sub: "You're managing your money well!" });
      }
      return fallback;
    })();

  const isAiAlerts = insights?.alerts?.length > 0;

  const chartData = Object.entries(categoryBreakdown)
    .map(([k, v]) => ({ category: k, actual: v, predicted: predictions[k] || 0 }))
    .sort((a, b) => b.actual - a.actual);

  const circleSize = isMobile ? 120 : 156;

  const recStyleMap = {
    warning: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.15)", color: "#fcd34d", icon: "⚠️" },
    success: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.15)", color: "#6ee7b7", icon: "✅" },
    tip: { bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.15)", color: "#a5b4fc", icon: "💡" },
    prediction: { bg: "rgba(56,189,248,0.08)", border: "rgba(56,189,248,0.15)", color: "#7dd3fc", icon: "🔮" },
  };
  const recDefault = recStyleMap.tip;

  const alertStyleMap = {
    critical: { bg: "rgba(239,68,68,0.08)", border: "rgba(239,68,68,0.2)", color: "#fca5a5", iconBg: "rgba(239,68,68,0.15)", icon: "🔥" },
    warning: { bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)", color: "#fcd34d", iconBg: "rgba(245,158,11,0.15)", icon: "⚠️" },
    mild: { bg: "rgba(251,146,60,0.08)", border: "rgba(251,146,60,0.2)", color: "#fdba74", iconBg: "rgba(251,146,60,0.15)", icon: "🟠" },
    success: { bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)", color: "#6ee7b7", iconBg: "rgba(16,185,129,0.15)", icon: "✅" },
    info: { bg: "rgba(99,102,241,0.08)", border: "rgba(99,102,241,0.2)", color: "#a5b4fc", iconBg: "rgba(99,102,241,0.15)", icon: "ℹ️" },
  };

  /* ── Tooltip style (theme-aware) ────────────────────────────────────────── */
  const tooltipStyle = {
    background: "var(--bg-card)",
    border: "1px solid var(--border-strong)",
    color: "var(--text-primary)",
    fontSize: 12,
    borderRadius: 10,
  };

  if (loading) return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary)",
      display: "flex", alignItems: "center", justifyContent: "center",
      transition: "background 0.3s ease",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 52, height: 52,
          border: "3px solid var(--border-strong)",
          borderTop: "3px solid #6366f1",
          borderRadius: "50%", animation: "spin 0.8s linear infinite",
          margin: "0 auto 16px",
        }} />
        <p style={{ color: "var(--text-secondary)", fontSize: 14, fontFamily: "'DM Sans',sans-serif" }}>
          Analyzing your finances...
        </p>
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{
      minHeight: "100vh",
      background: "var(--bg-primary)",
      fontFamily: "'DM Sans',sans-serif",
      color: "var(--text-primary)",
      transition: "background 0.3s ease, color 0.3s ease",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        @keyframes spin    { to { transform: rotate(360deg) } }
        @keyframes fadeUp  { from { opacity:0; transform:translateY(18px) } to { opacity:1; transform:translateY(0) } }
        @keyframes pulse   { 0%,100% { opacity:1 } 50% { opacity:0.4 } }

        .glass {
          background: var(--bg-card);
          border: 1px solid var(--border);
          border-radius: 20px;
          backdrop-filter: blur(12px);
          transition: background 0.3s ease, border-color 0.3s ease;
        }

        .fu  { animation:fadeUp 0.45s ease forwards; opacity:0 }
        .fu1 { animation-delay:0.05s } .fu2 { animation-delay:0.12s }
        .fu3 { animation-delay:0.20s } .fu4 { animation-delay:0.28s }
        .fu5 { animation-delay:0.36s }

        .mcard {
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 14px;
          transition: all 0.2s;
        }
        .mcard:hover {
          background: var(--bg-card-hover);
          transform: translateY(-2px);
        }

        .alert-scroll::-webkit-scrollbar { width: 4px }
        .alert-scroll::-webkit-scrollbar-thumb {
          background: var(--border-strong);
          border-radius: 99px;
        }
      `}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 14px" : "28px 24px" }}>
        <div className="fu fu1" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: isMobile ? 16 : 28, flexWrap: "wrap", gap: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 10 : 14 }}>
            <button onClick={() => navigate("/dashboard")} style={{
              width: 36, height: 36,
              background: "var(--bg-input)",
              border: "1px solid var(--border)",
              borderRadius: 11,
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "var(--text-primary)", flexShrink: 0,
              transition: "background 0.2s",
            }}>
              <ArrowLeft size={15} />
            </button>
            <div>
              <h1 style={{
                fontFamily: "'Syne',sans-serif",
                fontSize: isMobile ? 18 : 24,
                fontWeight: 800, margin: 0,
                color: "var(--text-primary)",
              }}>
                AI Financial Insights
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 3 }}>
                <div style={{
                  width: 6, height: 6, background: "#10b981", borderRadius: "50%",
                  animation: "pulse 2s infinite", boxShadow: "0 0 6px #10b981",
                }} />
                <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: 0 }}>
                  Live · {lastUpdated
                    ? `Updated ${lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`
                    : "Fetching..."}
                </p>
              </div>
            </div>
          </div>
          <button onClick={() => fetchAll(true)} disabled={loading} style={{
            display: "flex", alignItems: "center", gap: 7, padding: "9px 16px",
            background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.35)",
            borderRadius: 11, color: "#a5b4fc", fontSize: 13, fontWeight: 600, cursor: "pointer",
          }}>
            <RefreshCw size={13} style={{ animation: loading ? "spin 0.8s linear infinite" : "none" }} />
            {!isMobile && "Refresh"}
          </button>
        </div>
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 12, padding: "12px 16px", marginBottom: 16, color: "#fca5a5", fontSize: 13,
          }}>
            ⚠️ {error}
          </div>
        )}

        {/* ─── ROW 1: Score + Goals + Alerts ─── */}
        <div className="fu fu2" style={{
          display: "grid",
          gridTemplateColumns: isDesktop ? "360px 1fr" : "1fr",
          gap: isMobile ? 14 : 18, marginBottom: isMobile ? 14 : 18,
        }}>
          <div className="glass" style={{ padding: isMobile ? 18 : 26 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
              <div style={{
                width: 34, height: 34, background: `${scoreColor}20`,
                borderRadius: 10, display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0,
              }}>
                <ShieldCheck size={17} color={scoreColor} />
              </div>
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "var(--text-primary)" }}>Financial Health Score</p>
                <p style={{ color: "var(--text-secondary)", fontSize: 11, margin: 0 }}>Based on your spending habits</p>
              </div>
            </div>
            <div style={{
              display: "flex",
              flexDirection: isMobile ? "row" : "column",
              alignItems: isMobile ? "center" : "stretch",
              gap: isMobile ? 16 : 0,
            }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: isMobile ? 0 : 22, flexShrink: 0 }}>
                <AnimatedCircle value={score} size={circleSize} stroke={isMobile ? 10 : 12} color={scoreColor} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                  {[
                    { label: "AI Confidence", value: `${aiConfidence}%`, color: "#6366f1" },
                    { label: "Risk Level", value: riskLevel, color: riskColor },
                    { label: "Monthly Change", value: improvement > 0 ? `+${improvement}%` : `${improvement}%`, color: improvement > 0 ? "#10b981" : "#ef4444" },
                    { label: "Transactions", value: expenses.length, color: "#f59e0b" },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="mcard">
                      <p style={{ fontSize: 10, color: "var(--text-secondary)", margin: "0 0 4px" }}>{label}</p>
                      <p style={{ fontFamily: "'Syne',sans-serif", fontSize: isMobile ? 16 : 19, fontWeight: 800, color, margin: 0 }}>{value}</p>
                    </div>
                  ))}
                </div>
                <div style={{
                  padding: "11px 13px",
                  background: "var(--bg-input)",
                  border: "1px solid var(--border)",
                  borderRadius: 11,
                }}>
                  <p style={{ fontSize: 12, color: habitAnalysis.color, margin: 0 }}>
                    {habitAnalysis.icon} {habitAnalysis.text}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Savings Goal */}
            <div className="glass" style={{ padding: isMobile ? 16 : 22, flex: isDesktop ? 1 : "none" }}>
              <div style={{
                display: "flex", justifyContent: "space-between",
                alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 6,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Target size={15} color="#10b981" />
                  <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "var(--text-primary)" }}>Savings Goal</p>
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: goalProgress >= 100 ? "#10b981" : "#f59e0b" }}>
                  {goalProgress}% {goalProgress >= 100 ? "🎉" : ""}
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 14 }}>
                {[
                  { label: "Monthly Income", value: `₹${(income || 0).toLocaleString()}`, color: "#6366f1" },
                  { label: "Saved So Far", value: actualSavings, isAnim: true, color: actualSavings >= 0 ? "#10b981" : "#ef4444" },
                  { label: "Your Goal", value: `₹${(savingsGoal || 0).toLocaleString()}`, color: "var(--text-secondary)" },
                ].map(({ label, value, isAnim, color }) => (
                  <div key={label}>
                    <p style={{ fontSize: 10, color: "var(--text-secondary)", margin: "0 0 2px" }}>{label}</p>
                    <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color, margin: 0 }}>
                      {isAnim ? <AnimNum value={value} prefix="₹" /> : value}
                    </p>
                  </div>
                ))}
              </div>

              <div style={{ height: 7, background: "var(--border-strong)", borderRadius: 99, overflow: "hidden", marginBottom: 8 }}>
                <div style={{
                  height: "100%", width: `${goalProgress}%`,
                  background: "linear-gradient(90deg,#10b981,#06b6d4)",
                  borderRadius: 99, transition: "width 1s ease",
                }} />
              </div>
              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                {goalProgress >= 100 ? "🏆 Goal achieved!"
                  : goalProgress >= 70 ? "🚀 Almost there! Keep it up."
                    : goalProgress >= 40 ? "📈 Good progress. Keep going."
                      : actualSavings < 0 ? "🔴 Spending exceeds income this month."
                        : savingsGoal === 0 ? "💡 Set a savings goal in your profile to track progress."
                          : "💡 Reduce spending to reach your savings goal."}
              </p>
            </div>
            <div className="glass" style={{ padding: isMobile ? 16 : 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AlertTriangle size={15} color="#f59e0b" />
                  <p style={{ fontWeight: 700, fontSize: 13, margin: 0, color: "var(--text-primary)" }}>Spending Alerts</p>
                  {isAiAlerts && (
                    <span style={{
                      background: "rgba(56,189,248,0.12)", color: "#7dd3fc",
                      fontSize: 10, fontWeight: 700, padding: "2px 7px",
                      borderRadius: 99, border: "1px solid rgba(56,189,248,0.25)",
                      display: "flex", alignItems: "center", gap: 3,
                    }}>
                      🤖 AI
                    </span>
                  )}
                </div>
                {allAlerts.filter(a => a.type !== "success" && a.type !== "info").length > 0 && (
                  <span style={{
                    background: "rgba(239,68,68,0.2)", color: "#fca5a5",
                    fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99,
                  }}>
                    {allAlerts.filter(a => a.type !== "success" && a.type !== "info").length} issues
                  </span>
                )}
              </div>
              <div className="alert-scroll" style={{ display: "flex", flexDirection: "column", gap: 7, maxHeight: 200, overflowY: "auto" }}>
                {allAlerts.map((alert, i) => {
                  const s = alertStyleMap[alert.type] || alertStyleMap.info;
                  return (
                    <div key={i} style={{
                      display: "flex", gap: 10, padding: "10px 12px",
                      background: s.bg, border: `1px solid ${s.border}`,
                      borderRadius: 10, alignItems: "flex-start",
                    }}>
                      <div style={{
                        width: 26, height: 26, borderRadius: "50%",
                        background: s.iconBg, display: "flex",
                        alignItems: "center", justifyContent: "center",
                        flexShrink: 0, fontSize: 12,
                      }}>
                        {s.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontSize: 12, color: s.color, margin: 0, fontWeight: 600, lineHeight: 1.4 }}>
                          {alert.msg}
                        </p>
                        {alert.sub && (
                          <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: "3px 0 0", lineHeight: 1.4 }}>
                            {alert.sub}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
        {chartData.length > 0 && (
          <div className="glass fu fu3" style={{ padding: isMobile ? 16 : 24, marginBottom: isMobile ? 14 : 18 }}>
            <div style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10,
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <BarChart2 size={15} color="#6366f1" />
                <div>
                  <p style={{ fontWeight: 700, fontSize: isMobile ? 13 : 15, margin: 0, color: "var(--text-primary)" }}>
                    Actual vs Predicted Spending
                  </p>
                  <p style={{ color: "var(--text-secondary)", fontSize: 11, margin: 0 }}>
                    Your real spending compared to AI predictions
                  </p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
                {[{ label: "Actual", color: "#6366f1" }, { label: "Predicted", color: "#10b981" }].map(({ label, color }) => (
                  <span key={label} style={{ display: "flex", alignItems: "center", gap: 5, color: "var(--text-secondary)" }}>
                    <span style={{ width: 9, height: 9, background: color, borderRadius: 2 }} />{label}
                  </span>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={isMobile ? 180 : 220}>
              <BarChart data={chartData} barGap={3}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis
                  dataKey="category"
                  tick={{ fill: "var(--text-secondary)", fontSize: isMobile ? 9 : 11 }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fill: "var(--text-secondary)", fontSize: isMobile ? 9 : 10 }}
                  axisLine={false} tickLine={false}
                  tickFormatter={v => `₹${v}`}
                  width={isMobile ? 48 : 60}
                />
                <Tooltip contentStyle={tooltipStyle} formatter={v => [`₹${v.toLocaleString()}`, ""]} />
                <Bar dataKey="actual" fill="#6366f1" radius={[4, 4, 0, 0]} />
                <Bar dataKey="predicted" fill="#10b981" radius={[4, 4, 0, 0]} opacity={0.65} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
        <div className="fu fu4" style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
          gap: isMobile ? 14 : 18,
          marginBottom: isMobile ? 14 : 18,
        }}>
          <div className="glass" style={{ padding: isMobile ? 16 : 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}>
              <Zap size={15} color="#f59e0b" />
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "var(--text-primary)" }}>Next Month Predictions</p>
                <p style={{ color: "var(--text-secondary)", fontSize: 11, margin: 0 }}>What AI expects you to spend next month</p>
              </div>
            </div>
            {predictionData.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {predictionData.map(({ category, amount, color }) => {
                  const max = predictionData[0].amount || 1;
                  return (
                    <div key={category}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 5 }}>
                        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{category}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color }}>
                          <AnimNum value={amount} prefix="₹" />
                        </span>
                      </div>
                      <div style={{ height: 5, background: "var(--border-strong)", borderRadius: 99, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${(amount / max) * 100}%`, background: color, borderRadius: 99 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ textAlign: "center", paddingTop: 20 }}>
                <p style={{ fontSize: 28, marginBottom: 8 }}>🔮</p>
                <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>
                  Predictions available with the full AI model.<br />
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Add more expenses to generate forecasts.</span>
                </p>
              </div>
            )}
          </div>
          <div className="glass" style={{ padding: isMobile ? 16 : 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 18 }}>
              <Brain size={15} color="#a78bfa" />
              <div>
                <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "var(--text-primary)" }}>Recommendations</p>
                <p style={{ color: "var(--text-secondary)", fontSize: 11, margin: 0 }}>Personalized tips to improve your finances</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {recommendations.length > 0 ? recommendations.map((rec, i) => {
                const s = recStyleMap[rec.type] || recDefault;
                return (
                  <div key={i} style={{
                    display: "flex", gap: 10, padding: "12px 13px",
                    background: s.bg, border: `1px solid ${s.border}`, borderRadius: 11,
                  }}>
                    <span style={{ fontSize: 14, flexShrink: 0 }}>{s.icon}</span>
                    <p style={{ fontSize: 12, color: s.color, margin: 0, lineHeight: 1.6 }}>{rec.message}</p>
                  </div>
                );
              }) : (
                <p style={{ color: "var(--text-muted)", fontSize: 13, textAlign: "center", paddingTop: 20 }}>
                  No recommendations yet
                </p>
              )}
            </div>
          </div>
        </div>
        {insights?.summary && (
          <div className="glass fu fu5" style={{ padding: isMobile ? 16 : 22 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
              <Award size={15} color="#f59e0b" />
              <p style={{ fontWeight: 700, fontSize: 14, margin: 0, color: "var(--text-primary)" }}>AI Summary</p>
            </div>
            <div style={{
              display: "flex", gap: 12, padding: "14px 16px",
              background: "rgba(99,102,241,0.05)",
              border: "1px solid rgba(99,102,241,0.12)",
              borderRadius: 12,
            }}>
              <Sparkles size={15} color="#a78bfa" style={{ flexShrink: 0, marginTop: 2 }} />
              <p style={{ fontSize: isMobile ? 12 : 13, color: "var(--text-secondary)", margin: 0, lineHeight: 1.7 }}>
                {insights.summary}
              </p>
            </div>
          </div>
        )}

        {isMobile && <div style={{ height: 24 }} />}
      </div>
    </div>
  );
}