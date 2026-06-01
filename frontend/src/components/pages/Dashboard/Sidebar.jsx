import { LayoutDashboard, Receipt, BarChart3, Brain, LogOut, Sparkles, Plus, TrendingUp, User } from "lucide-react";
import { useNavigate, NavLink } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";

function Sidebar({ onClose }) {
  const navigate = useNavigate();
  const { user, logoutAction } = useAuth();

  const handleLogout = () => {
    logoutAction();
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/expenses", icon: Receipt, label: "Expenses" },
    { to: "/reports", icon: BarChart3, label: "Reports" },
    { to: "/ai-insights", icon: Brain, label: "AI Insights", badge: "AI" },
    { to: "/profile", icon: User, label: "Profile" },
  ];

  const profilePic = user?.profileImage || user?.avatar;
  const isCustomImage = !!profilePic && profilePic.startsWith("data:");

  return (
    <div style={{
      width: "100%",
      background: "var(--bg-secondary)",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      fontFamily: "'DM Sans', sans-serif",
      boxShadow: "4px 0 24px rgba(0,0,0,0.12)",
      flexShrink: 0,
      overflowY: "auto",
      overflowX: "hidden",
      transition: "background 0.3s ease",
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');

        .nav-link {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          border-radius: 12px;
          text-decoration: none;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s ease;
          position: relative;
        }
        .nav-link.active {
          background: linear-gradient(135deg, rgba(99,102,241,0.9), rgba(139,92,246,0.8));
          color: white;
          box-shadow: 0 4px 12px rgba(99,102,241,0.35);
        }
        .nav-link.inactive {
          color: var(--text-secondary);
        }
        .nav-link.inactive:hover {
          background: var(--bg-input);
          color: var(--text-primary);
        }

        .sidebar-btn {
          width: 100%;
          padding: 11px 14px;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }
        .sidebar-btn:hover { transform: translateY(-1px); }

        .sidebar-divider {
          margin: 16px 0;
          border: none;
          border-top: 1px solid var(--border);
        }

        .user-footer-card {
          background: var(--bg-input);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px 14px;
          margin-bottom: 10px;
          transition: background 0.3s ease, border-color 0.3s ease;
        }

        .user-footer-inner-divider {
          margin-top: 10px;
          padding-top: 10px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
      `}</style>

      {/* ── LOGO ── */}
      <div style={{
        padding: "24px 20px 20px",
        borderBottom: "1px solid var(--border)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            borderRadius: 10, display: "flex", alignItems: "center",
            justifyContent: "center", flexShrink: 0,
            boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
          }}>
            <TrendingUp size={18} color="white" />
          </div>
          <div>
            <h1 style={{
              fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800,
              color: "var(--text-primary)", lineHeight: 1.1, margin: 0,
            }}>
              ExpenseAI
            </h1>
            <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1, marginBottom: 0 }}>
              Smart tracking
            </p>
          </div>
        </div>
      </div>

      {/* ── NAV LINKS ── */}
      <div style={{ flex: 1, padding: "16px 12px", overflowY: "auto" }}>
        <p style={{
          fontSize: 10, fontWeight: 700,
          color: "var(--text-muted)",
          letterSpacing: "0.12em", textTransform: "uppercase",
          marginBottom: 10, paddingLeft: 6,
        }}>
          Navigation
        </p>

        <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {navItems.map(({ to, icon: Icon, label, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `nav-link ${isActive ? "active" : "inactive"}`}
              onClick={() => { if (onClose) onClose(); }}
            >
              {({ isActive }) => (
                <>
                  <Icon size={17} color={isActive ? "white" : "var(--text-secondary)"} />
                  <span style={{ flex: 1 }}>{label}</span>
                  {badge && (
                    <span style={{
                      fontSize: 10,
                      background: isActive ? "rgba(255,255,255,0.25)" : "rgba(124,58,237,0.25)",
                      color: isActive ? "white" : "#a78bfa",
                      padding: "2px 7px", borderRadius: 99, fontWeight: 700,
                    }}>
                      {badge}
                    </span>
                  )}
                  {isActive && (
                    <div style={{
                      position: "absolute", right: 0, top: "50%",
                      transform: "translateY(-50%)",
                      width: 3, height: 20, background: "white",
                      borderRadius: "3px 0 0 3px", opacity: 0.6,
                    }} />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <hr className="sidebar-divider" />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            className="sidebar-btn"
            onClick={() => { navigate("/add-expense"); if (onClose) onClose(); }}
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "white",
              boxShadow: "0 4px 12px rgba(16,185,129,0.25)",
            }}
          >
            <Plus size={16} /> Add Expense
          </button>
          <button
            className="sidebar-btn"
            onClick={() => { navigate("/ai-insights"); if (onClose) onClose(); }}
            style={{
              background: "rgba(124,58,237,0.15)",
              color: "#a78bfa",
              border: "1px solid rgba(124,58,237,0.25)",
            }}
          >
            <Sparkles size={14} /> AI Insights
          </button>
        </div>
      </div>

      {/* ── USER FOOTER ── */}
      <div style={{ padding: "16px 12px", borderTop: "1px solid var(--border)" }}>
        <div className="user-footer-card" onClick={() => { navigate("/profile"); if (onClose) onClose(); }} style={{ cursor: "pointer" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>

            {/* Avatar */}
            <div style={{
              width: 36, height: 36,
              background: "var(--bg-card)",
              borderRadius: 10,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700,
              color: "var(--text-primary)",
              fontSize: isCustomImage ? 0 : 16,
              flexShrink: 0,
              overflow: "hidden",
              border: "1px solid var(--border-strong)",
            }}>
              {isCustomImage ? (
                <img src={profilePic} alt="Profile" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                profilePic || user?.name?.charAt(0)?.toUpperCase() || "U"
              )}
            </div>

            {/* Name & email */}
            <div style={{ minWidth: 0 }}>
              <p style={{
                fontWeight: 700, color: "var(--text-primary)", fontSize: 13,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", margin: 0,
              }}>
                {user?.name || "Guest User"}
              </p>
              <p style={{
                fontSize: 11, color: "var(--text-secondary)",
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                margin: "2px 0 0 0",
              }}>
                {user?.email || "guest@email.com"}
              </p>
            </div>
          </div>

          <div className="user-footer-inner-divider">
            <span style={{
              fontSize: 10, color: "var(--text-muted)",
              fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em",
            }}>
              Free Plan
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <div style={{ width: 6, height: 6, background: "#10b981", borderRadius: "50%", boxShadow: "0 0 6px #10b981" }} />
              <span style={{ fontSize: 10, color: "#6ee7b7", fontWeight: 600 }}>Active</span>
            </div>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="sidebar-btn"
          style={{
            background: "rgba(239,68,68,0.08)",
            color: "rgba(252,165,165,0.9)",
            border: "1px solid rgba(239,68,68,0.2)",
          }}
          onMouseOver={e => {
            e.currentTarget.style.background = "rgba(239,68,68,0.18)";
            e.currentTarget.style.color = "#fca5a5";
          }}
          onMouseOut={e => {
            e.currentTarget.style.background = "rgba(239,68,68,0.08)";
            e.currentTarget.style.color = "rgba(252,165,165,0.9)";
          }}
        >
          <LogOut size={15} /> Logout
        </button>
      </div>
    </div>
  );
}

export default Sidebar;