import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../api";
import toast from "react-hot-toast";
import { Upload, Sparkles, ArrowLeft, IndianRupee, FileText, Check, Camera } from "lucide-react";

const CATEGORIES = [
  { value: "Food & Dining", icon: "🍔", color: "#f97316", bg: "rgba(249,115,22,0.12)" },
  { value: "Transportation", icon: "🚗", color: "#3b82f6", bg: "rgba(59,130,246,0.12)" },
  { value: "Bills & Utilities", icon: "📄", color: "#ef4444", bg: "rgba(239,68,68,0.12)" },
  { value: "Shopping", icon: "🛍️", color: "#ec4899", bg: "rgba(236,72,153,0.12)" },
  { value: "Entertainment", icon: "🎬", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)" },
  { value: "Healthcare", icon: "💊", color: "#10b981", bg: "rgba(16,185,129,0.12)" },
  { value: "Education", icon: "📚", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
  { value: "Other", icon: "📦", color: "#6366f1", bg: "rgba(99,102,241,0.12)" },
];

function useBreakpoint() {
  const [w, setW] = useState(typeof window !== "undefined" ? window.innerWidth : 1280);
  if (typeof window !== "undefined") {
    window.addEventListener("resize", () => setW(window.innerWidth));
  }
  return { isMobile: w < 640 };
}

function AddExpense({ onSuccess }) {
  const navigate = useNavigate();
  const { isMobile } = useBreakpoint();
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [focused, setFocused] = useState("");
  const [form, setForm] = useState({ amount: "", category: "", description: "" });

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.amount || !form.category) return toast.error("Amount and category are required");
    try {
      setLoading(true);
      await API.post("/expenses", form);
      toast.success("Expense added 🚀");
      setForm({ amount: "", category: "", description: "" });
      if (onSuccess) onSuccess();
      navigate("/expenses");
    } catch { toast.error("Failed to add expense"); }
    finally { setLoading(false); }
  };

  const handleReceiptUpload = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("receipt", file);
    setOcrLoading(true);
    try {
      const ocrRes = await API.post("/ocr/scan", formData);
      const aiRes = await API.post("/ai/parse", { text: ocrRes.data.extractedText });
      setForm(prev => ({ ...prev, amount: aiRes.data.amount || "", category: aiRes.data.category || "", description: aiRes.data.description || "" }));
      toast.success("Receipt scanned 📸");
    } catch { toast.error("Failed to scan receipt"); }
    finally { setOcrLoading(false); }
  };

  const selectedCat = CATEGORIES.find(c => c.value === form.category);

  return (
    <div style={{ background: "var(--bg-primary)", minHeight: "100vh", fontFamily: "'DM Sans',sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
        .fade {animation:fadeUp 0.4s ease forwards}
        .fade2{animation:fadeUp 0.4s ease 0.08s forwards;opacity:0}
        .fade3{animation:fadeUp 0.4s ease 0.16s forwards;opacity:0}
        .fade4{animation:fadeUp 0.4s ease 0.24s forwards;opacity:0}
        .fade5{animation:fadeUp 0.4s ease 0.32s forwards;opacity:0}

        .amount-input{
          width:100%;border:none;outline:none;
          background:transparent;
          font-family:'Syne',sans-serif;
          font-size:48px;font-weight:800;
          text-align:center;
          padding:8px 0;
          caret-color:#6366f1;
        }
        .amount-input::placeholder{color:var(--text-muted)}

        .cat-btn{
          border-radius:14px;border:2px solid var(--border);
          background:var(--bg-card);cursor:pointer;
          transition:all 0.18s ease;
          display:flex;flex-direction:column;
          align-items:center;justify-content:center;
          gap:6px;padding:14px 8px;
          box-shadow:0 1px 3px rgba(0,0,0,0.1);
        }
        .cat-btn:hover{transform:translateY(-2px);box-shadow:0 6px 16px rgba(0,0,0,0.15)}
        .cat-btn.selected{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,0.2)}

        .desc-input{
          width:100%;border:none;outline:none;
          background:transparent;resize:none;
          font-size:14px;font-family:'DM Sans',sans-serif;
          color:var(--text-primary);line-height:1.6;
          box-sizing:border-box;padding:0;
        }
        .desc-input::placeholder{color:var(--text-muted)}

        .upload-zone{
          border:2px dashed var(--border-strong);border-radius:16px;
          padding:28px 20px;text-align:center;
          cursor:pointer;transition:all 0.2s;
          background:rgba(99,102,241,0.04);
          display:block;
        }
        .upload-zone:hover{border-color:#a78bfa;background:rgba(167,139,250,0.12)}

        .submit-btn{
          width:100%;padding:16px;border-radius:16px;
          font-size:16px;font-weight:700;
          font-family:'DM Sans',sans-serif;
          color:white;border:none;cursor:pointer;
          background:linear-gradient(135deg,#6366f1,#8b5cf6);
          box-shadow:0 6px 24px rgba(99,102,241,0.4);
          transition:all 0.2s;letter-spacing:0.01em;
        }
        .submit-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 32px rgba(99,102,241,0.45)}
        .submit-btn:disabled{opacity:0.6;cursor:not-allowed}

        .back-btn{
          width:40px;height:40px;
          background:var(--bg-card);
          border:1px solid var(--border);
          border-radius:12px;
          display:flex;align-items:center;justify-content:center;
          cursor:pointer;color:var(--text-primary);
          box-shadow:0 1px 4px rgba(0,0,0,0.1);
          flex-shrink:0;
        }
        .back-btn:hover{background:var(--bg-card-hover);border-color:var(--border-strong)}

        .section-card{
          background:var(--bg-card);
          border:1px solid var(--border);
          box-shadow:0 1px 6px rgba(0,0,0,0.08);
          transition:all 0.2s;
        }
        .section-card-focused{
          border:1.5px solid var(--accent) !important;
          box-shadow:0 0 0 4px var(--accent-glow) !important;
        }

        .section-label{
          display:block;font-size:13px;font-weight:700;
          color:var(--text-secondary);
          margin-bottom:12px;letter-spacing:0.02em;
        }
      `}</style>

      <div style={{ maxWidth: 560, margin: "0 auto", padding: isMobile ? "16px 14px 32px" : "32px 24px 40px" }}>
        <div className="fade" style={{
          display: "flex", alignItems: "center", gap: 14,
          marginBottom: isMobile ? 20 : 28,
          paddingLeft: isMobile ? 52 : 0,
        }}>
          <button className="back-btn" onClick={() => navigate("/expenses")}>
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: isMobile ? 20 : 26, fontWeight: 800, color: "var(--text-primary)", margin: 0 }}>
              Add Expense
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 2, marginBottom: 0 }}>Track your daily spending</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: isMobile ? 12 : 14 }}>
          <div className="fade2" style={{
            background: selectedCat
              ? `linear-gradient(135deg, ${selectedCat.color}20, ${selectedCat.color}08)`
              : "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(139,92,246,0.05))",
            borderRadius: 24,
            padding: isMobile ? "24px 20px" : "28px 28px",
            border: `2px solid ${selectedCat ? selectedCat.color + "35" : "rgba(99,102,241,0.2)"}`,
            boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
            transition: "all 0.3s",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginBottom: 4 }}>
              <IndianRupee size={22} color={selectedCat?.color || "var(--accent)"} style={{ marginTop: 6 }} />
              <input
                type="number" name="amount" value={form.amount}
                onChange={handleChange} placeholder="0"
                className="amount-input"
                onFocus={() => setFocused("amount")} onBlur={() => setFocused("")}
                required
                style={{
                  color: selectedCat?.color || "var(--text-primary)",
                  width: "100%", maxWidth: 240,
                }}
              />
            </div>
            <p style={{ textAlign: "center", fontSize: 12, color: selectedCat?.color || "var(--text-muted)", fontWeight: 600, marginTop: 0, marginBottom: 0 }}>
              {form.amount ? `₹ ${Number(form.amount).toLocaleString("en-IN")}` : "Enter amount"}
            </p>
          </div>

          {/* CATEGORY CARD */}
          <div className="fade3 section-card" style={{ borderRadius: 22, padding: isMobile ? "18px 16px" : "22px 22px" }}>
            <label className="section-label">
              CATEGORY <span style={{ color: "#ef4444" }}>*</span>
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: isMobile ? 8 : 10 }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  type="button"
                  className={`cat-btn ${form.category === cat.value ? "selected" : ""}`}
                  onClick={() => setForm({ ...form, category: cat.value })}
                  style={form.category === cat.value ? {
                    background: cat.bg,
                    borderColor: cat.color,
                    boxShadow: `0 6px 20px ${cat.color}35`,
                  } : {}}
                >
                  <span style={{ fontSize: isMobile ? 20 : 22 }}>{cat.icon}</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, lineHeight: 1.2,
                    color: form.category === cat.value ? cat.color : "var(--text-secondary)",
                    textAlign: "center",
                  }}>
                    {cat.value.split(" ")[0]}
                  </span>
                </button>
              ))}
            </div>

            {selectedCat && (
              <div style={{
                marginTop: 12,
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 14px",
                background: `${selectedCat.color}15`,
                borderRadius: 12,
                border: `1px solid ${selectedCat.color}30`,
              }}>
                <Check size={14} color={selectedCat.color} />
                <span style={{ fontSize: 13, fontWeight: 600, color: selectedCat.color }}>
                  {selectedCat.icon} {selectedCat.value} selected
                </span>
              </div>
            )}
          </div>
          <div
            className={`fade4 section-card ${focused === "desc" ? "section-card-focused" : ""}`}
            style={{ borderRadius: 22, padding: isMobile ? "18px 16px" : "22px 22px" }}
          >
            <label className="section-label">DESCRIPTION</label>
            <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
              <FileText
                size={16}
                color={focused === "desc" ? "var(--accent)" : "var(--border-strong)"}
                style={{ marginTop: 3, flexShrink: 0, transition: "color 0.2s" }}
              />
              <textarea
                name="description" value={form.description}
                onChange={handleChange}
                placeholder="What did you spend on? (optional)"
                rows={3} className="desc-input"
                onFocus={() => setFocused("desc")} onBlur={() => setFocused("")}
              />
            </div>
          </div>
          <div className="fade5" style={{
            background: "linear-gradient(135deg,#1e1b4b,#312e81)",
            borderRadius: 22,
            padding: isMobile ? "18px 16px" : "20px 22px",
            boxShadow: "0 4px 20px rgba(30,27,75,0.35)",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{ position: "absolute", width: 150, height: 150, background: "rgba(99,102,241,0.2)", borderRadius: "50%", top: -60, right: -40, filter: "blur(30px)", pointerEvents: "none" }} />
            <div style={{ position: "absolute", width: 100, height: 100, background: "rgba(139,92,246,0.15)", borderRadius: "50%", bottom: -30, left: "20%", filter: "blur(20px)", pointerEvents: "none" }} />

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, position: "relative", zIndex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, background: "linear-gradient(135deg,#7c3aed,#6366f1)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 12px rgba(99,102,241,0.4)" }}>
                  <Sparkles size={16} color="white" />
                </div>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, color: "white", margin: 0 }}>AI Receipt Scanner</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", margin: 0 }}>Auto-fill from receipt photo</p>
                </div>
              </div>
              {ocrLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <div style={{ width: 16, height: 16, border: "2px solid rgba(196,181,253,0.3)", borderTop: "2px solid #a78bfa", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.5)" }}>Scanning…</span>
                </div>
              )}
            </div>

            <label className="upload-zone" style={{ position: "relative", zIndex: 1 }}>
              <Camera size={28} color="#a78bfa" style={{ margin: "0 auto 10px", display: "block" }} />
              <p style={{ fontWeight: 600, color: "rgba(255,255,255,0.85)", fontSize: 14, margin: "0 0 3px" }}>Click to upload receipt</p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, margin: 0 }}>JPG, PNG or PDF supported</p>
              <input type="file" style={{ display: "none" }} accept="image/*" onChange={handleReceiptUpload} />
            </label>
          </div>

          {/* SUBMIT */}
          <button type="submit" disabled={loading} className="submit-btn fade5">
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Adding Expense…
              </div>
            ) : (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                {selectedCat?.icon || "💸"} Add Expense
                <span style={{ fontSize: 18 }}>→</span>
              </span>
            )}
          </button>

        </form>
      </div>
    </div>
  );
}

export default AddExpense;