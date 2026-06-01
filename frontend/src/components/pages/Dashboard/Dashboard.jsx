import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../../../api";
import {
  Lightbulb, Brain, TrendingUp, Target, Sparkles,
  ArrowRight, ChevronRight, RefreshCw, Plus,
  Wallet, PiggyBank, BarChart3, Zap, Moon, Sun,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import BudgetModal from "../../Expenses/BudgetModal";
import SmartAdd from "../../SmartAdd";
import socket from "../../../Socket";
import NotificationBell from "../../../NotificationBell";

const CACHE_DURATION = 10 * 60 * 1000;

const getCategoryIcon = (category) => {
  const icons = { Food: "🍔", Transport: "🚗", Entertainment: "🎬", Bills: "📄", Shopping: "🛍️", Health: "💊", Other: "📦" };
  return icons[category] || "📦";
};
const getCategoryColor = (category) => {
  const colors = { Food: "#f97316", Transport: "#3b82f6", Entertainment: "#8b5cf6", Bills: "#ef4444", Shopping: "#ec4899", Health: "#10b981", Other: "#6b7280" };
  return colors[category] || "#6b7280";
};

function useBreakpoint() {
  const [width, setWidth] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const fn = () => setWidth(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return { isMobile: width < 640, isTablet: width >= 640 && width < 1024, isDesktop: width >= 1024, width };
}

function AnimatedNumber({ value, prefix = "", suffix = "", decimals = 0 }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let startTs = null;
    const end = parseFloat(value) || 0;
    const duration = 900;
    const step = (timestamp) => {
      if (!startTs) startTs = timestamp;
      const progress = Math.min((timestamp - startTs) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(eased * end);
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  const formatted = decimals > 0 ? display.toFixed(decimals) : Math.round(display).toLocaleString("en-IN");
  return <span>{prefix}{formatted}{suffix}</span>;
}

function SparkBar({ data = [], color = "#6366f1" }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 28 }}>
      {data.slice(-7).map((v, i) => (
        <div key={i} style={{
          flex: 1, minWidth: 4,
          height: `${Math.max((v / max) * 100, 8)}%`,
          background: i === data.slice(-7).length - 1 ? color : `${color}55`,
          borderRadius: 3,
          transition: "height 0.6s ease",
        }} />
      ))}
    </div>
  );
}

function SkeletonCard({ height = 80, style = {} }) {
  return (
    <div style={{
      height,
      borderRadius: 18,
      background: "var(--stat-bg)",
      border: "1px solid var(--stat-border)",
      overflow: "hidden",
      position: "relative",
      ...style,
    }}>
      <div style={{
        position: "absolute", inset: 0,
        background: "linear-gradient(90deg, transparent 25%, var(--border-strong) 50%, transparent 75%)",
        backgroundSize: "200% auto",
        animation: "shimmer 1.4s infinite linear",
      }} />
    </div>
  );
}

function ThemeToggleBtn() {
  const { isDark, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      style={{
        width: 40, height: 40,
        borderRadius: 12,
        background: "var(--bg-input)",
        border: "1px solid var(--border)",
        cursor: "pointer",
        display: "flex", alignItems: "center", justifyContent: "center",
        transition: "all 0.2s ease",
        color: "var(--text-secondary)",
        flexShrink: 0,
      }}
      onMouseOver={e => { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.color = "white"; e.currentTarget.style.borderColor = "var(--accent)"; }}
      onMouseOut={e => { e.currentTarget.style.background = "var(--bg-input)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      {isDark ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  );
}

function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(5000);
  const [loading, setLoading] = useState(true);
  const [openModal, setOpenModal] = useState(false);
  const [aiInsights, setAiInsights] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const aiCache = useRef({});

  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const { isMobile, isTablet, isDesktop } = useBreakpoint();

  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  };

  useEffect(() => {
    if (user?._id) socket.emit("join", user._id);
  }, [user?._id]);

  const fetchData = useCallback(async () => {
    try {
      const [expenseRes, budgetRes] = await Promise.all([
        API.get("/expenses"),
        API.get("/budget"),
      ]);
      setExpenses(expenseRes.data);
      setBudget(budgetRes.data.monthlyBudget || budgetRes.data.amount || 0);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    fetchData();
  }, [location.state, fetchData]);

  const fetchAI = useCallback(async (force = false) => {
    const userId = user?._id || "guest";
    const cached = aiCache.current[userId];
    if (!force && cached && Date.now() - cached.fetchedAt < CACHE_DURATION) {
      setAiInsights(cached.data);
      return;
    }
    setAiLoading(true);
    setAiError(false);
    try {
      const res = await API.get("/ai/insights");
      setAiInsights(res.data);
      aiCache.current[userId] = { data: res.data, fetchedAt: Date.now() };
    } catch {
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  }, [user?._id]);

  useEffect(() => {
    if (user?._id) fetchAI();
  }, [user?._id, fetchAI]);

  const now = new Date();
  const currentMonthExpenses = expenses.filter((e) => {
    const d = new Date(e.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });

  const totalExpenses = currentMonthExpenses.reduce((acc, e) => acc + Number(e.amount), 0);
  const savings = budget - totalExpenses;
  const percentage = budget > 0 ? Math.min((totalExpenses / budget) * 100, 100) : 0;
  const quickAITip = aiInsights?.recommendations?.[0];
  const topPrediction = aiInsights?.predictions
    ? Object.entries(aiInsights.predictions).filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1])[0]
    : null;

  const sparkData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return expenses
      .filter((e) => new Date(e.date).toDateString() === d.toDateString())
      .reduce((s, e) => s + Number(e.amount), 0);
  });

  const progressColor =
    percentage >= 90 ? "linear-gradient(90deg, #ef4444, #f97316)"
      : percentage >= 70 ? "linear-gradient(90deg, #f59e0b, #fbbf24)"
        : "linear-gradient(90deg, #6366f1, #06b6d4)";

  const pagePadding = isMobile ? "14px 12px" : isTablet ? "20px 18px" : "28px 28px";
  const heroFontSize = isMobile ? 28 : isTablet ? 34 : 44;
  const greetingFontSize = isMobile ? 19 : isTablet ? 22 : 27;

  const statCards = [
    {
      id: "spent", icon: <Wallet size={18} color="#6366f1" />, iconBg: "rgba(99,102,241,0.15)",
      label: "Spent This Month", value: totalExpenses, prefix: "₹",
      sub: `${currentMonthExpenses.length} transactions`, subColor: "#6366f1",
      spark: sparkData, sparkColor: "#6366f1",
    },
    {
      id: "saved", icon: <PiggyBank size={18} color={savings < 0 ? "#ef4444" : "#10b981"} />,
      iconBg: savings < 0 ? "rgba(239,68,68,0.15)" : "rgba(16,185,129,0.15)",
      label: "Total Saved", value: Math.max(savings, 0), prefix: "₹",
      sub: savings < 0 ? `Over by ₹${Math.abs(savings).toLocaleString()}` : "On track 🎉",
      subColor: savings < 0 ? "#ef4444" : "#10b981", sparkColor: savings < 0 ? "#ef4444" : "#10b981",
    },
    {
      id: "budget",
      icon: <BarChart3 size={18} color={percentage >= 90 ? "#ef4444" : percentage >= 70 ? "#f59e0b" : "#3b82f6"} />,
      iconBg: percentage >= 90 ? "rgba(239,68,68,0.15)" : percentage >= 70 ? "rgba(245,158,11,0.15)" : "rgba(59,130,246,0.15)",
      label: "Budget Used", value: percentage, suffix: "%", decimals: 1,
      sub: `₹${Math.max(savings, 0).toLocaleString("en-IN")} remaining`,
      subColor: percentage >= 90 ? "#ef4444" : percentage >= 70 ? "#f59e0b" : "#3b82f6",
      sparkColor: percentage >= 90 ? "#ef4444" : percentage >= 70 ? "#f59e0b" : "#3b82f6",
    },
  ];

  return (
    <div style={{
      background: isDark
        ? "var(--bg-primary)"
        : "linear-gradient(150deg, #f0f2f8 0%, #e8eaf6 50%, #ede9fe 100%)",
      minHeight: "100vh",
      fontFamily: "'DM Sans', sans-serif",
      transition: "background 0.3s ease",
      position: "relative",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Syne:wght@700;800;900&display=swap');
        * { box-sizing: border-box; }

        /* ── Ambient glowing blobs (dark mode only) ── */
        .blob {
          position: fixed;
          border-radius: 50%;
          filter: blur(90px);
          pointer-events: none;
          z-index: 0;
          opacity: 0;
          transition: opacity 0.5s ease;
        }
        [data-theme="dark"] .blob { opacity: 1; }
        .blob-1 { width: 500px; height: 500px; background: radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%); top: -120px; left: -100px; animation: blobDrift 12s ease-in-out infinite alternate; }
        .blob-2 { width: 400px; height: 400px; background: radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%); top: 40%; right: -80px; animation: blobDrift 15s ease-in-out infinite alternate-reverse; }
        .blob-3 { width: 300px; height: 300px; background: radial-gradient(circle, rgba(6,182,212,0.1) 0%, transparent 70%); bottom: 10%; left: 30%; animation: blobDrift 10s ease-in-out infinite alternate; }

        @keyframes blobDrift {
          from { transform: translate(0, 0) scale(1); }
          to   { transform: translate(30px, 20px) scale(1.08); }
        }

        /* ── Glass card ── */
        .dash-card {
          background: var(--bg-card);
          backdrop-filter: blur(18px);
          -webkit-backdrop-filter: blur(18px);
          border-radius: 20px;
          border: 1px solid var(--border);
          box-shadow: 0 4px 24px rgba(0,0,0,0.12);
          transition: box-shadow 0.25s ease, transform 0.25s ease, background 0.3s ease;
        }
        .dash-card:hover {
          box-shadow: 0 8px 36px rgba(0,0,0,0.18);
        }

        /* ── Stat card ── */
        .stat-card {
          background: var(--stat-bg);
          border-radius: 18px;
          border: 1px solid var(--stat-border);
          padding: 18px;
          transition: transform 0.25s cubic-bezier(.22,.68,0,1.2), box-shadow 0.25s ease, background 0.3s ease;
          cursor: default;
          position: relative;
          overflow: hidden;
          backdrop-filter: blur(12px);
        }
        .stat-card:hover {
          transform: translateY(-4px) scale(1.01);
          box-shadow: 0 12px 32px var(--accent-glow);
        }
        .stat-card::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.06) 0%, transparent 60%);
          pointer-events: none;
          border-radius: 18px;
        }

        /* ── Action buttons ── */
        .action-btn {
          width: 100%;
          padding: 13px 16px;
          border-radius: 14px;
          font-size: 13.5px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          border: none;
          cursor: pointer;
          transition: transform 0.2s cubic-bezier(.22,.68,0,1.2), box-shadow 0.2s ease, filter 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .action-btn:hover { transform: translateY(-3px) scale(1.01); filter: brightness(1.08); }
        .action-btn:active { transform: translateY(0) scale(0.97); }
        .action-btn-ghost {
          background: var(--bg-input) !important;
          color: var(--text-primary) !important;
          border: 1px solid var(--border) !important;
        }
        .action-btn-ghost:hover { background: var(--accent-glow) !important; border-color: var(--accent) !important; }

        /* ── Transaction row ── */
        .tx-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 11px 10px;
          border-radius: 14px;
          transition: background 0.15s ease;
          cursor: default;
        }
        .tx-row:hover { background: var(--hover-row); }

        /* ── Hero card ── */
        .hero-card {
          border-radius: 24px;
          position: relative;
          overflow: hidden;
        }

        /* ── Progress ── */
        .progress-track { width: 100%; height: 10px; background: rgba(255,255,255,0.1); border-radius: 99px; overflow: hidden; }
        .progress-fill  { height: 100%; border-radius: 99px; transition: width 1.1s cubic-bezier(.22,.68,0,1.2); }

        .badge { padding: 5px 12px; border-radius: 99px; font-size: 12px; font-weight: 600; display: inline-flex; align-items: center; gap: 4px; }

        .insight-chip { display: flex; gap: 10px; padding: 13px 15px; border-radius: 14px; transition: transform 0.2s ease; }
        .insight-chip:hover { transform: translateX(3px); }

        .category-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 8px; border-radius: 10px; transition: background 0.15s; }
        .category-row:hover { background: var(--hover-row); }

        .icon-badge { width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }

        .forecast-bar { height: 5px; background: var(--border); border-radius: 99px; overflow: hidden; margin-top: 5px; }
        .forecast-fill { height: 100%; border-radius: 99px; transition: width 0.8s cubic-bezier(.22,.68,0,1.2); }

        .fab { position: fixed; bottom: 24px; right: 20px; width: 58px; height: 58px; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border-radius: 50%; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 24px rgba(99,102,241,0.55); z-index: 200; transition: transform 0.2s cubic-bezier(.22,.68,0,1.2), box-shadow 0.2s ease; }
        .fab:hover { transform: scale(1.12); box-shadow: 0 10px 32px rgba(99,102,241,0.65); }
        .fab:active { transform: scale(0.95); }

        @keyframes fadeSlideIn { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

        .fade-s1 { animation: fadeSlideIn 0.45s ease both; }
        .fade-s2 { animation: fadeSlideIn 0.45s 0.08s ease both; }
        .fade-s3 { animation: fadeSlideIn 0.45s 0.16s ease both; }
        .fade-s4 { animation: fadeSlideIn 0.45s 0.24s ease both; }

        .ai-shimmer { background: linear-gradient(90deg, var(--border) 25%, var(--border-strong) 50%, var(--border) 75%); background-size: 200% auto; animation: shimmer 1.4s infinite linear; border-radius: 8px; height: 14px; }

        /* ── Scrollbar ── */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: var(--scrollbar-bg); }
        ::-webkit-scrollbar-thumb { background: var(--scrollbar-thumb); border-radius: 99px; }

        @media (max-width: 639px) {
          .hero-card { border-radius: 18px !important; }
          .dash-card { border-radius: 16px !important; }
          .stat-card { border-radius: 14px !important; }
        }
      `}</style>

      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div style={{ maxWidth: 1320, margin: "0 auto", padding: pagePadding, position: "relative", zIndex: 1 }}>
        <div className="fade-s1" style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          marginBottom: isMobile ? 14 : 26,
          paddingLeft: isMobile ? 50 : 0,
        }}>
          <div>
            <h1 style={{
              fontFamily: "'Syne', sans-serif",
              fontSize: greetingFontSize,
              fontWeight: 800,
              color: "var(--text-primary)",
              marginBottom: 2,
              lineHeight: 1.2,
              letterSpacing: "-0.02em",
              transition: "color 0.3s ease",
            }}>
              {getGreeting()}, {user?.name?.split(" ")[0] || "User"} 👋
            </h1>
            {!isMobile && (
              <p style={{ color: "var(--text-secondary)", fontSize: 13.5, margin: 0, fontWeight: 500, transition: "color 0.3s" }}>
                Here's your financial overview for today
              </p>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, flexShrink: 0 }}>
            <ThemeToggleBtn />
            <NotificationBell />
            {!isMobile && (
              <button
                onClick={() => navigate("/add-expense")}
                style={{
                  display: "flex", alignItems: "center", gap: 7,
                  padding: "10px 20px",
                  background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                  color: "white", borderRadius: 13, border: "none", cursor: "pointer",
                  fontSize: 13.5, fontWeight: 700,
                  fontFamily: "'DM Sans', sans-serif",
                  boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                  transition: "all 0.2s",
                  whiteSpace: "nowrap",
                }}
                onMouseOver={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 20px rgba(99,102,241,0.5)"; }}
                onMouseOut={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 4px 14px rgba(99,102,241,0.35)"; }}
              >
                <Plus size={15} /> Add Expense
              </button>
            )}
          </div>
        </div>

        <div className="fade-s1" style={{ marginBottom: isMobile ? 14 : 22 }}>
          <SmartAdd onSuccess={fetchData} />
        </div>

        <div
          className="hero-card fade-s1"
          style={{
            padding: isMobile ? "20px 18px" : "28px 32px",
            marginBottom: isMobile ? 14 : 22,
            background: isDark
              ? "linear-gradient(135deg, #0f0c29 0%, #1a1060 45%, #0d2060 100%)"
              : "linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #1d4ed8 100%)",
            boxShadow: isDark
              ? "0 16px 60px rgba(99,102,241,0.3), inset 0 1px 0 rgba(255,255,255,0.08)"
              : "0 12px 40px rgba(30,27,75,0.35)",
          }}
        >
          <div style={{ position: "absolute", width: 340, height: 340, background: "rgba(99,102,241,0.2)", borderRadius: "50%", top: -100, right: -80, filter: "blur(60px)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", width: 220, height: 220, background: "rgba(59,130,246,0.15)", borderRadius: "50%", bottom: -70, left: "25%", filter: "blur(40px)", pointerEvents: "none" }} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: isMobile ? 14 : 22, position: "relative", zIndex: 1 }}>
            <div>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: isMobile ? 11 : 12.5, marginBottom: 6, fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Monthly Budget</p>
              <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: heroFontSize, fontWeight: 900, color: "white", letterSpacing: "-1.5px", lineHeight: 1, margin: 0 }}>
                ₹<AnimatedNumber value={budget} />
              </h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
              <span className="badge" style={{
                background: percentage >= 90 ? "rgba(239,68,68,0.25)" : percentage >= 70 ? "rgba(245,158,11,0.25)" : "rgba(255,255,255,0.12)",
                color: percentage >= 90 ? "#fca5a5" : percentage >= 70 ? "#fcd34d" : "rgba(255,255,255,0.9)",
                border: `1px solid ${percentage >= 90 ? "rgba(239,68,68,0.4)" : percentage >= 70 ? "rgba(245,158,11,0.4)" : "rgba(255,255,255,0.22)"}`,
              }}>
                {percentage >= 90 ? "🔴" : percentage >= 70 ? "🟡" : "🟢"} {percentage.toFixed(1)}% used
              </span>
              <button
                onClick={() => setOpenModal(true)}
                style={{ padding: "6px 14px", borderRadius: 99, fontSize: 12, fontWeight: 600, background: "rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.85)", border: "1px solid rgba(255,255,255,0.2)", cursor: "pointer", transition: "background 0.2s", backdropFilter: "blur(8px)" }}
                onMouseOver={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                onMouseOut={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
              >
                🎯 Set Budget
              </button>
            </div>
          </div>

          <div className="progress-track" style={{ marginBottom: 14, position: "relative", zIndex: 1 }}>
            <div className="progress-fill" style={{ width: `${percentage}%`, background: progressColor }} />
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", fontSize: isMobile ? 11.5 : 13, color: "rgba(255,255,255,0.55)", position: "relative", zIndex: 1, flexWrap: "wrap", gap: 4 }}>
            <span>Budget ₹{budget.toLocaleString("en-IN")}</span>
            <span style={{ color: "rgba(255,255,255,0.75)" }}>Spent ₹{totalExpenses.toLocaleString("en-IN")}</span>
            <span style={{ color: savings < 0 ? "#fca5a5" : "#6ee7b7", fontWeight: 700, fontSize: isMobile ? 12 : 13.5 }}>
              {savings < 0 ? `⚠️ Over by ₹${Math.abs(savings).toLocaleString("en-IN")}` : `✅ Saved ₹${savings.toLocaleString("en-IN")}`}
            </span>
          </div>
        </div>

        <div className="fade-s2" style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
          gap: isMobile ? 10 : 16,
          marginBottom: isMobile ? 14 : 22,
        }}>
          {loading
            ? [0, 1, 2].map((i) => (
              <SkeletonCard key={i} height={110} style={isMobile && i === 2 ? { gridColumn: "1 / -1" } : {}} />
            ))
            : statCards.map(({ id, icon, iconBg, label, value, prefix = "", suffix = "", decimals = 0, sub, subColor, spark, sparkColor }, i) => (
              <div key={id} className="stat-card" style={isMobile && i === 2 ? { gridColumn: "1 / -1" } : {}}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 34, height: 34, background: iconBg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {icon}
                    </div>
                    <p style={{ color: "var(--text-secondary)", fontSize: isMobile ? 11 : 12, fontWeight: 600, margin: 0, lineHeight: 1.3 }}>{label}</p>
                  </div>
                </div>
                <p style={{ fontFamily: "'Syne', sans-serif", fontSize: isMobile ? 20 : 24, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 3px", letterSpacing: "-0.5px" }}>
                  <AnimatedNumber value={value} prefix={prefix} suffix={suffix} decimals={decimals} />
                </p>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 4 }}>
                  <p style={{ fontSize: 11.5, color: subColor, margin: 0, fontWeight: 600 }}>{sub}</p>
                  {spark && <SparkBar data={spark} color={sparkColor} />}
                </div>
              </div>
            ))
          }
        </div>

        <div className="fade-s3" style={{
          display: "grid",
          gridTemplateColumns: isDesktop ? "1fr 340px" : "1fr",
          gap: isMobile ? 12 : 20,
        }}>

          <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 12 : 18 }}>

            <div className="dash-card" style={{ overflow: "hidden" }}>
              <div style={{ display: "flex", alignItems: "center", padding: isMobile ? "13px 16px" : "17px 22px", borderBottom: "1px solid var(--border)", gap: 10, flexWrap: "wrap" }}>
                <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #7c3aed, #6366f1)", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 10px rgba(124,58,237,0.3)" }}>
                  <Brain size={16} color="white" />
                </div>
                <div>
                  <p style={{ fontWeight: 700, color: "var(--text-primary)", fontSize: 14, margin: 0, lineHeight: 1.2 }}>AI Insights</p>
                  <p style={{ color: "var(--text-secondary)", fontSize: 11, margin: 0 }}>Powered by Groq · Llama 3.3</p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
                  <button onClick={() => fetchAI(true)} disabled={aiLoading} title="Refresh"
                    style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 6, borderRadius: 8, transition: "background 0.15s", display: "flex" }}
                    onMouseOver={e => e.currentTarget.style.background = "var(--border)"}
                    onMouseOut={e => e.currentTarget.style.background = "none"}
                  >
                    <RefreshCw size={14} style={{ animation: aiLoading ? "spin 1s linear infinite" : "none" }} />
                  </button>
                  <button onClick={() => navigate("/ai-insights")}
                    style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(124,58,237,0.12)", color: "#a78bfa", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 10, padding: "7px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", transition: "all 0.2s" }}
                    onMouseOver={e => { e.currentTarget.style.background = "rgba(124,58,237,0.22)"; e.currentTarget.style.transform = "translateY(-1px)"; }}
                    onMouseOut={e => { e.currentTarget.style.background = "rgba(124,58,237,0.12)"; e.currentTarget.style.transform = "translateY(0)"; }}
                  >
                    Full report <ChevronRight size={12} />
                  </button>
                </div>
              </div>

              <div style={{ padding: isMobile ? "14px 16px" : "18px 22px" }}>
                {aiLoading ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                      <div style={{ width: 18, height: 18, border: "2.5px solid rgba(124,58,237,0.3)", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite", flexShrink: 0 }} />
                      <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0 }}>Analyzing your spending patterns…</p>
                    </div>
                    <div className="ai-shimmer" style={{ width: "90%" }} />
                    <div className="ai-shimmer" style={{ width: "70%" }} />
                  </div>
                ) : aiError ? (
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 16px", background: "rgba(239,68,68,0.1)", borderRadius: 13, gap: 10, border: "1px solid rgba(239,68,68,0.25)" }}>
                    <div>
                      <p style={{ color: "#ef4444", fontSize: 13, margin: 0, fontWeight: 600 }}>Couldn't load AI insights</p>
                      <p style={{ color: "var(--text-secondary)", fontSize: 12, margin: "2px 0 0" }}>Check your connection and try again</p>
                    </div>
                    <button onClick={() => fetchAI(true)} style={{ color: "white", background: "#ef4444", border: "none", borderRadius: 8, padding: "7px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", flexShrink: 0, transition: "background 0.15s" }}
                      onMouseOver={e => e.currentTarget.style.background = "#dc2626"}
                      onMouseOut={e => e.currentTarget.style.background = "#ef4444"}
                    >Retry</button>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {aiInsights?.summary && (
                      <div className="insight-chip" style={{ background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)" }}>
                        <Sparkles size={15} color="#a78bfa" style={{ flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: 13, color: isDark ? "#c4b5fd" : "#5b21b6", lineHeight: 1.65, margin: 0 }}>{aiInsights.summary}</p>
                      </div>
                    )}
                    {quickAITip && (
                      <div className="insight-chip" style={{
                        background: quickAITip.type === "warning" ? "rgba(245,158,11,0.1)" : quickAITip.type === "success" ? "rgba(16,185,129,0.1)" : "rgba(59,130,246,0.1)",
                        border: `1px solid ${quickAITip.type === "warning" ? "rgba(245,158,11,0.25)" : quickAITip.type === "success" ? "rgba(16,185,129,0.25)" : "rgba(59,130,246,0.25)"}`,
                      }}>
                        <Lightbulb size={15} color={quickAITip.type === "warning" ? "#f59e0b" : quickAITip.type === "success" ? "#10b981" : "#3b82f6"} style={{ flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.65, margin: 0 }}>{quickAITip.message}</p>
                      </div>
                    )}
                    {topPrediction && (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "var(--bg-input)", borderRadius: 12, border: "1px solid var(--border)", flexWrap: "wrap", gap: 6 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <TrendingUp size={13} color="var(--text-muted)" />
                          <span style={{ fontSize: 12.5, color: "var(--text-secondary)" }}>Highest predicted next month:</span>
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                          {getCategoryIcon(topPrediction[0])} {topPrediction[0]} — ₹{topPrediction[1]?.toLocaleString("en-IN")}
                        </span>
                      </div>
                    )}
                    {!aiInsights && !aiLoading && !aiError && (
                      <div className="insight-chip" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                        <Lightbulb size={15} color="#10b981" style={{ flexShrink: 0, marginTop: 2 }} />
                        <p style={{ fontSize: 13, color: "var(--text-primary)", lineHeight: 1.65, margin: 0 }}>
                          {savings < 0 ? `You overspent ₹${Math.abs(savings).toLocaleString("en-IN")}. Try reducing discretionary spending.` : `You can save ₹${Math.floor(savings * 0.1).toLocaleString("en-IN")} more this month!`}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="dash-card" style={{ padding: isMobile ? "16px" : "20px 22px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="icon-badge" style={{ background: "rgba(59,130,246,0.12)" }}>
                    <Zap size={15} color="#3b82f6" />
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", margin: 0 }}>Recent Transactions</p>
                </div>
                <button onClick={() => navigate("/expenses")}
                  style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", cursor: "pointer", color: "#6366f1", fontSize: 13, fontWeight: 700, whiteSpace: "nowrap", transition: "gap 0.2s" }}
                  onMouseOver={e => e.currentTarget.style.gap = "7px"}
                  onMouseOut={e => e.currentTarget.style.gap = "4px"}
                >
                  View all <ArrowRight size={13} />
                </button>
              </div>

              {loading ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {[0, 1, 2, 3].map(i => <SkeletonCard key={i} height={54} />)}
                </div>
              ) : currentMonthExpenses.length === 0 ? (
                <div style={{ textAlign: "center", padding: "36px 0" }}>
                  <p style={{ fontSize: 44, marginBottom: 12 }}>🚀</p>
                  <p style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 500, marginBottom: 4 }}>No expenses yet this month</p>
                  <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 20 }}>Start tracking to see your insights</p>
                  <button onClick={() => navigate("/add-expense")}
                    style={{ padding: "11px 24px", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", border: "none", borderRadius: 12, fontSize: 13.5, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(99,102,241,0.35)", transition: "all 0.2s" }}
                    onMouseOver={e => e.currentTarget.style.transform = "translateY(-2px)"}
                    onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}
                  >
                    + Add First Expense
                  </button>
                </div>
              ) : (
                <div>
                  {currentMonthExpenses.slice(0, 6).map((exp, idx) => (
                    <div key={exp._id} className="tx-row" style={{ borderBottom: idx < Math.min(currentMonthExpenses.length, 6) - 1 ? "1px solid var(--border)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <div style={{ width: isMobile ? 38 : 42, height: isMobile ? 38 : 42, background: `${getCategoryColor(exp.category)}18`, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0, border: `1px solid ${getCategoryColor(exp.category)}30` }}>
                          {getCategoryIcon(exp.category)}
                        </div>
                        <div>
                          <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: isMobile ? 13 : 14, margin: 0 }}>{exp.category}</p>
                          <p style={{ color: "var(--text-secondary)", fontSize: 12, maxWidth: isMobile ? 130 : 240, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "1px 0 0" }}>
                            {exp.description || "No description"}
                          </p>
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0, marginLeft: "auto", paddingLeft: 8 }}>
                        <p style={{ fontWeight: 700, color: "#ef4444", fontSize: isMobile ? 13 : 14, margin: 0 }}>−₹{Number(exp.amount).toLocaleString("en-IN")}</p>
                        <p style={{ color: "var(--text-secondary)", fontSize: 11, margin: "2px 0 0" }}>
                          {exp.date ? new Date(exp.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" }) : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                  {currentMonthExpenses.length > 6 && (
                    <button onClick={() => navigate("/expenses")}
                      style={{ width: "100%", marginTop: 10, padding: "9px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 12, color: "#6366f1", fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "background 0.15s" }}
                      onMouseOver={e => e.currentTarget.style.background = "var(--accent-glow)"}
                      onMouseOut={e => e.currentTarget.style.background = "var(--bg-input)"}
                    >
                      +{currentMonthExpenses.length - 6} more transactions →
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: isMobile ? 12 : 16 }}>
            <div className="dash-card" style={{ padding: isMobile ? 16 : 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                <div className="icon-badge" style={{ background: "rgba(124,58,237,0.12)" }}>
                  <Target size={15} color="#7c3aed" />
                </div>
                <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", margin: 0 }}>Quick Actions</p>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: isDesktop ? "1fr" : "repeat(2, 1fr)", gap: 10 }}>
                <button className="action-btn" onClick={() => navigate("/add-expense")}
                  style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" }}>
                  <Plus size={16} /> Add Expense
                </button>
                <button className="action-btn" onClick={() => navigate("/ai-insights")}
                  style={{ background: "linear-gradient(135deg, #7c3aed, #db2777)", color: "white", boxShadow: "0 4px 16px rgba(124,58,237,0.3)" }}>
                  <Brain size={15} /> AI Insights
                </button>
                <button className="action-btn action-btn-ghost" onClick={() => setOpenModal(true)}>🎯 Set Budget</button>
                <button className="action-btn action-btn-ghost" onClick={() => navigate("/reports")}>📊 Reports</button>
              </div>
              <BudgetModal isOpen={openModal} onClose={() => setOpenModal(false)} onSuccess={fetchData} />
            </div>

            {aiInsights?.predictions && !aiLoading && !aiError && (
              <div className="dash-card fade-s4" style={{ padding: isMobile ? 16 : 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 16 }}>
                  <div className="icon-badge" style={{ background: "rgba(124,58,237,0.12)" }}>
                    <TrendingUp size={15} color="#7c3aed" />
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 14.5, color: "var(--text-primary)", margin: 0 }}>Next Month Forecast</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 13 }}>
                  {Object.entries(aiInsights.predictions)
                    .filter(([, val]) => val !== null && val > 0)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([category, amount]) => {
                      const max = Math.max(...Object.values(aiInsights.predictions).filter((v) => v > 0));
                      const pct = Math.round((amount / max) * 100);
                      return (
                        <div key={category}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                              <span style={{ fontSize: 15 }}>{getCategoryIcon(category)}</span>
                              <span style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600 }}>{category}</span>
                            </div>
                            <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)" }}>₹{amount?.toLocaleString("en-IN")}</span>
                          </div>
                          <div className="forecast-bar">
                            <div className="forecast-fill" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${getCategoryColor(category)}, ${getCategoryColor(category)}bb)` }} />
                          </div>
                        </div>
                      );
                    })}
                </div>
                <button onClick={() => navigate("/ai-insights")}
                  style={{ width: "100%", marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 5, background: "none", border: "none", color: "#a78bfa", fontSize: 12.5, fontWeight: 700, cursor: "pointer", transition: "gap 0.2s" }}
                  onMouseOver={e => e.currentTarget.style.gap = "8px"}
                  onMouseOut={e => e.currentTarget.style.gap = "5px"}
                >
                  See full analysis <ChevronRight size={13} />
                </button>
              </div>
            )}

            {currentMonthExpenses.length > 0 && (
              <div className="dash-card" style={{ padding: isMobile ? 16 : 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 14 }}>
                  <div className="icon-badge" style={{ background: "rgba(59,130,246,0.12)" }}>
                    <BarChart3 size={15} color="#3b82f6" />
                  </div>
                  <p style={{ fontWeight: 700, fontSize: 14.5, color: "var(--text-primary)", margin: 0 }}>Spending by Category</p>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {Object.entries(
                    currentMonthExpenses.reduce((acc, exp) => { acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount); return acc; }, {})
                  )
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([cat, amt]) => {
                      const pct = totalExpenses > 0 ? Math.round((amt / totalExpenses) * 100) : 0;
                      return (
                        <div key={cat} className="category-row">
                          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                            <span style={{ fontSize: 15 }}>{getCategoryIcon(cat)}</span>
                            <div>
                              <p style={{ fontSize: 13, color: "var(--text-primary)", fontWeight: 600, margin: 0 }}>{cat}</p>
                              <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>{pct}% of total</p>
                            </div>
                          </div>
                          <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", marginLeft: "auto" }}>
                            ₹{amt.toLocaleString("en-IN")}
                          </span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {isMobile && <div style={{ height: 90 }} />}
      </div>

      {isMobile && (
        <button className="fab" onClick={() => navigate("/add-expense")}>
          <Plus size={26} />
        </button>
      )}
    </div>
  );
}

export default Dashboard;