import { useEffect, useState } from "react";
import API from "../../../api";
import {
  PieChart, Pie, Cell, Tooltip, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, ResponsiveContainer,
  AreaChart, Area,
} from "recharts";
import {
  TrendingUp, TrendingDown, BarChart2, PieChart as PieIcon,
  Calendar, Lightbulb, ArrowUp, ArrowDown,
  ChevronLeft, ChevronRight, Sparkles, Wallet,
} from "lucide-react";

/* ─── Constants ─────────────────────────────────────────────────────────── */
const CATEGORY_COLORS = {
  "Food & Dining": "#f97316",
  "Transportation": "#38bdf8",
  "Bills & Utilities": "#f87171",
  "Shopping": "#f472b6",
  "Entertainment": "#a78bfa",
  "Healthcare": "#34d399",
  "Education": "#fbbf24",
  "Other": "#818cf8",
  "Food": "#f97316",
  "Transport": "#38bdf8",
  "Bills": "#f87171",
  "Health": "#34d399",
};
const FALLBACK = ["#818cf8", "#34d399", "#f97316", "#f87171", "#a78bfa", "#38bdf8", "#f472b6"];
const getCatColor = (name, idx) => CATEGORY_COLORS[name] || FALLBACK[idx % FALLBACK.length];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/* ─── Breakpoint hook ───────────────────────────────────────────────────── */
function useBreakpoint() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return { isMobile: w < 640, isTablet: w >= 640 && w < 1024 };
}

