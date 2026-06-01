import { useState, useEffect } from "react";
import Sidebar from "../pages/Dashboard/Sidebar";

function Layout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [children]);

  const SIDEBAR_W = 240;

  return (
    <div style={{ display: "flex", height: "100vh", overflow: "hidden", position: "relative" }}>
      {isMobile && (
        <button
          onClick={() => setSidebarOpen(p => !p)}
          aria-label="Toggle menu"
          style={{
            position: "fixed", top: 14, left: 14,
            zIndex: 1100,
            width: 40, height: 40,
            background: sidebarOpen
              ? "rgba(255,255,255,0.15)"
              : "linear-gradient(135deg,#6366f1,#8b5cf6)",
            border: sidebarOpen ? "1px solid rgba(255,255,255,0.2)" : "none",
            borderRadius: 10, cursor: "pointer",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 5,
            boxShadow: "0 4px 14px rgba(99,102,241,0.4)",
            transition: "all 0.2s",
          }}
        >
          <span style={{ width: 18, height: 2, background: "white", borderRadius: 2, transition: "all 0.3s", transform: sidebarOpen ? "rotate(45deg) translate(5px,5px)" : "none" }} />
          <span style={{ width: 18, height: 2, background: "white", borderRadius: 2, transition: "all 0.3s", opacity: sidebarOpen ? 0 : 1 }} />
          <span style={{ width: 18, height: 2, background: "white", borderRadius: 2, transition: "all 0.3s", transform: sidebarOpen ? "rotate(-45deg) translate(5px,-5px)" : "none" }} />
        </button>
      )}
      {isMobile && sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: "fixed", inset: 0, zIndex: 999,
            background: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(2px)",
          }}
        />
      )}
      <div style={{
        flexShrink: 0,
        width: isMobile ? `min(${SIDEBAR_W}px, 80vw)` : SIDEBAR_W,
        height: "100vh",
        position: isMobile ? "fixed" : "sticky",
        top: 0, left: 0,
        zIndex: 1000,
        transform: isMobile
          ? (sidebarOpen ? "translateX(0)" : "translateX(-100%)")
          : "none",
        transition: "transform 0.3s cubic-bezier(0.4,0,0.2,1)",
        overflow: "hidden",
      }}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>
      <div style={{
        flex: 1,
        minWidth: 0,
        width: 0,
        overflowY: "auto",
        height: "100vh",
        background: "var(--bg-primary)",
        transition: "background 0.3s ease",
      }}>
        {children}
      </div>

    </div>
  );
}

export default Layout;