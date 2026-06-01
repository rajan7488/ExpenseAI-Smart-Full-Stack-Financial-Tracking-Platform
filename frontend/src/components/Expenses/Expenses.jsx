import { useEffect, useState } from "react";
import API from "../../api";
import { Search, Filter, Trash2, TrendingDown, Receipt, Calendar, Tag, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import ConfirmModal from "../ConfirmModal";

const CATEGORY_COLORS = {
  "Food & Dining": { color: "#f97316", bg: "rgba(249,115,22,0.12)", icon: "🍔" },
  "Transportation": { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", icon: "🚗" },
  "Bills & Utilities": { color: "#ef4444", bg: "rgba(239,68,68,0.12)", icon: "📄" },
  "Shopping": { color: "#ec4899", bg: "rgba(236,72,153,0.12)", icon: "🛍️" },
  "Entertainment": { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", icon: "🎬" },
  "Healthcare": { color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: "💊" },
  "Education": { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "📚" },
  "Other": { color: "#6366f1", bg: "rgba(99,102,241,0.12)", icon: "📦" },
};

const getCat = (name) => CATEGORY_COLORS[name] || { color: "#6366f1", bg: "rgba(99,102,241,0.12)", icon: "📦" };

const timeOptions = ["All Time", "Today", "This Week", "This Month", "Last Month", "Last 3 Months"];

function Expenses() {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [time, setTime] = useState("This Month");
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState("newest");

  const [deleteModal, setDeleteModal] = useState({ isOpen: false, expenseId: null });
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchExpenses = async () => {
    try {
      const res = await API.get("/expenses");
      setExpenses(res.data);
    } catch { toast.error("Failed to load expenses"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchExpenses(); }, []);

  useEffect(() => {
    let data = [...expenses];
    const now = new Date();

    if (search) data = data.filter(e => e.description?.toLowerCase().includes(search.toLowerCase()) || e.category?.toLowerCase().includes(search.toLowerCase()));

    if (category !== "All") data = data.filter(e => e.category === category);

    if (time === "Today") {
      data = data.filter(e => new Date(e.date).toDateString() === now.toDateString());
    } else if (time === "This Week") {
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      data = data.filter(e => new Date(e.date) >= weekAgo);
    } else if (time === "This Month") {
      data = data.filter(e => { const d = new Date(e.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    } else if (time === "Last Month") {
      data = data.filter(e => { const d = new Date(e.date); const lm = new Date(now.getFullYear(), now.getMonth() - 1); return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear(); });
    } else if (time === "Last 3 Months") {
      const threeMonths = new Date(now); threeMonths.setMonth(threeMonths.getMonth() - 3);
      data = data.filter(e => new Date(e.date) >= threeMonths);
    }

    if (sortBy === "newest") data.sort((a, b) => new Date(b.date) - new Date(a.date));
    if (sortBy === "oldest") data.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (sortBy === "highest") data.sort((a, b) => b.amount - a.amount);
    if (sortBy === "lowest") data.sort((a, b) => a.amount - b.amount);

    setFiltered(data);
  }, [search, category, time, expenses, sortBy]);

  const openDeleteTargetModal = (id) => {
    setDeleteModal({ isOpen: true, expenseId: id });
  };

  const handleExecuteDelete = async () => {
    try {
      setDeleteLoading(true);
      await API.delete(`/expenses/${deleteModal.expenseId}`);
      setExpenses(prev => prev.filter(e => e._id !== deleteModal.expenseId));
      toast.success("Expense tracking row removed 💸");
      setDeleteModal({ isOpen: false, expenseId: null });
    } catch {
      toast.error("Failed to delete record. Please try again.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);
  const avg = filtered.length > 0 ? Math.round(total / filtered.length) : 0;
  const highest = filtered.length > 0 ? Math.max(...filtered.map(e => Number(e.amount))) : 0;

  const grouped = filtered.reduce((acc, exp) => {
    const dateKey = new Date(exp.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(exp);
    return acc;
  }, {});

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", background: "var(--bg-primary)" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid var(--border)", borderTop: "3px solid var(--accent)", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    </div>
  );

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", fontFamily: "'DM Sans',sans-serif", boxSizing: "border-box" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
        
        .fade{animation:fadeUp 0.35s ease forwards}
        
        .exp-input{
          width:100%;
          border:1.5px solid var(--border);
          border-radius:12px;
          padding:10px 14px 10px 40px;
          font-size:14px;
          font-family:'DM Sans',sans-serif;
          outline:none;
          background:var(--bg-input);
          color:var(--text-primary);
          transition:all 0.2s;
          box-sizing:border-box;
        }
        .exp-input::placeholder { color: var(--text-muted); }
        .exp-input:focus{
          border-color:var(--accent);
          background:var(--bg-card);
          box-shadow:0 0 0 3px var(--accent-glow);
        }
        
        .exp-select{
          border:1.5px solid var(--border);
          border-radius:12px;
          padding:9px 14px;
          font-size:13px;
          font-family:'DM Sans',sans-serif;
          outline:none;
          background:var(--bg-card);
          color:var(--text-primary);
          cursor:pointer;
          transition:all 0.2s;
          width:100%;
          box-sizing:border-box;
        }
        .exp-select:focus{
          border-color:var(--accent);
          box-shadow:0 0 0 3px var(--accent-glow);
        }
        /* Fix browser-injected white bg on select options */
        .exp-select option {
          background: var(--bg-secondary);
          color: var(--text-primary);
        }
        
        .stat-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 20px; }
        .stat-mini{
          background:var(--stat-bg);
          border-radius:14px;
          padding:14px;
          border:1px solid var(--stat-border);
          box-sizing:border-box;
        }

        .filter-row-layout { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; align-items: center; }
        .filter-label-wrap { grid-column: span 2; display: flex; align-items: center; gap: 6px; color: var(--text-muted); font-size: 12px; font-weight: 600; }
        .chips-scroll-wrap { grid-column: span 2; display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
        .chips-scroll-wrap::-webkit-scrollbar { display: none; }
        
        .cat-chip{
          padding:6px 14px;
          border-radius:99px;
          font-size:12px;
          font-weight:600;
          border:1px solid var(--border);
          cursor:pointer;
          transition:all 0.2s;
          white-space:nowrap;
          font-family:'DM Sans',sans-serif;
        }
        .cat-chip-inactive {
          background: var(--bg-input);
          color: var(--text-secondary);
        }
        .cat-chip-active {
          background: var(--accent);
          color: white;
          border-color: var(--accent);
        }

        .exp-row{
          display:flex;
          align-items:center;
          justify-content:space-between;
          padding:12px;
          border-radius:14px;
          background:var(--bg-card);
          border:1px solid var(--border);
          transition:all 0.2s;
          margin-bottom:8px;
          box-sizing:border-box;
        }
        .exp-row:hover{
          box-shadow:0 4px 16px rgba(0,0,0,0.15);
          transform:translateY(-1px);
          background:var(--bg-card-hover);
          border-color:var(--border-strong);
        }
        
        .del-btn{
          width:32px;
          height:32px;
          border-radius:9px;
          border:none;
          background:rgba(239,68,68,0.1);
          color:#ef4444;
          display:flex;
          align-items:center;
          justify-content:center;
          cursor:pointer;
          transition:all 0.2s;
          flex-shrink:0;
        }
        .del-btn:hover{background:#ef4444;color:white;}

        .date-divider-line { flex: 1; height: 1px; background: var(--border); }

        @media (min-width: 640px) {
          .stat-grid { grid-template-columns: repeat(4, 1fr); gap: 14px; }
          .stat-mini { padding: 16px; }
          .filter-row-layout { display: flex; flex-wrap: wrap; gap: 10px; }
          .filter-label-wrap { grid-column: auto; }
          .chips-scroll-wrap { grid-column: auto; overflow-x: visible; padding-bottom: 0; }
          .exp-select { width: auto; }
          .exp-row { padding: 14px 16px; }
        }
      `}</style>

      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 16px" }}>
        <div className="fade" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: "calc(20px + 0.5vw)", fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>Expenses</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2, marginBottom: 0 }}>{filtered.length} transactions found</p>
          </div>
          <button
            onClick={() => navigate("/add-expense")}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", borderRadius: 12, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", boxShadow: "0 4px 12px rgba(99,102,241,0.3)", whiteSpace: "nowrap" }}
          >
            <Plus size={14} /> Add Expense
          </button>
        </div>
        <div className="fade stat-grid">
          {[
            { icon: <TrendingDown size={14} color="#ef4444" />, iconBg: "rgba(239,68,68,0.12)", label: "Total Spent", value: `₹${total.toLocaleString()}` },
            { icon: <Receipt size={14} color="#6366f1" />, iconBg: "rgba(99,102,241,0.12)", label: "Transactions", value: filtered.length },
            { icon: <Tag size={14} color="#f59e0b" />, iconBg: "rgba(245,158,11,0.12)", label: "Avg Expense", value: `₹${avg.toLocaleString()}` },
            { icon: <TrendingDown size={14} color="#8b5cf6" />, iconBg: "rgba(139,92,246,0.12)", label: "Highest Spent", value: `₹${highest.toLocaleString()}` },
          ].map(({ icon, iconBg, label, value }) => (
            <div key={label} className="stat-mini">
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <div style={{ width: 26, height: 26, background: iconBg, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{icon}</div>
                <p style={{ color: "var(--text-muted)", fontSize: 11, fontWeight: 500, margin: 0, whiteSpace: "nowrap" }}>{label}</p>
              </div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 16, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>{value}</p>
            </div>
          ))}
        </div>
        <div className="fade" style={{ background: "var(--bg-card)", borderRadius: 18, padding: 14, marginBottom: 20, border: "1px solid var(--border)", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
          <div style={{ position: "relative", marginBottom: 12 }}>
            <Search size={15} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input className="exp-input" placeholder="Search by description or category..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>

          <div className="filter-row-layout">
            <div className="filter-label-wrap">
              <Filter size={12} /> Filters:
            </div>

            <select className="exp-select" value={time} onChange={e => setTime(e.target.value)}>
              {timeOptions.map(o => <option key={o}>{o}</option>)}
            </select>

            <select className="exp-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="highest">Highest Amount</option>
              <option value="lowest">Lowest Amount</option>
            </select>

            <div className="chips-scroll-wrap">
              {["All", "Food & Dining", "Transportation", "Shopping", "Entertainment", "Other"].map(cat => (
                <button
                  key={cat}
                  className={`cat-chip ${category === cat ? "cat-chip-active" : "cat-chip-inactive"}`}
                  onClick={() => setCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 12px" }}>
            <p style={{ fontSize: 40, marginBottom: 12, margin: 0 }}>🔍</p>
            <p style={{ color: "var(--text-muted)", fontSize: 14, fontWeight: 500, margin: "8px 0 0" }}>No expenses matched your search criteria.</p>
            <button
              onClick={() => navigate("/add-expense")}
              style={{ marginTop: 16, padding: "10px 18px", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", border: "none", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
            >
              + Add First Expense
            </button>
          </div>
        ) : (
          Object.entries(grouped).map(([date, exps]) => (
            <div key={date} className="fade" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Calendar size={12} color="var(--text-muted)" />
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.03em" }}>{date}</p>
                <div className="date-divider-line" />
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--accent)", margin: 0 }}>₹{exps.reduce((s, e) => s + Number(e.amount), 0).toLocaleString()}</p>
              </div>

              {exps.map(exp => {
                const cat = getCat(exp.category);
                return (
                  <div key={exp._id} className="exp-row">
                    <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
                      <div style={{ width: 38, height: 38, background: cat.bg, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                        {cat.icon}
                      </div>
                      <div style={{ overflow: "hidden" }}>
                        <p style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13, margin: "0 0 2px 0", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                          {exp.description || "No description"}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: cat.color, background: cat.bg, padding: "1px 6px", borderRadius: 99, whiteSpace: "nowrap" }}>
                            {exp.category}
                          </span>
                          <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap" }}>
                            {new Date(exp.date).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                      <p style={{ fontFamily: "'Syne',sans-serif", fontSize: 15, fontWeight: 800, color: "var(--danger)", margin: 0, whiteSpace: "nowrap" }}>
                        -₹{Number(exp.amount).toLocaleString()}
                      </p>
                      <button className="del-btn" onClick={() => openDeleteTargetModal(exp._id)}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}
      </div>

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        loading={deleteLoading}
        onClose={() => setDeleteModal({ isOpen: false, expenseId: null })}
        onConfirm={handleExecuteDelete}
        title="Delete Transaction?"
        message="Are you sure you want to permanently delete this expense item? This will automatically restore your monthly budget consumption limit."
      />
    </div>
  );
}

export default Expenses;