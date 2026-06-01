import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import API from "../../../api";
import toast from "react-hot-toast";
import ConfirmModal from "../../ConfirmModal";
import ChangePasswordModal from "../../Security/ChangePasswordModal";
import TwoFactorModal from "../../Security/TwoFactorModal";
import { useAuth } from "../../../context/AuthContext";
import { useTheme } from "../../../context/ThemeContext";
import socket from "../../../Socket";
import {
  User, Mail, Phone, MapPin, Briefcase, Edit3, Save,
  Camera, Shield, Bell, Trash2, LogOut, TrendingUp,
  Target, Calendar, ChevronRight, Check, X, Upload,
  RefreshCw, Lock,
} from "lucide-react";

const AVATARS = ["👤", "😊", "😎", "🧑‍💼", "👨‍💻", "👩‍💻", "🧑‍🎨", "🦸", "🧑‍🚀", "🐱", "🦊", "🐼"];

// ── MODULE-LEVEL guard — survives component unmount/remount (page navigation).
// Keyed by userId so multi-account scenarios work correctly.
// Backed by localStorage so it also survives hard refresh.
const _emittedBadges = new Map(); // userId -> Set<badgeKey>

function getEmittedSet(userId) {
  if (!_emittedBadges.has(userId)) {
    try {
      const stored = JSON.parse(localStorage.getItem(`seenBadges_${userId}`) || "[]");
      _emittedBadges.set(userId, new Set(stored));
    } catch {
      _emittedBadges.set(userId, new Set());
    }
  }
  return _emittedBadges.get(userId);
}

function persistEmittedSet(userId, set) {
  try {
    localStorage.setItem(`seenBadges_${userId}`, JSON.stringify([...set]));
  } catch { /* quota exceeded — skip silently */ }
}

// Call this when the user deletes all notifications so badges can re-notify
export function clearBadgeCache(userId) {
  _emittedBadges.delete(userId);
  try { localStorage.removeItem(`seenBadges_${userId}`); } catch { /* ignore */ }
}

function useBreakpoint() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  useEffect(() => {
    const fn = () => setW(window.innerWidth);
    window.addEventListener("resize", fn);
    return () => window.removeEventListener("resize", fn);
  }, []);
  return { isMobile: w < 640, isTablet: w >= 640 && w < 1024, isDesktop: w >= 1024 };
}

