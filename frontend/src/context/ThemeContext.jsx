import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    // Read saved preference, default to dark
    const saved = localStorage.getItem("theme");
    return saved ? saved === "dark" : true;
  });

  useEffect(() => {
    // Save preference
    localStorage.setItem("theme", isDark ? "dark" : "light");

    // Apply CSS variables to :root so ALL pages respond instantly
    const root = document.documentElement;
    if (isDark) {
      root.style.setProperty("--bg-primary", "#080d1a");
      root.style.setProperty("--bg-secondary", "#0d1526");
      root.style.setProperty("--bg-card", "rgba(13,21,38,0.75)");
      root.style.setProperty("--bg-card-hover", "rgba(18,28,50,0.9)");
      root.style.setProperty("--bg-input", "rgba(255,255,255,0.05)");
      root.style.setProperty("--border", "rgba(255,255,255,0.08)");
      root.style.setProperty("--border-strong", "rgba(255,255,255,0.14)");
      root.style.setProperty("--text-primary", "#f0f4ff");
      root.style.setProperty("--text-secondary", "#8892a4");
      root.style.setProperty("--text-muted", "#4a5568");
      root.style.setProperty("--accent", "#6366f1");
      root.style.setProperty("--accent-glow", "rgba(99,102,241,0.35)");
      root.style.setProperty("--success", "#10b981");
      root.style.setProperty("--danger", "#ef4444");
      root.style.setProperty("--warning", "#f59e0b");
      root.style.setProperty("--stat-bg", "rgba(255,255,255,0.04)");
      root.style.setProperty("--stat-border", "rgba(255,255,255,0.07)");
      root.style.setProperty("--hover-row", "rgba(99,102,241,0.07)");
      root.style.setProperty("--scrollbar-bg", "#0d1526");
      root.style.setProperty("--scrollbar-thumb", "rgba(99,102,241,0.4)");
      root.setAttribute("data-theme", "dark");
    } else {
      root.style.setProperty("--bg-primary", "#f0f2f8");
      root.style.setProperty("--bg-secondary", "#e8eaf6");
      root.style.setProperty("--bg-card", "rgba(255,255,255,0.92)");
      root.style.setProperty("--bg-card-hover", "rgba(255,255,255,1)");
      root.style.setProperty("--bg-input", "rgba(0,0,0,0.04)");
      root.style.setProperty("--border", "rgba(0,0,0,0.07)");
      root.style.setProperty("--border-strong", "rgba(0,0,0,0.12)");
      root.style.setProperty("--text-primary", "#111827");
      root.style.setProperty("--text-secondary", "#6b7280");
      root.style.setProperty("--text-muted", "#9ca3af");
      root.style.setProperty("--accent", "#6366f1");
      root.style.setProperty("--accent-glow", "rgba(99,102,241,0.2)");
      root.style.setProperty("--success", "#10b981");
      root.style.setProperty("--danger", "#ef4444");
      root.style.setProperty("--warning", "#f59e0b");
      root.style.setProperty("--stat-bg", "rgba(255,255,255,0.9)");
      root.style.setProperty("--stat-border", "#f1f5f9");
      root.style.setProperty("--hover-row", "#f5f7ff");
      root.style.setProperty("--scrollbar-bg", "#e8eaf6");
      root.style.setProperty("--scrollbar-thumb", "rgba(99,102,241,0.3)");
      root.setAttribute("data-theme", "light");
    }
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}