/* ─── Custom Tooltip ────────────────────────────────────────────────────── */
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "var(--bg-secondary)",
      border: "1px solid var(--border-strong)",
      borderRadius: 14, padding: "10px 16px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
      fontSize: 13, backdropFilter: "blur(12px)",
    }}>
      <p style={{ fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>{label || payload[0]?.name}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || "var(--accent)", margin: "2px 0", fontWeight: 700 }}>
          ₹{Number(p.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

/* ─── Pie % label ────────────────────────────────────────────────────────── */
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const R = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  return (
    <text
      x={cx + r * Math.cos(-midAngle * R)}
      y={cy + r * Math.sin(-midAngle * R)}
      fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={11} fontWeight={800}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

/* ─── MAIN COMPONENT ─────────────────────────────────────────────────────── */
export default function Reports() {
  const [allExpenses, setAllExpenses] = useState([]);
  const now = new Date();

  const [budget, setBudget] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("overview");
  const [groqInsights, setGroqInsights] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerYear, setPickerYear] = useState(now.getFullYear());
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth());

  const { isMobile, isTablet } = useBreakpoint();

  useEffect(() => {
    (async () => {
      try {
        const [expRes, budRes] = await Promise.all([API.get("/expenses"), API.get("/budget")]);
        setAllExpenses(expRes.data || []);
        setBudget(budRes.data?.monthlyBudget || budRes.data?.amount || 0);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      setAiLoading(true);
      try {
        const res = await API.get("/ai/insights", {
          params: { month: selectedMonth, year: selectedYear },
        });
        if (Array.isArray(res.data?.recommendations)) {
          setGroqInsights(res.data.recommendations);
        }
      } catch { }
      finally { setAiLoading(false); }
    })();
  }, [selectedMonth, selectedYear]);

  const goToPrev = () => {
    if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
    else setSelectedMonth(m => m - 1);
  };
  const goToNext = () => {
    if (selectedYear === now.getFullYear() && selectedMonth === now.getMonth()) return;
    if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
    else setSelectedMonth(m => m + 1);
  };
  const isCurrent = selectedYear === now.getFullYear() && selectedMonth === now.getMonth();

  const expenses = allExpenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
  });

  const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  const prevExp = allExpenses.filter(e => {
    const d = new Date(e.date);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });

  const total = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const prevTotal = prevExp.reduce((s, e) => s + Number(e.amount), 0);
  const savings = Math.max(0, budget - total);
  const savePct = budget > 0 ? ((savings / budget) * 100).toFixed(1) : 0;
  const spendPct = budget > 0 ? Math.min(100, ((total / budget) * 100)).toFixed(1) : 0;
  const monthTrend = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;

  const categoryData = Object.values(
    expenses.reduce((acc, e) => {
      if (!acc[e.category]) acc[e.category] = { name: e.category, value: 0 };
      acc[e.category].value += Number(e.amount);
      return acc;
    }, {})
  ).sort((a, b) => b.value - a.value);

  const prevCatMap = prevExp.reduce((acc, e) => {
    acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
    return acc;
  }, {});

  const topCat = categoryData[0];

  const monthlyMap = {};
  allExpenses.forEach(e => {
    const d = new Date(e.date);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!monthlyMap[key]) monthlyMap[key] = { name: MONTHS[d.getMonth()], amount: 0, index: d.getMonth() + d.getFullYear() * 12 };
    monthlyMap[key].amount += Number(e.amount);
  });
  const monthlyData = Object.values(monthlyMap).sort((a, b) => a.index - b.index);

  const dailyMap = {};
  expenses.forEach(e => {
    const day = new Date(e.date).getDate();
    dailyMap[day] = (dailyMap[day] || 0) + Number(e.amount);
  });
  const dailyData = Object.entries(dailyMap)
    .map(([d, amt]) => ({ day: `${d}`, amount: amt }))
    .sort((a, b) => Number(a.day) - Number(b.day));

  const allMonths = [...new Set(allExpenses.map(e => {
    const d = new Date(e.date);
    return `${d.getFullYear()}-${d.getMonth()}`;
  }))].map(k => {
    const [y, m] = k.split("-").map(Number);
    return { year: y, month: m, label: `${MONTHS[m]} ${y}` };
  }).sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month));

  /* ── Loading ── */
  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-primary)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: 48, height: 48, margin: "0 auto 16px",
          border: "3px solid var(--border)",
          borderTop: "3px solid var(--accent)",
          borderRadius: "50%", animation: "spin 0.8s linear infinite",
        }} />
        <p style={{ color: "var(--text-muted)", fontFamily: "'Figtree',sans-serif", fontSize: 14 }}>Loading your reports…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  /* ── STYLES ── */
  const CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@500;700;800&family=Figtree:wght@400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
    @keyframes glow{0%,100%{opacity:0.5}50%{opacity:1}}
    .fade {animation:fadeUp 0.45s cubic-bezier(.22,.68,0,1.2) forwards}
    .fade1{animation:fadeUp 0.45s 0.05s cubic-bezier(.22,.68,0,1.2) both}
    .fade2{animation:fadeUp 0.45s 0.1s  cubic-bezier(.22,.68,0,1.2) both}
    .fade3{animation:fadeUp 0.45s 0.15s cubic-bezier(.22,.68,0,1.2) both}
    .fade4{animation:fadeUp 0.45s 0.2s  cubic-bezier(.22,.68,0,1.2) both}

    .glass{
      background:var(--bg-card);
      border:1px solid var(--border);
      border-radius:20px;
      backdrop-filter:blur(12px);
    }
    .glass-strong{
      background:var(--bg-card);
      border:1px solid var(--border-strong);
      border-radius:20px;
      backdrop-filter:blur(16px);
    }

    .stat-card{
      background:var(--stat-bg);
      border:1px solid var(--stat-border);
      border-radius:20px;
      padding:20px;
      transition:all 0.25s ease;
      cursor:default;
      position:relative;
      overflow:hidden;
    }
    .stat-card::before{
      content:'';position:absolute;inset:0;
      background:linear-gradient(135deg,rgba(99,102,241,0.06),transparent);
      opacity:0;transition:opacity 0.25s;
    }
    .stat-card:hover::before{opacity:1}
    .stat-card:hover{
      border-color:var(--border-strong);
      transform:translateY(-3px);
      box-shadow:0 12px 40px rgba(0,0,0,0.2), 0 0 0 1px var(--border-strong);
    }

    .tab-btn{
      padding:8px 16px;border-radius:10px;font-size:12px;font-weight:700;
      border:none;cursor:pointer;transition:all 0.2s;
      font-family:'Figtree',sans-serif;white-space:nowrap;letter-spacing:0.02em;
    }
    .tab-active{
      background:linear-gradient(135deg,#6366f1,#8b5cf6);
      color:white;box-shadow:0 4px 16px rgba(99,102,241,0.4);
    }
    .tab-inactive{background:transparent;color:var(--text-muted)}
    .tab-inactive:hover{color:var(--text-secondary);background:var(--bg-input)}

    .nav-btn{
      width:32px;height:32px;border-radius:9px;
      border:1px solid var(--border);
      background:var(--bg-input);
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;transition:all 0.2s;color:var(--text-secondary);flex-shrink:0;
    }
    .nav-btn:hover:not(:disabled){
      border-color:var(--accent);color:var(--accent);
      background:var(--accent-glow);
      box-shadow:0 0 12px var(--accent-glow);
    }
    .nav-btn:disabled{opacity:0.25;cursor:not-allowed}

    .month-pill{
      padding:6px 14px;border-radius:99px;font-size:12px;font-weight:700;
      border:1px solid var(--border);cursor:pointer;
      transition:all 0.2s;font-family:'Figtree',sans-serif;white-space:nowrap;
      background:var(--bg-input);color:var(--text-muted);
    }
    .month-pill:hover{border-color:var(--border-strong);color:var(--text-secondary)}

    .cat-row{
      padding:14px 16px;
      background:var(--bg-input);
      border:1px solid var(--border);
      border-radius:14px;
      transition:all 0.2s;
    }
    .cat-row:hover{
      background:var(--hover-row);
      border-color:var(--border-strong);
    }

    .month-mini-card{
      border-radius:16px;padding:16px;
      cursor:pointer;transition:all 0.2s;
    }
    .month-mini-card:hover{transform:translateY(-2px)}

    .cal-icon-btn{
      width:30px;height:30px;border-radius:8px;
      border:1px solid var(--border-strong);
      background:var(--accent-glow);
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;transition:all 0.2s;flex-shrink:0;
    }
    .cal-icon-btn:hover{
      background:var(--accent-glow);
      border-color:var(--accent);
      box-shadow:0 0 12px var(--accent-glow);
    }
    .picker-dropdown{
      position:absolute;top:calc(100% + 10px);left:0;z-index:999;
      background:var(--bg-secondary);
      border:1px solid var(--border-strong);
      border-radius:18px;padding:18px;
      box-shadow:0 20px 60px rgba(0,0,0,0.4);
      backdrop-filter:blur(20px);
      min-width:260px;
      animation:fadeUp 0.2s ease forwards;
    }
    .picker-month-btn{
      padding:7px 6px;border-radius:9px;font-size:12px;font-weight:700;
      border:1px solid transparent;cursor:pointer;transition:all 0.15s;
      font-family:'Figtree',sans-serif;text-align:center;
      background:transparent;color:var(--text-muted);
    }
    .picker-month-btn:hover{background:var(--hover-row);color:var(--text-secondary)}
    .picker-month-btn.pm-active{
      background:linear-gradient(135deg,#6366f1,#8b5cf6);
      color:white;border-color:transparent;
      box-shadow:0 4px 12px rgba(99,102,241,0.4);
    }
    .picker-month-btn.pm-future{opacity:0.25;cursor:not-allowed;pointer-events:none}
    .picker-year-btn{
      width:28px;height:28px;border-radius:8px;
      border:1px solid var(--border);
      background:var(--bg-input);
      display:flex;align-items:center;justify-content:center;
      cursor:pointer;transition:all 0.2s;color:var(--text-secondary);
    }
    .picker-year-btn:hover{border-color:var(--accent);color:var(--accent);background:var(--hover-row)}
    .picker-year-btn:disabled{opacity:0.25;cursor:not-allowed}

    .recharts-cartesian-grid-horizontal line,
    .recharts-cartesian-grid-vertical line{stroke:var(--border)!important}
    .recharts-text{fill:var(--text-muted)!important;font-family:'Figtree',sans-serif!important}
  `;

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", fontFamily: "'Figtree',sans-serif", position: "relative", overflow: "hidden" }}>
      <style>{CSS}</style>

      {/* Ambient background blobs — subtle, theme-aware opacity */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-20%", left: "-10%", width: "60%", height: "60%", background: "radial-gradient(ellipse,var(--accent-glow),transparent 65%)" }} />
        <div style={{ position: "absolute", bottom: "-15%", right: "-10%", width: "55%", height: "55%", background: "radial-gradient(ellipse,rgba(139,92,246,0.08),transparent 65%)" }} />
        <div style={{ position: "absolute", top: "45%", left: "30%", width: "40%", height: "40%", background: "radial-gradient(ellipse,rgba(56,189,248,0.04),transparent 65%)" }} />
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: isMobile ? "16px 14px 40px" : "28px 24px 40px", position: "relative", zIndex: 1 }}>

        {/* ─── HEADER ─────────────────────────────────────────────────────── */}
        <div className="fade" style={{
          display: "flex", alignItems: isMobile ? "flex-start" : "center",
          justifyContent: "space-between",
          flexDirection: isMobile ? "column" : "row",
          gap: 14, marginBottom: 24,
          paddingLeft: isMobile ? 52 : 0,
        }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 36, height: 36,
                background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                borderRadius: 11,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
              }}>
                <BarChart2 size={17} color="white" />
              </div>
              <h1 style={{
                fontFamily: "'Bricolage Grotesque',sans-serif",
                fontSize: isMobile ? 22 : 28,
                fontWeight: 800, color: "var(--text-primary)", letterSpacing: "-0.02em",
              }}>
                Financial Reports
              </h1>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginLeft: isMobile ? 0 : 46 }}>
              Month-by-month spending analysis
            </p>
          </div>

          {/* Tabs */}
          <div style={{
            display: "flex", gap: 3,
            background: "var(--bg-input)",
            border: "1px solid var(--border)",
            padding: 4, borderRadius: 13, flexShrink: 0,
          }}>
            {["overview", "trends", "categories"].map(tab => (
              <button key={tab}
                className={`tab-btn ${activeTab === tab ? "tab-active" : "tab-inactive"}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* ─── MONTH NAVIGATOR ─────────────────────────────────────────────── */}
        <div className="fade1" style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{
              display: "flex", alignItems: "center", gap: 10,
              background: "var(--bg-card)",
              border: "1px solid var(--border)",
              borderRadius: 15, padding: "10px 16px",
              position: "relative",
            }}>
              <button
                className="cal-icon-btn"
                onClick={() => { setShowPicker(p => !p); setPickerYear(selectedYear); }}
                title="Open month picker"
              >
                <Calendar size={14} color="var(--accent)" />
              </button>

              {showPicker && (
                <>
                  <div style={{ position: "fixed", inset: 0, zIndex: 998 }} onClick={() => setShowPicker(false)} />
                  <div className="picker-dropdown">
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <button className="picker-year-btn" onClick={() => setPickerYear(y => y - 1)}><ChevronLeft size={13} /></button>
                      <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 15, fontWeight: 800, color: "var(--text-primary)" }}>
                        {pickerYear}
                      </span>
                      <button className="picker-year-btn" disabled={pickerYear >= now.getFullYear()} onClick={() => setPickerYear(y => y + 1)}><ChevronRight size={13} /></button>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5 }}>
                      {MONTHS.map((m, idx) => {
                        const isFuture = pickerYear === now.getFullYear() && idx > now.getMonth();
                        const isActive = pickerYear === selectedYear && idx === selectedMonth;
                        return (
                          <button
                            key={m}
                            className={`picker-month-btn${isActive ? " pm-active" : ""}${isFuture ? " pm-future" : ""}`}
                            onClick={() => {
                              if (isFuture) return;
                              setSelectedYear(pickerYear);
                              setSelectedMonth(idx);
                              setShowPicker(false);
                            }}
                          >
                            {m}
                          </button>
                        );
                      })}
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 12 }}>
                      Select any month to jump to it
                    </p>
                  </div>
                </>
              )}

              <button className="nav-btn" onClick={goToPrev}><ChevronLeft size={14} /></button>
              <div style={{ textAlign: "center", minWidth: isMobile ? 108 : 128 }}>
                <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: isMobile ? 15 : 17, fontWeight: 700, color: "var(--text-primary)" }}>
                  {MONTHS[selectedMonth]} {selectedYear}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                  {isCurrent ? "Current month" : (
                    prevTotal > 0
                      ? <span>vs {MONTHS[prevMonth]}:{" "}
                        <strong style={{ color: monthTrend > 0 ? "#f87171" : "#34d399" }}>
                          {monthTrend > 0 ? `+${monthTrend}` : monthTrend}%
                        </strong>
                      </span>
                      : "No comparison"
                  )}
                </p>
              </div>
              <button className="nav-btn" onClick={goToNext} disabled={isCurrent}><ChevronRight size={14} /></button>
            </div>

            {!isMobile && allMonths.slice(0, 6).map(({ year, month, label }) => {
              const isSelected = year === selectedYear && month === selectedMonth;
              return (
                <button key={label} className="month-pill"
                  onClick={() => { setSelectedYear(year); setSelectedMonth(month); }}
                  style={isSelected ? {
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    color: "white", border: "none",
                    boxShadow: "0 4px 16px rgba(99,102,241,0.35)",
                  } : {}}
                >
                  {MONTHS[month]}
                </button>
              );
            })}
          </div>
        </div>

        {/* ─── STAT CARDS ──────────────────────────────────────────────────── */}
        <div className="fade2" style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : isTablet ? "repeat(2,1fr)" : "repeat(4,1fr)",
          gap: isMobile ? 10 : 14,
          marginBottom: 22,
        }}>
          {[
            {
              icon: <BarChart2 size={16} color="#818cf8" />, glow: "#6366f1",
              label: "Total Spent", value: `₹${total.toLocaleString()}`,
              sub: `${expenses.length} transactions`,
              badge: prevTotal > 0 ? { val: monthTrend, positive: monthTrend > 0 } : null,
            },
            {
              icon: <Wallet size={16} color="#34d399" />, glow: "#10b981",
              label: "Budget Remaining",
              value: budget > 0 ? `₹${Math.max(0, budget - total).toLocaleString()}` : "—",
              sub: budget > 0
                ? total <= budget
                  ? `${(100 - Number(spendPct)).toFixed(1)}% of ₹${budget.toLocaleString()} left`
                  : `Over by ₹${(total - budget).toLocaleString()}`
                : "Set a budget first",
            },
            {
              icon: <TrendingUp size={16} color="#fbbf24" />, glow: "#f59e0b",
              label: "vs Last Month", value: prevTotal > 0 ? `₹${prevTotal.toLocaleString()}` : "—",
              sub: `${MONTHS[prevMonth]} ${prevYear}`,
            },
            {
              icon: <PieIcon size={16} color="#a78bfa" />, glow: "#8b5cf6",
              label: "Top Category", value: topCat?.name || "—",
              sub: topCat ? `₹${topCat.value.toLocaleString()}` : "No data",
            },
          ].map(({ icon, glow, label, value, sub, badge }) => (
            <div key={label} className="stat-card">
              <div style={{
                position: "absolute", top: 14, right: 14,
                width: 6, height: 6, borderRadius: "50%",
                background: glow, boxShadow: `0 0 8px ${glow}`,
                animation: "glow 2s ease-in-out infinite",
              }} />

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{
                    width: 32, height: 32,
                    background: `${glow}18`,
                    border: `1px solid ${glow}30`,
                    borderRadius: 10,
                    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                  }}>
                    {icon}
                  </div>
                  <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</p>
                </div>
                {badge && (
                  <span style={{
                    display: "flex", alignItems: "center", gap: 3,
                    fontSize: 10, fontWeight: 800,
                    color: badge.positive ? "#f87171" : "#34d399",
                    background: badge.positive ? "rgba(248,113,113,0.12)" : "rgba(52,211,153,0.12)",
                    border: `1px solid ${badge.positive ? "rgba(248,113,113,0.25)" : "rgba(52,211,153,0.25)"}`,
                    padding: "2px 8px", borderRadius: 99,
                  }}>
                    {badge.positive ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
                    {Math.abs(badge.val)}%
                  </span>
                )}
              </div>

              <p style={{
                fontFamily: "'Bricolage Grotesque',sans-serif",
                fontSize: isMobile ? 17 : 22,
                fontWeight: 800, color: "var(--text-primary)",
                marginBottom: 4,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{value}</p>
              <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>{sub}</p>
            </div>
          ))}
        </div>

        {/* ═══════════ OVERVIEW TAB ═══════════ */}
        {activeTab === "overview" && (
          <div className="fade">

            {budget > 0 && (
              <div className="glass" style={{ padding: 22, marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
                      Budget Progress — {MONTHS[selectedMonth]}
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Monthly budget set via Set Budget</p>
                  </div>
                  <span style={{
                    fontSize: 13, fontWeight: 800,
                    color: total > budget ? "#f87171" : "var(--accent)",
                    background: total > budget ? "rgba(248,113,113,0.12)" : "var(--accent-glow)",
                    border: `1px solid ${total > budget ? "rgba(248,113,113,0.2)" : "var(--border-strong)"}`,
                    padding: "5px 14px", borderRadius: 99,
                  }}>
                    {spendPct}% used
                  </span>
                </div>

                <div style={{ height: 10, background: "var(--bg-input)", borderRadius: 99, overflow: "hidden", marginBottom: 12, position: "relative" }}>
                  <div style={{
                    height: "100%", width: `${spendPct}%`, borderRadius: 99,
                    transition: "width 1s cubic-bezier(.22,.68,0,1.2)",
                    background: total > budget
                      ? "linear-gradient(90deg,#f87171,#f97316)"
                      : Number(spendPct) > 70
                        ? "linear-gradient(90deg,#fbbf24,#f97316)"
                        : "linear-gradient(90deg,#6366f1,#8b5cf6,#a78bfa)",
                    boxShadow: total > budget ? "0 0 12px rgba(248,113,113,0.5)" : "0 0 12px rgba(129,140,248,0.5)",
                    position: "relative",
                  }}>
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.2),transparent)", borderRadius: 99 }} />
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", fontSize: isMobile ? 11 : 13, flexWrap: "wrap", gap: 6 }}>
                  <span style={{ color: "var(--text-muted)" }}>Spent: <strong style={{ color: "#f87171" }}>₹{total.toLocaleString()}</strong></span>
                  <span style={{ color: "var(--text-muted)" }}>Budget: <strong style={{ color: "var(--text-primary)" }}>₹{budget.toLocaleString()}</strong></span>
                  <span style={{ fontWeight: 700, color: total <= budget ? "#34d399" : "#f87171" }}>
                    {total <= budget
                      ? `Remaining: ₹${(budget - total).toLocaleString()}`
                      : `Over: ₹${(total - budget).toLocaleString()}`}
                  </span>
                </div>
              </div>
            )}

            {/* Monthly mini cards */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "repeat(auto-fill,minmax(155px,1fr))", gap: 10, marginBottom: 16 }}>
              {monthlyData.slice(-6).reverse().map(m => {
                const isActive = m.name === MONTHS[selectedMonth];
                return (
                  <div key={m.name} className="month-mini-card"
                    onClick={() => {
                      const entry = Object.values(monthlyMap).find(x => x.name === m.name);
                      if (entry) { setSelectedMonth(entry.index % 12); setSelectedYear(Math.floor(entry.index / 12)); }
                    }}
                    style={{
                      background: isActive
                        ? "linear-gradient(135deg,#6366f1,#8b5cf6)"
                        : "var(--bg-card)",
                      border: isActive ? "none" : "1px solid var(--border)",
                      boxShadow: isActive ? "0 8px 24px rgba(99,102,241,0.35)" : "none",
                    }}>
                    <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: isActive ? "rgba(255,255,255,0.6)" : "var(--text-muted)", marginBottom: 6 }}>{m.name}</p>
                    <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: 18, fontWeight: 800, color: isActive ? "white" : "var(--text-primary)", marginBottom: 3 }}>₹{m.amount.toLocaleString()}</p>
                    <p style={{ fontSize: 11, color: isActive ? "rgba(255,255,255,0.45)" : "var(--text-muted)" }}>
                      {allExpenses.filter(e => MONTHS[new Date(e.date).getMonth()] === m.name).length} txns
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Charts row */}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 16, marginBottom: 16 }}>

              {/* PIE */}
              <div className="glass" style={{ padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <div style={{ width: 34, height: 34, background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.25)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <PieIcon size={15} color="#a78bfa" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Category Breakdown</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 11 }}>{MONTHS[selectedMonth]} {selectedYear}</p>
                  </div>
                </div>

                {categoryData.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "36px 0", color: "var(--text-muted)", fontSize: 13 }}>No data for this month</div>
                ) : isMobile ? (
                  <div>
                    <ResponsiveContainer width="100%" height={180}>
                      <PieChart>
                        <Pie data={categoryData} dataKey="value" innerRadius={50} outerRadius={80} label={renderPieLabel} labelLine={false}>
                          {categoryData.map((e, i) => <Cell key={i} fill={getCatColor(e.name, i)} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 14 }}>
                      {categoryData.map((cat, i) => (
                        <div key={cat.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: getCatColor(cat.name, i), flexShrink: 0, boxShadow: `0 0 6px ${getCatColor(cat.name, i)}` }} />
                            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{cat.name}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>₹{cat.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
                    <ResponsiveContainer width="55%" height={200}>
                      <PieChart>
                        <Pie data={categoryData} dataKey="value" innerRadius={52} outerRadius={85} label={renderPieLabel} labelLine={false}>
                          {categoryData.map((e, i) => <Cell key={i} fill={getCatColor(e.name, i)} />)}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                      {categoryData.map((cat, i) => (
                        <div key={cat.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <div style={{ width: 8, height: 8, borderRadius: "50%", background: getCatColor(cat.name, i), flexShrink: 0, boxShadow: `0 0 6px ${getCatColor(cat.name, i)}` }} />
                            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{cat.name}</span>
                          </div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>₹{cat.value.toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* BAR */}
              <div className="glass" style={{ padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <div style={{ width: 34, height: 34, background: "rgba(56,189,248,0.12)", border: "1px solid rgba(56,189,248,0.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <BarChart2 size={15} color="#38bdf8" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Monthly Overview</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 11 }}>All months at a glance</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={isMobile ? 160 : 200}>
                  <BarChart data={monthlyData} barSize={isMobile ? 18 : 26}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} width={isMobile ? 46 : 56} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                      {monthlyData.map((m, i) => (
                        <Cell key={i} fill={m.name === MONTHS[selectedMonth] ? "#818cf8" : "rgba(129,140,248,0.2)"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === "trends" && (
          <div className="fade" style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 16 }}>
            <div className="glass" style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                <div style={{ width: 34, height: 34, background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TrendingUp size={15} color="#818cf8" />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Spending Trend</p>
                  <p style={{ color: "var(--text-muted)", fontSize: 11 }}>Monthly spending over time</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={isMobile ? 180 : 250}>
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="name" tick={{ fill: "var(--text-muted)", fontSize: isMobile ? 10 : 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} width={isMobile ? 46 : 56} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type="monotone" dataKey="amount" stroke="#818cf8" strokeWidth={2.5} fill="url(#areaGrad)"
                    dot={{ fill: "#818cf8", r: 4, strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#818cf8", stroke: "rgba(129,140,248,0.3)", strokeWidth: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {dailyData.length > 0 && (
              <div className="glass" style={{ padding: 22 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
                  <div style={{ width: 34, height: 34, background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.2)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Calendar size={15} color="#fbbf24" />
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Daily Spending — {MONTHS[selectedMonth]}</p>
                    <p style={{ color: "var(--text-muted)", fontSize: 11 }}>Day-by-day breakdown</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={isMobile ? 150 : 190}>
                  <BarChart data={dailyData} barSize={isMobile ? 9 : 14}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="day" tick={{ fill: "var(--text-muted)", fontSize: isMobile ? 9 : 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} width={isMobile ? 46 : 56} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="amount" fill="#fbbf24" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}

        {activeTab === "categories" && (
          <div className="fade" style={{ marginBottom: 16 }}>
            <div className="glass" style={{ padding: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 6 }}>
                <p style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
                  Categories — {MONTHS[selectedMonth]} {selectedYear}
                </p>
                <span style={{ fontSize: 11, color: "var(--text-muted)", background: "var(--bg-input)", padding: "4px 10px", borderRadius: 99, border: "1px solid var(--border)" }}>
                  {categoryData.length} categories · ₹{total.toLocaleString()} total
                </span>
              </div>
              <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 18 }}>Month-over-month change shown per category</p>

              {categoryData.length === 0 ? (
                <div style={{ textAlign: "center", padding: "44px 0" }}>
                  <p style={{ fontSize: 36, marginBottom: 12 }}>📊</p>
                  <p style={{ color: "var(--text-muted)", fontSize: 14 }}>No expenses for {MONTHS[selectedMonth]} {selectedYear}</p>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {categoryData.map((cat, i) => {
                    const pct = Math.round((cat.value / (total || 1)) * 100);
                    const color = getCatColor(cat.name, i);
                    const prevAmt = prevCatMap[cat.name] || 0;
                    const vsChange = prevAmt > 0 ? Math.round(((cat.value - prevAmt) / prevAmt) * 100) : null;

                    return (
                      <div key={cat.name} className="cat-row">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 9, flexWrap: "wrap", gap: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color, flexShrink: 0, boxShadow: `0 0 8px ${color}` }} />
                            <span style={{ fontWeight: 700, fontSize: isMobile ? 13 : 14, color: "var(--text-primary)" }}>{cat.name}</span>
                            {vsChange !== null && (
                              <span style={{
                                fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 99,
                                background: vsChange > 0 ? "rgba(248,113,113,0.12)" : "rgba(52,211,153,0.12)",
                                border: `1px solid ${vsChange > 0 ? "rgba(248,113,113,0.2)" : "rgba(52,211,153,0.2)"}`,
                                color: vsChange > 0 ? "#f87171" : "#34d399",
                                display: "flex", alignItems: "center", gap: 2,
                              }}>
                                {vsChange > 0 ? <ArrowUp size={9} /> : <ArrowDown size={9} />}
                                {Math.abs(vsChange)}% vs {MONTHS[prevMonth]}
                              </span>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{
                              fontSize: 11, fontWeight: 800,
                              color, background: `${color}18`,
                              border: `1px solid ${color}30`,
                              padding: "3px 9px", borderRadius: 99,
                            }}>{pct}%</span>
                            <span style={{ fontFamily: "'Bricolage Grotesque',sans-serif", fontSize: isMobile ? 14 : 17, fontWeight: 800, color: "var(--text-primary)" }}>
                              ₹{cat.value.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        {prevAmt > 0 && (
                          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 7 }}>
                            {MONTHS[prevMonth]}: ₹{prevAmt.toLocaleString()}
                          </p>
                        )}
                        <div style={{ height: 5, background: "var(--bg-input)", borderRadius: 99, overflow: "hidden" }}>
                          <div style={{
                            height: "100%", width: `${pct}%`,
                            background: `linear-gradient(90deg,${color},${color}aa)`,
                            borderRadius: 99,
                            transition: "width 0.9s cubic-bezier(.22,.68,0,1.2)",
                            boxShadow: `0 0 8px ${color}60`,
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="glass-strong fade4" style={{ padding: 22, marginBottom: isMobile ? 32 : 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div style={{
              width: 36, height: 36,
              background: "linear-gradient(135deg,#6366f1,#a78bfa)",
              borderRadius: 11,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              boxShadow: "0 4px 16px rgba(99,102,241,0.4)",
            }}>
              <Sparkles size={16} color="white" />
            </div>
            <div>
              <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Smart Insights</p>
              <p style={{ color: "var(--text-muted)", fontSize: 11 }}>Live analysis via Groq · Llama 3.3</p>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {aiLoading ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0" }}>
                <div style={{ width: 14, height: 14, border: "2px solid var(--border)", borderTop: "2px solid var(--accent)", borderRadius: "50%", animation: "spin 0.6s linear infinite", flexShrink: 0 }} />
                <p style={{ color: "var(--accent)", fontSize: 13 }}>AI analyzing your spending patterns…</p>
              </div>
            ) : groqInsights.length === 0 ? (
              <p style={{ color: "var(--text-muted)", fontSize: 13, padding: "8px 0" }}>No insights yet. Add more expenses to generate analysis.</p>
            ) : groqInsights.map((ins, i) => {
              const iconMap = { warning: "⚠️", tip: "💡", success: "✅" };
              const colorMap = { warning: "#f87171", tip: "#fbbf24", success: "#34d399" };
              const c = colorMap[ins.type] || "var(--accent)";
              return (
                <div key={i} style={{
                  display: "flex", alignItems: "flex-start", gap: 12,
                  padding: "12px 14px",
                  background: `${c}0d`,
                  border: `1px solid ${c}25`,
                  borderRadius: 13,
                  transition: "all 0.2s",
                }}>
                  <span style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{iconMap[ins.type] || "📊"}</span>
                  <p style={{ fontSize: isMobile ? 12 : 13, color: c, margin: 0, fontWeight: 500, lineHeight: 1.65 }}>{ins.message}</p>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}