function Profile() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const { isMobile, isTablet, isDesktop } = useBreakpoint();
  const { user, refreshUser, updateUser, logoutAction } = useAuth();
  const { isDark } = useTheme();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [budget, setBudget] = useState(0);
  const [monthlyHistory, setMonthlyHistory] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [purging, setPurging] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [is2faModalOpen, setIs2faModalOpen] = useState(false);
  const [is2faEnabled, setIs2faEnabled] = useState(false);
  const [expandedCard, setExpandedCard] = useState(null);
  const location = useLocation();
  // (badge dedup is handled by the module-level _emittedBadges map)

  const [form, setForm] = useState({
    name: "", email: "", phone: "", location: "", occupation: "",
    bio: "", income: "", savingsGoal: "", avatar: "👤",
    isCustomImage: false,
    notifications: { email: true, spending: true, weekly: false },
  });

  const syncProfileData = useCallback(async () => {
    try {
      let freshReportCard = null;
      try {
        const syncRes = await API.post("/profile/sync-month");
        if (syncRes.data?.report) freshReportCard = syncRes.data.report;
      } catch (e) { console.warn("Sync delayed:", e); }

      const [profileRes, expRes, budRes, notifRes] = await Promise.all([
        API.get("/profile"),
        API.get("/expenses"),
        API.get("/budget"),
        API.get("/notifications/settings"),
      ]);

      const freshUser = profileRes.data;
      setExpenses(expRes.data || []);

      try {
        const histData = await API.get("/profile/history");
        const dbHistoryList = histData.data || [];
        if (freshReportCard) {
          const filtered = dbHistoryList.filter(r => r.monthKey !== freshReportCard.monthKey);
          setMonthlyHistory([freshReportCard, ...filtered]);
        } else {
          setMonthlyHistory(dbHistoryList);
        }
      } catch (hErr) { console.warn("History sub-load bypassed:", hErr); }

      const currentBudget = budRes.data?.monthlyBudget || budRes.data?.amount || 15000;
      setBudget(currentBudget);

      const dbSettings = notifRes.data || {};

      if (freshUser) {
        setIs2faEnabled(freshUser.isTwoFactorEnabled || false);
        setForm({
          name: freshUser.name || "",
          email: freshUser.email || "",
          phone: freshUser.phone || "",
          location: freshUser.location || "",
          occupation: freshUser.occupation || "",
          bio: freshUser.bio || "",
          income: freshUser.monthlyIncome || "",
          savingsGoal: freshUser.savingsGoal || "",
          avatar: freshUser.profileImage || "👤",
          isCustomImage: !!freshUser.profileImage && freshUser.profileImage.startsWith("data:"),
          notifications: {
            email: dbSettings.emailNotifications ?? freshUser.notifications?.email ?? true,
            spending: dbSettings.spendingAlerts ?? freshUser.notifications?.spending ?? true,
            weekly: dbSettings.weeklySummary ?? freshUser.notifications?.weekly ?? false,
          },
        });
        updateUser(freshUser);
      }
    } catch (err) {
      console.error("Profile sync error:", err);
      setBudget(15000);
    } finally {
      setLoading(false);
    }
  }, [updateUser]);

  useEffect(() => { syncProfileData(); }, [syncProfileData, location.search]);

  const handleManualSync = async () => {
    setSyncing(true);
    await syncProfileData();
    setSyncing(false);
    toast.success("History synced! ✅");
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Image must be under 2MB"); return; }
    if (!file.type.startsWith("image/")) return toast.error("Please upload a valid image.");
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm(prev => ({ ...prev, avatar: reader.result, isCustomImage: true }));
      setShowAvatarModal(false);
      toast.success("Photo selected! Click Save to apply.");
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        phone: form.phone,
        location: form.location,
        occupation: form.occupation,
        bio: form.bio,
        monthlyIncome: Number(form.income),
        savingsGoal: Number(form.savingsGoal),
        profileImage: form.avatar,
      };
      const res = await API.put("/profile", payload);
      updateUser(res.data);

      const userId = user?._id || "guest";
      const now = new Date();
      const cacheKey = `aiInsights_${userId}_${now.getFullYear()}_${now.getMonth()}`;
      localStorage.removeItem(cacheKey);
      localStorage.removeItem(`aiInsightsTime_${cacheKey}`);

      setEditing(false);
      toast.success("Profile updated ✅");
    } catch (err) {
      if (err.response?.status === 413) toast.error("Image too large.");
      else toast.error("Couldn't save. Try again.");
    } finally { setSaving(false); }
  };

  const handleCancel = async () => {
    await syncProfileData();
    setEditing(false);
  };

  const handlePurgeAccount = async () => {
    try {
      setPurging(true);
      await API.delete("/profile/purge-account");
      toast.success("Account permanently deleted. Goodbye! 👋", { duration: 5000 });
      logoutAction();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to delete account.");
    } finally { setPurging(false); setDeleteModalOpen(false); }
  };

  // Overall spent = sum of all monthly spent from history
  const overallSpent = monthlyHistory.reduce((sum, r) => sum + (r.totalSpent || 0), 0);
  const totalSpent = overallSpent > 0 ? overallSpent : expenses.reduce((s, e) => s + Number(e.amount), 0);

  // Overall savings = sum of all monthly saved from history
  const overallSavings = monthlyHistory.reduce((sum, r) => sum + (r.totalSaved || 0), 0);
  const savings = overallSavings > 0 ? overallSavings : Math.max(0, Number(form.income) - totalSpent);

  // Overall savings rate = total saved / total income across all months
  const totalIncomeAllTime = monthlyHistory.reduce((sum, r) => sum + (r.incomeSnapshot || 0), 0);
  const savingsRatio = totalIncomeAllTime > 0
    ? ((overallSavings / totalIncomeAllTime) * 100).toFixed(1)
    : Number(form.income) > 0
      ? ((savings / Number(form.income)) * 100).toFixed(1)
      : 0;
  const thisMonthExp = expenses.filter(e => {
    const d = new Date(e.date), n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;
  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  // ── All badge definitions ──────────────────────────────────────────────────
  const ALL_BADGE_DEFS = [
    {
      key: "getting_started",
      icon: "🚀",
      label: "Getting Started",
      desc: "First expense logged",
      color: "#6366f1",
      glow: "rgba(99,102,241,0.18)",
      check: () => expenses.length >= 1,
    },
    {
      key: "active_month",
      icon: "🔥",
      label: "Active This Month",
      desc: "5+ expenses this month",
      color: "#ef4444",
      glow: "rgba(239,68,68,0.18)",
      check: () => thisMonthExp >= 5,
    },
    {
      key: "power_tracker",
      icon: "🏆",
      label: "Power Tracker",
      desc: "Logged 10+ expenses",
      color: "#f59e0b",
      glow: "rgba(245,158,11,0.18)",
      check: () => expenses.length >= 10,
    },
    {
      key: "super_saver",
      icon: "💰",
      label: "Super Saver",
      desc: "Saved 30%+ of income",
      color: "#10b981",
      glow: "rgba(16,185,129,0.18)",
      check: () => Number(savingsRatio) > 30,
    },
    {
      key: "budget_conscious",
      icon: "🎯",
      label: "Budget Conscious",
      desc: "Stayed under budget this month",
      color: "#06b6d4",
      glow: "rgba(6,182,212,0.18)",
      check: () => budget > 0 && totalSpent <= budget && thisMonthExp > 0,
    },
    {
      key: "big_saver",
      icon: "🐖",
      label: "Big Saver",
      desc: "Saved ₹10,000+ in one month",
      color: "#8b5cf6",
      glow: "rgba(139,92,246,0.18)",
      check: () => {
        const inc = Number(form.income);
        return inc > 0 && (inc - totalSpent) >= 10000;
      },
    },
    {
      key: "category_master",
      icon: "🗂️",
      label: "Category Master",
      desc: "Expenses in 5+ categories",
      color: "#ec4899",
      glow: "rgba(236,72,153,0.18)",
      check: () => new Set(expenses.map(e => e.category)).size >= 5,
    },
    {
      key: "early_adopter",
      icon: "🌱",
      label: "Early Adopter",
      desc: "Member for 30+ days",
      color: "#84cc16",
      glow: "rgba(132,204,22,0.18)",
      check: () => {
        if (!user?.createdAt) return false;
        const days = (Date.now() - new Date(user.createdAt).getTime()) / 86400000;
        return days >= 30;
      },
    },
    {
      key: "profile_pro",
      icon: "📋",
      label: "Profile Pro",
      desc: "Set income, occupation & savings goal",
      color: "#0ea5e9",
      glow: "rgba(14,165,233,0.18)",
      check: () => !!form.income && !!form.occupation && !!form.savingsGoal,
    },
    {
      key: "transaction_king",
      icon: "🛍️",
      label: "Transaction King",
      desc: "10+ expenses in one month",
      color: "#a855f7",
      glow: "rgba(168,85,247,0.18)",
      check: () => thisMonthExp >= 10,
    },
    {
      key: "century_club",
      icon: "💯",
      label: "Century Club",
      desc: "Logged 100 total expenses",
      color: "#f97316",
      glow: "rgba(249,115,22,0.18)",
      check: () => expenses.length >= 100,
    },
    {
      key: "goal_crusher",
      icon: "🏅",
      label: "Goal Crusher",
      desc: "Savings exceeded your savings goal",
      color: "#fbbf24",
      glow: "rgba(251,191,36,0.18)",
      check: () => {
        const goal = Number(form.savingsGoal);
        const inc = Number(form.income);
        return goal > 0 && inc > 0 && (inc - totalSpent) >= goal;
      },
    },
  ];

  const badges = ALL_BADGE_DEFS.filter(b => b.check());
  const earnedKeys = new Set(badges.map(b => b.key));
  const lockedBadges = ALL_BADGE_DEFS.filter(b => !b.check());

  // ── Badge socket emitter — uses a module-level Map so the "already emitted"
  //    state is NEVER reset by React unmount/remount (page navigation).
  //    localStorage backs it up so even a hard refresh is safe.
  useEffect(() => {
    if (!user?._id || expenses.length === 0) return;

    const emitted = getEmittedSet(user._id);

    // Only emit badges we have never emitted before in this browser
    const newlyEarned = badges.filter(b => !emitted.has(b.key));
    if (newlyEarned.length === 0) return; // nothing new — bail out immediately

    newlyEarned.forEach(badge => {
      socket.emit("badgeEarned", {
        userId: user._id,
        badgeKey: badge.key,
        badgeIcon: badge.icon,
        badgeName: badge.label,
        badgeDesc: badge.desc,
      });
      emitted.add(badge.key); // mark as emitted right away
    });

    persistEmittedSet(user._id, emitted);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [earnedKeys.size, user?._id, expenses.length]);

  const tabs = [
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "stats", label: "Stats", icon: "📊" },
    { id: "badges", label: "Badges", icon: "🏅" },
    { id: "history", label: "History", icon: "📅" },
    { id: "settings", label: "Settings", icon: "⚙️" },
  ];

  const inputFields = [
    { label: "Full Name", field: "name", icon: <User size={14} />, placeholder: "Your full name", required: true },
    { label: "Email", field: "email", icon: <Mail size={14} />, placeholder: "your@email.com", type: "email" },
    { label: "Phone", field: "phone", icon: <Phone size={14} />, placeholder: "+91 98765 43210" },
    { label: "Location", field: "location", icon: <MapPin size={14} />, placeholder: "City, State" },
    { label: "Occupation", field: "occupation", icon: <Briefcase size={14} />, placeholder: "Your job title" },
    { label: "Monthly Income", field: "income", icon: <TrendingUp size={14} />, placeholder: "50000", type: "number" },
  ];

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-primary)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 44, height: 44, border: "3px solid rgba(99,102,241,0.2)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <p style={{ color: "var(--text-muted)", fontSize: 13, fontFamily: "'DM Sans',sans-serif" }}>Loading profile…</p>
      </div>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  const glassCard = {
    background: "var(--bg-card)",
    backdropFilter: "blur(20px)",
    WebkitBackdropFilter: "blur(20px)",
    border: "1px solid var(--border)",
    borderRadius: 20,
  };

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", fontFamily: "'DM Sans',sans-serif", position: "relative", overflow: "hidden", transition: "background 0.3s ease" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800;900&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(20px) } to { opacity:1; transform:translateY(0) } }
        @keyframes blob { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.05)} 66%{transform:translate(-20px,15px) scale(0.96)} }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        .fu { animation: fadeUp 0.5s ease forwards; opacity:0 }
        .fu1 { animation-delay:0.05s } .fu2 { animation-delay:0.12s } .fu3 { animation-delay:0.2s } .fu4 { animation-delay:0.28s }

        .prof-input {
          width:100%; border:1px solid var(--border); border-radius:12px;
          padding:11px 14px 11px 42px; font-size:14px; font-family:'DM Sans',sans-serif;
          outline:none; background: var(--bg-input); transition:all 0.2s;
          box-sizing:border-box; color: var(--text-primary);
        }
        .prof-input::placeholder { color: var(--text-muted); }
        .prof-input:focus { border-color:rgba(99,102,241,0.5); background:rgba(99,102,241,0.06); box-shadow:0 0 0 3px rgba(99,102,241,0.1); }
        .prof-input:disabled { color: var(--text-secondary); cursor:default; }

        .tab-pill {
          padding: 8px 14px; border-radius:10px; font-size:12px; font-weight:600;
          border:none; cursor:pointer; transition:all 0.2s; font-family:'DM Sans',sans-serif;
          white-space:nowrap; display:flex; align-items:center; gap:5px;
        }
        .tab-active   { background:rgba(99,102,241,0.2); color:#a5b4fc; border:1px solid rgba(99,102,241,0.3); }
        .tab-inactive { background:transparent; color: var(--text-secondary); border:1px solid transparent; }
        .tab-inactive:hover { color: var(--text-primary); background: var(--bg-input); }

        .setting-row { display:flex; align-items:center; justify-content:space-between; padding:14px 0; border-bottom:1px solid var(--border); gap:12px; }
        .setting-row:last-child { border-bottom:none; }
        .toggle { width:44px; height:24px; border-radius:999px; position:relative; cursor:pointer; transition:background 0.2s; border:none; outline:none; flex-shrink:0; }
        .toggle-thumb { width:18px; height:18px; background:white; border-radius:50%; position:absolute; top:3px; transition:left 0.2s; box-shadow:0 1px 4px rgba(0,0,0,0.3); }

        .hist-card { background: var(--stat-bg); border:1px solid var(--stat-border); border-radius:18px; overflow:hidden; transition:all 0.2s; }
        .hist-card:hover { background: var(--bg-card-hover); transform:translateY(-3px); }

        .avatar-pick-btn { width:46px; height:46px; border-radius:12px; border:1.5px solid var(--border); background: var(--bg-input); font-size:20px; cursor:pointer; transition:all 0.2s; display:flex; align-items:center; justify-content:center; }
        .avatar-pick-btn:hover { border-color:#6366f1; background:rgba(99,102,241,0.15); transform:scale(1.1); }

        .action-btn { display:flex; align-items:center; justify-content:center; gap:7px; padding:11px 16px; border-radius:12px; font-size:13px; font-weight:600; cursor:pointer; font-family:'DM Sans',sans-serif; transition:all 0.2s; border:none; width:100%; }
        .action-btn:hover { transform:translateY(-2px); }

        .prof-label { font-size:11px; font-weight:600; color: var(--text-secondary); display:block; margin-bottom:6px; text-transform:uppercase; letter-spacing:0.05em; }
        .section-title { font-weight:700; font-size:13px; color: var(--text-secondary); margin-bottom:20px; letter-spacing:0.06em; text-transform:uppercase; }

        .badge-card { transition: all 0.2s; }
        .badge-card:hover { transform: translateY(-3px); }
      `}</style>

      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, opacity: isDark ? 1 : 0, transition: "opacity 0.5s ease" }}>
        <div style={{ position: "absolute", width: 600, height: 600, background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", top: -100, left: -100, animation: "blob 12s ease-in-out infinite" }} />
        <div style={{ position: "absolute", width: 500, height: 500, background: "radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 70%)", top: "30%", right: -100, animation: "blob 15s ease-in-out infinite 3s" }} />
        <div style={{ position: "absolute", width: 400, height: 400, background: "radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)", bottom: -80, left: "35%", animation: "blob 10s ease-in-out infinite 6s" }} />
      </div>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: isMobile ? "16px 14px 40px" : "28px 24px 48px", position: "relative", zIndex: 1 }}>

        {/* ── Hero Card ── */}
        <div className="fu fu1" style={{ ...glassCard, marginBottom: 16, position: "relative", overflow: "hidden", padding: isMobile ? "24px 20px" : "32px 36px" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(99,102,241,0.08) 0%, transparent 50%, rgba(139,92,246,0.05) 100%)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", top: -60, right: -60, width: 220, height: 220, background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />

          <div style={{ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: isMobile ? 16 : 24, position: "relative", zIndex: 1, flexWrap: "wrap" }}>
            <div style={{ position: "relative", flexShrink: 0 }}>
              <div
                onClick={() => editing && setShowAvatarModal(true)}
                style={{
                  width: isMobile ? 68 : 88, height: isMobile ? 68 : 88,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))",
                  border: "2px solid rgba(99,102,241,0.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: form.isCustomImage ? 0 : (isMobile ? 30 : 40),
                  cursor: editing ? "pointer" : "default",
                  overflow: "hidden",
                  boxShadow: "0 0 30px rgba(99,102,241,0.25)",
                }}
              >
                {form.isCustomImage
                  ? <img src={form.avatar} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  : form.avatar}
              </div>
              {editing && (
                <div onClick={() => setShowAvatarModal(true)} style={{ position: "absolute", bottom: 0, right: 0, width: 26, height: 26, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", border: "2px solid var(--bg-primary)" }}>
                  <Camera size={11} color="white" />
                </div>
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
                <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: isMobile ? 20 : 26, fontWeight: 900, color: "var(--text-primary)", margin: 0, lineHeight: 1.1 }}>
                  {form.name || "Your Name"}
                </h1>
                <span style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 99, background: "rgba(16,185,129,0.15)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}>
                  ● Active
                </span>
              </div>
              <p style={{ color: "var(--text-secondary)", fontSize: isMobile ? 12 : 13, margin: "0 0 8px" }}>
                {form.occupation || "Add your occupation"}{form.location ? ` · ${form.location}` : ""}
              </p>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <Calendar size={11} color="var(--text-muted)" />
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Member since {memberSince}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              {editing ? (
                <>
                  <button onClick={handleCancel} style={{ display: "flex", alignItems: "center", gap: 5, padding: isMobile ? "8px 12px" : "9px 16px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 11, color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                    <X size={13} />{!isMobile && " Cancel"}
                  </button>
                  <button onClick={handleSave} disabled={saving} style={{ display: "flex", alignItems: "center", gap: 5, padding: isMobile ? "8px 14px" : "9px 18px", background: "linear-gradient(135deg,#10b981,#059669)", border: "none", borderRadius: 11, color: "white", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 14px rgba(16,185,129,0.3)" }}>
                    {saving ? <div style={{ width: 12, height: 12, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> : <Save size={13} />}
                    {" Save"}
                  </button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "8px 14px" : "9px 18px", background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)", borderRadius: 11, color: "#a5b4fc", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                  <Edit3 size={13} /> Edit{!isMobile && " Profile"}
                </button>
              )}
            </div>
          </div>

          {(form.bio || editing) && (
            <div style={{ marginTop: 18, paddingTop: 18, borderTop: "1px solid var(--border)", position: "relative", zIndex: 1 }}>
              {editing ? (
                <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} placeholder="Write a short bio…" rows={2}
                  style={{ width: "100%", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 11, padding: "10px 14px", color: "var(--text-primary)", fontSize: 13, fontFamily: "'DM Sans',sans-serif", outline: "none", resize: "none", boxSizing: "border-box" }} />
              ) : (
                <p style={{ color: "var(--text-secondary)", fontSize: 13, margin: 0, lineHeight: 1.6 }}>{form.bio}</p>
              )}
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginTop: 20, paddingTop: 18, borderTop: "1px solid var(--border)", position: "relative", zIndex: 1 }}>
            {[
              { label: "Transactions", value: expenses.length, color: "#a5b4fc" },
              { label: "This Month", value: `${thisMonthExp} exp`, color: "#6ee7b7" },
              { label: "Savings Rate", value: `${savingsRatio}%`, color: "#fcd34d" },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ textAlign: "center" }}>
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: isMobile ? 16 : 20, fontWeight: 800, color, margin: "0 0 3px" }}>{value}</p>
                <p style={{ fontSize: 10, color: "var(--text-muted)", margin: 0, fontWeight: 600 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Avatar Modal ── */}
        {showAvatarModal && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 }}>
            <div style={{ ...glassCard, padding: 24, maxWidth: 340, width: "100%", background: "var(--bg-card)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)", margin: 0 }}>Update Photo</p>
                <button onClick={() => setShowAvatarModal(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}><X size={18} /></button>
              </div>
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageUpload} style={{ display: "none" }} />
              <button onClick={() => fileInputRef.current.click()} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "11px", background: "rgba(99,102,241,0.1)", border: "1.5px dashed rgba(99,102,241,0.4)", borderRadius: 12, color: "#a5b4fc", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>
                <Upload size={14} /> Upload Photo
              </button>
              <p style={{ textAlign: "center", fontSize: 10, color: "var(--text-muted)", fontWeight: 700, marginBottom: 12, letterSpacing: "0.05em" }}>OR CHOOSE AVATAR</p>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 }}>
                {AVATARS.map(av => (
                  <button key={av} className="avatar-pick-btn" onClick={() => { setForm({ ...form, avatar: av, isCustomImage: false }); setShowAvatarModal(false); }}
                    style={(!form.isCustomImage && form.avatar === av) ? { borderColor: "#6366f1", background: "rgba(99,102,241,0.2)" } : {}}>{av}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Tabs ── */}
        <div className="fu fu2" style={{ display: "flex", gap: 4, marginBottom: 14, overflowX: "auto", paddingBottom: 2 }}>
          {tabs.map(tab => (
            <button key={tab.id} className={`tab-pill ${activeTab === tab.id ? "tab-active" : "tab-inactive"}`} onClick={() => setActiveTab(tab.id)}>
              <span>{tab.icon}</span>
              {(!isMobile || activeTab === tab.id) && tab.label}
            </button>
          ))}
        </div>

        {/* ── Profile Tab ── */}
        {activeTab === "profile" && (
          <div className="fu fu3" style={{ ...glassCard, padding: isMobile ? 18 : 28 }}>
            <p className="section-title">Personal Information</p>
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              {inputFields.map(({ label, field, icon, placeholder, type = "text", required }) => (
                <div key={field}>
                  <label className="prof-label">
                    {label} {required && <span style={{ color: "#f87171" }}>*</span>}
                  </label>
                  <div style={{ position: "relative" }}>
                    <span style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "rgba(99,102,241,0.7)" }}>{icon}</span>
                    <input type={type} value={form[field]} onChange={e => setForm({ ...form, [field]: e.target.value })}
                      placeholder={placeholder} disabled={!editing} className="prof-input" />
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <label className="prof-label">Monthly Savings Goal</label>
              <div style={{ position: "relative" }}>
                <Target size={14} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "rgba(99,102,241,0.7)" }} />
                <input type="number" value={form.savingsGoal} onChange={e => setForm({ ...form, savingsGoal: e.target.value })}
                  placeholder="20000" disabled={!editing} className="prof-input" />
              </div>
            </div>
          </div>
        )}

        {/* ── Stats Tab ── */}
        {activeTab === "stats" && (
          <div className="fu fu3">
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3,1fr)", gap: 12 }}>
              {[
                { icon: "💸", label: "Total Spent", value: `₹${totalSpent.toLocaleString()}`, color: "#f87171", glow: "rgba(248,113,113,0.15)" },
                { icon: "💰", label: "Total Saved", value: `₹${savings.toLocaleString()}`, color: "#6ee7b7", glow: "rgba(110,231,183,0.15)" },
                { icon: "📊", label: "Transactions", value: expenses.length, color: "#a5b4fc", glow: "rgba(165,180,252,0.15)" },
                { icon: "📅", label: "This Month", value: `${thisMonthExp} exp`, color: "#fcd34d", glow: "rgba(252,211,77,0.15)" },
                { icon: "🎯", label: "Savings Rate", value: `${savingsRatio}%`, color: "#c4b5fd", glow: "rgba(196,181,253,0.15)" },
                { icon: "📈", label: "Budget", value: budget > 0 ? `₹${budget.toLocaleString()}` : "Not set", color: "#93c5fd", glow: "rgba(147,197,253,0.15)" },
              ].map(({ icon, label, value, color, glow }) => (
                <div key={label} style={{ ...glassCard, padding: isMobile ? 16 : 20, textAlign: "center", background: glow, transition: "transform 0.2s" }}
                  onMouseOver={e => e.currentTarget.style.transform = "translateY(-4px)"}
                  onMouseOut={e => e.currentTarget.style.transform = "translateY(0)"}>
                  <p style={{ fontSize: isMobile ? 26 : 32, margin: "0 0 8px" }}>{icon}</p>
                  <p style={{ fontFamily: "'Syne',sans-serif", fontSize: isMobile ? 18 : 22, fontWeight: 800, color, margin: "0 0 4px" }}>{value}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, fontWeight: 600 }}>{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Badges Tab ── */}
        {activeTab === "badges" && (
          <div className="fu fu3" style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Progress summary */}
            <div style={{ ...glassCard, padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 18, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 2px" }}>
                  {badges.length} / {ALL_BADGE_DEFS.length}
                </p>
                <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, fontWeight: 600 }}>Badges Earned</p>
              </div>
              <div style={{ flex: 1, maxWidth: 200 }}>
                <div style={{ height: 8, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${(badges.length / ALL_BADGE_DEFS.length) * 100}%`,
                    background: "linear-gradient(90deg, #6366f1, #8b5cf6)",
                    borderRadius: 99,
                    transition: "width 0.8s ease",
                  }} />
                </div>
                <p style={{ fontSize: 10, color: "var(--text-muted)", margin: "4px 0 0", textAlign: "right", fontWeight: 600 }}>
                  {Math.round((badges.length / ALL_BADGE_DEFS.length) * 100)}% complete
                </p>
              </div>
            </div>

            {/* Earned */}
            {badges.length > 0 ? (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", margin: 0, letterSpacing: "0.06em" }}>
                  ✅ EARNED ({badges.length})
                </p>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                  {badges.map(badge => (
                    <div
                      key={badge.key}
                      className="badge-card"
                      style={{
                        ...glassCard,
                        padding: "16px 18px",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        background: badge.glow,
                        border: `1px solid ${badge.color}30`,
                      }}
                      onMouseOver={e => e.currentTarget.style.boxShadow = `0 8px 30px ${badge.glow}`}
                      onMouseOut={e => e.currentTarget.style.boxShadow = "none"}
                    >
                      <div style={{
                        width: 48, height: 48, borderRadius: 14,
                        background: `${badge.color}20`,
                        border: `1.5px solid ${badge.color}40`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 22, flexShrink: 0,
                      }}>
                        {badge.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)", margin: "0 0 3px" }}>
                          {badge.label}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                          {badge.desc}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 5 }}>
                          <Check size={10} color={badge.color} />
                          <span style={{ fontSize: 10, color: badge.color, fontWeight: 700 }}>Earned</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div style={{ ...glassCard, padding: "36px 24px", textAlign: "center", border: "1px dashed var(--border)" }}>
                <p style={{ fontSize: 44, margin: "0 0 12px" }}>🏆</p>
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", margin: "0 0 6px" }}>No badges yet</p>
                <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0 }}>Start logging expenses to earn your first badge!</p>
              </div>
            )}

            {/* Locked */}
            {lockedBadges.length > 0 && (
              <>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", margin: "8px 0 0", letterSpacing: "0.06em" }}>
                  🔒 LOCKED ({lockedBadges.length})
                </p>
                <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
                  {lockedBadges.map(badge => (
                    <div key={badge.key} style={{ ...glassCard, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, opacity: 0.45 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: "var(--bg-input)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, filter: "grayscale(1)", flexShrink: 0 }}>
                        {badge.icon}
                      </div>
                      <div>
                        <p style={{ fontWeight: 600, fontSize: 13, color: "var(--text-secondary)", margin: "0 0 2px" }}>{badge.label}</p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0 }}>{badge.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* ── History Tab ── */}
        {activeTab === "history" && (
          <div className="fu fu3" style={{ display: "flex", flexDirection: "column", gap: 14 }}>

            {/* Header */}
            <div style={{ ...glassCard, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ fontFamily: "'Syne',sans-serif", fontSize: isMobile ? 15 : 17, fontWeight: 800, color: "var(--text-primary)", margin: "0 0 3px" }}>Financial Vault</h3>
                <p style={{ fontSize: 12, color: "var(--text-secondary)", margin: 0 }}>Monthly statements since sign-up</p>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700, background: "rgba(99,102,241,0.15)", color: "#a5b4fc", padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(99,102,241,0.25)" }}>
                  {monthlyHistory.length} Month{monthlyHistory.length !== 1 ? "s" : ""}
                </span>
                <button onClick={handleManualSync} disabled={syncing} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 13px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: 10, color: "var(--text-secondary)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                  <RefreshCw size={13} style={{ animation: syncing ? "spin 0.8s linear infinite" : "none" }} />
                  {!isMobile && "Sync"}
                </button>
              </div>
            </div>

            {/* Summary Row */}
            {monthlyHistory.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                {[
                  {
                    label: "Total Income",
                    value: `₹${monthlyHistory.reduce((s, r) => s + (r.incomeSnapshot || 0), 0).toLocaleString()}`,
                    color: "var(--text-primary)",
                    icon: "📈",
                  },
                  {
                    label: "Total Spent",
                    value: `₹${monthlyHistory.reduce((s, r) => s + (r.totalSpent || 0), 0).toLocaleString()}`,
                    color: "#fca5a5",
                    icon: "💸",
                  },
                  {
                    label: "Total Saved",
                    value: `₹${monthlyHistory.reduce((s, r) => s + (r.totalSaved || 0), 0).toLocaleString()}`,
                    color: "#6ee7b7",
                    icon: "💰",
                  },
                ].map(({ label, value, color, icon }) => (
                  <div key={label} style={{ ...glassCard, padding: isMobile ? "12px 14px" : "14px 18px", textAlign: "center" }}>
                    <p style={{ fontSize: isMobile ? 18 : 22, margin: "0 0 6px" }}>{icon}</p>
                    <p style={{ fontFamily: "'Syne',sans-serif", fontSize: isMobile ? 14 : 18, fontWeight: 800, color, margin: "0 0 4px" }}>{value}</p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", margin: 0, fontWeight: 600 }}>{label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Cards */}
            {monthlyHistory.length === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 24px", ...glassCard }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>📅</div>
                <p style={{ color: "var(--text-secondary)", fontSize: 14, fontWeight: 600, marginBottom: 6 }}>No History Yet</p>
                <p style={{ color: "var(--text-muted)", fontSize: 12, marginBottom: 18 }}>Monthly reports appear here automatically.</p>
                <button onClick={handleManualSync} disabled={syncing} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
                  <RefreshCw size={13} style={{ animation: syncing ? "spin 0.8s linear infinite" : "none" }} />
                  Generate Now
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                {monthlyHistory.map((report, idx) => {
                  const [year, month] = report.monthKey.split("-");
                  const monthName = new Date(Number(year), Number(month) - 1).toLocaleDateString("en-IN", { month: "long" });
                  const targetMet = report.totalSaved >= report.savingsGoalSnapshot;
                  const utilRate = report.incomeSnapshot > 0 ? Math.min(100, ((report.totalSpent / report.incomeSnapshot) * 100)).toFixed(0) : 0;
                  const savedPct = report.incomeSnapshot > 0 ? ((report.totalSaved / report.incomeSnapshot) * 100).toFixed(0) : 0;
                  const isExpanded = expandedCard === report.monthKey;

                  return (
                    <div
                      key={report._id || report.monthKey}
                      className="hist-card"
                      style={{ cursor: "pointer" }}
                      onClick={() => setExpandedCard(isExpanded ? null : report.monthKey)}
                    >
                      {/* Top accent bar */}
                      <div style={{ height: 3, background: targetMet ? "linear-gradient(90deg,#10b981,#059669)" : "linear-gradient(90deg,#ef4444,#dc2626)", borderRadius: "20px 20px 0 0" }} />

                      <div style={{ padding: isMobile ? "16px 14px" : "18px 20px" }}>
                        {/* Card Header */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                          <div>
                            <h4 style={{ margin: "0 0 2px", fontSize: isMobile ? 15 : 17, fontWeight: 800, color: "var(--text-primary)", fontFamily: "'Syne',sans-serif" }}>{monthName}</h4>
                            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 600 }}>{year}</span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 8, background: targetMet ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)", color: targetMet ? "#6ee7b7" : "#fca5a5", border: `1px solid ${targetMet ? "rgba(16,185,129,0.25)" : "rgba(239,68,68,0.25)"}` }}>
                              {targetMet ? "🎯 Goal Met" : "⚠️ Missed"}
                            </span>
                            {/* Expand arrow */}
                            <span style={{ color: "var(--text-muted)", fontSize: 12, transition: "transform 0.2s", display: "inline-block", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}>▼</span>
                          </div>
                        </div>

                        {/* Always visible: Saved row */}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: isExpanded ? 10 : 0 }}>
                          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Saved</span>
                          <span style={{ fontSize: 15, fontWeight: 800, color: "#6ee7b7", fontFamily: "'Syne',sans-serif" }}>₹{(report.totalSaved || 0).toLocaleString()}</span>
                        </div>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div style={{ animation: "fadeUp 0.2s ease" }}>
                            <div style={{ height: 1, background: "var(--border)", margin: "10px 0" }} />

                            {/* All rows */}
                            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
                              {[
                                { label: "Income", value: `₹${(report.incomeSnapshot || 0).toLocaleString()}`, color: "var(--text-primary)" },
                                { label: "Spent", value: `₹${(report.totalSpent || 0).toLocaleString()}`, color: "#fca5a5" },
                                { label: "Savings Goal", value: `₹${(report.savingsGoalSnapshot || 0).toLocaleString()}`, color: "#fcd34d" },
                                { label: "Transactions", value: report.totalTransactions || 0, color: "#a5b4fc" },
                              ].map(({ label, value, color }) => (
                                <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{label}</span>
                                  <span style={{ fontSize: 13, fontWeight: 600, color }}>{value}</span>
                                </div>
                              ))}
                            </div>

                            {/* Tags */}
                            <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 14 }}>
                              {[
                                { bg: "rgba(99,102,241,0.15)", color: "#a5b4fc", label: `${report.totalTransactions || 0} txns` },
                                { bg: "rgba(16,185,129,0.15)", color: "#6ee7b7", label: `${savedPct}% saved` },
                                report.savingsGoalSnapshot > 0 && { bg: "rgba(245,158,11,0.15)", color: "#fcd34d", label: `Goal ₹${(report.savingsGoalSnapshot || 0).toLocaleString()}` },
                              ].filter(Boolean).map(({ bg, color, label }) => (
                                <span key={label} style={{ fontSize: 10, fontWeight: 700, padding: "3px 9px", borderRadius: 6, background: bg, color }}>{label}</span>
                              ))}
                            </div>

                            {/* Utilization bar */}
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 5, fontWeight: 600 }}>
                                <span>Income Utilization</span>
                                <span style={{ color: Number(utilRate) > 90 ? "#fca5a5" : "var(--text-secondary)" }}>{utilRate}%</span>
                              </div>
                              <div style={{ height: 5, background: "var(--border)", borderRadius: 99, overflow: "hidden" }}>
                                <div style={{ height: "100%", width: `${utilRate}%`, background: Number(utilRate) > 90 ? "#ef4444" : Number(utilRate) > 70 ? "#f59e0b" : "linear-gradient(90deg,#6366f1,#8b5cf6)", borderRadius: 99, transition: "width 0.8s ease" }} />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Settings Tab ── */}
        {activeTab === "settings" && (
          <div className="fu fu3" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ ...glassCard, padding: isMobile ? 18 : 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Bell size={15} color="#a5b4fc" />
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", margin: 0 }}>Notifications</p>
              </div>
              {[
                { key: "email", label: "Monthly Report", sub: "Comprehensive financial report at month end" },
                { key: "spending", label: "Spending Alerts", sub: "Alert when budget reaches 80%" },
                { key: "weekly", label: "Weekly Summary", sub: "Sunday morning finance digest" },
              ].map(({ key, label, sub }) => (
                <div key={key} className="setting-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", margin: "0 0 2px" }}>{label}</p>
                    <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>{sub}</p>
                  </div>
                  <button className="toggle" onClick={async () => {
                    const nextValue = !form.notifications[key];
                    const updated = { ...form.notifications, [key]: nextValue };
                    setForm(prev => ({ ...prev, notifications: updated }));
                    try {
                      await API.put("/notifications/settings", updated);
                      toast.success(`${label} ${nextValue ? "enabled" : "disabled"}`);
                    } catch { setForm(prev => ({ ...prev, notifications: form.notifications })); toast.error("Failed to save."); }
                  }} style={{ background: form.notifications[key] ? "#6366f1" : "var(--bg-input)" }}>
                    <div className="toggle-thumb" style={{ left: form.notifications[key] ? "23px" : "3px" }} />
                  </button>
                </div>
              ))}
            </div>


            {/* 🏦 ACCREDITED OPEN BANKING SIMULATOR COMPONENT WIDGET */}
            {/* <div style={{ marginTop: 16, background: "rgba(255,255,255,0.02)", border: "1px solid var(--border)", padding: 20, borderRadius: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, margin: "0 0 2px" }}>Automated Bank Data Link</p>
                  <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>
                    Link live statement streams via secure Account Aggregator protocols automatically.
                  </p>
                  {(user?.bankLinked || form.bankLinked) && user?.linkedBankName && (
                    <p style={{ fontSize: 11, color: "#6ee7b7", margin: "6px 0 0", fontWeight: 600 }}>
                      🏦 Connected: {user.linkedBankName}
                    </p>
                  )}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {(user?.bankLinked || form.bankLinked) ? (
                    <button
                      onClick={async () => {
                        try {
                          await API.put("/profile", { bankLinked: false, linkedBankName: "", consentId: null });
                          updateUser({ ...user, bankLinked: false, linkedBankName: "", consentId: null });
                          toast.success("Bank account unlinked.");
                        } catch {
                          toast.error("Failed to unlink bank.");
                        }
                      }}
                      style={{
                        padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                        border: "1px solid rgba(239,68,68,0.3)", cursor: "pointer",
                        background: "rgba(239,68,68,0.08)", color: "#fca5a5"
                      }}
                    >
                      🔓 Unlink Bank
                    </button>
                  ) : (
                    <button
                      onClick={async () => {
                        try {
                          const res = await API.post("/bank/request-consent", {
                            bankName: "HDFC Bank India",
                            phone: user?.phone || form.phone
                          });
                          if (res.data?.authRedirectUrl) {
                            toast.loading("Redirecting to verification gateway...");
                            window.location.href = res.data.authRedirectUrl;
                          }
                        } catch {
                          toast.error("Failed to construct consent parameters.");
                        }
                      }}
                      style={{
                        padding: "8px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700,
                        border: "none", cursor: "pointer",
                        background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white"
                      }}
                    >
                      🏦 Connect HDFC Bank
                    </button>
                  )}
                </div>
              </div>
            </div> */}

            <div style={{ ...glassCard, padding: isMobile ? 18 : 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <Shield size={15} color="#6ee7b7" />
                <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", margin: 0 }}>Security</p>
              </div>
              {[
                { label: "Change Password", sub: "Update your account credentials", icon: <Lock size={14} />, action: () => setIsPasswordModalOpen(true) },
                { label: "Two-Factor Auth", sub: "Protect with authenticator app", icon: <Shield size={14} />, action: () => setIs2faModalOpen(true), badge: is2faEnabled ? "Active" : null },
              ].map(({ label, sub, icon, action, badge }) => (
                <div key={label} className="setting-row" style={{ cursor: "pointer" }} onClick={action}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 10, background: "rgba(99,102,241,0.1)", display: "flex", alignItems: "center", justifyContent: "center", color: "#a5b4fc", flexShrink: 0 }}>{icon}</div>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <p style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)", margin: 0 }}>{label}</p>
                        {badge && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: "rgba(16,185,129,0.15)", color: "#6ee7b7", border: "1px solid rgba(16,185,129,0.2)" }}>● {badge}</span>}
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-secondary)", margin: 0 }}>{sub}</p>
                    </div>
                  </div>
                  <ChevronRight size={15} color="var(--text-muted)" />
                </div>
              ))}
            </div>

            <div style={{ ...glassCard, padding: isMobile ? 18 : 24, border: "1px solid rgba(239,68,68,0.15)" }}>
              <p style={{ fontWeight: 700, fontSize: 12, color: "rgba(239,68,68,0.7)", marginBottom: 14, letterSpacing: "0.06em" }}>⚠️ DANGER ZONE</p>
              <div style={{ display: "flex", gap: 10, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                <button className="action-btn" onClick={logoutAction}
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
                  <LogOut size={14} /> Sign Out
                </button>
                <button className="action-btn" onClick={() => setDeleteModalOpen(true)}
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
                  <Trash2 size={14} /> Delete Account
                </button>
              </div>
            </div>
          </div>
        )}

        {isMobile && <div style={{ height: 32 }} />}
      </div>

      <ConfirmModal isOpen={deleteModalOpen} loading={purging} onClose={() => setDeleteModalOpen(false)} onConfirm={handlePurgeAccount}
        title="Wipe Account Permanently?" message="This will permanently delete all your data including expenses, budgets, and AI history. This cannot be undone." />
      <ChangePasswordModal isOpen={isPasswordModalOpen} onClose={() => setIsPasswordModalOpen(false)} />
      <TwoFactorModal isOpen={is2faModalOpen} isCurrentlyEnabled={is2faEnabled} onStatusUpdated={(s) => setIs2faEnabled(s)} onClose={() => setIs2faModalOpen(false)} />
    </div>
  );
}

export default Profile;