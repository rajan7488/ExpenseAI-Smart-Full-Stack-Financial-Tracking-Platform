import { useState } from "react";
import ReactDOM from "react-dom";
import API from "../../api";
import toast from "react-hot-toast";
import { X, Target, DollarSign } from "lucide-react";

const QUICK_AMOUNTS = [5000, 10000, 20000, 30000, 50000];

function BudgetModal({ isOpen, onClose, onSuccess }) {
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!amount || amount <= 0) return toast.error("Enter a valid amount");
    try {
      setLoading(true);
      await API.put("/budget", { monthlyBudget: Number(amount) });
      localStorage.removeItem("user");
      toast.success("Your Monthly Budget updated 🚀");
      onSuccess();
      onClose();
      setAmount("");
    } catch {
      toast.error("Failed to update budget");
    } finally {
      setLoading(false);
    }
  };

  return ReactDOM.createPortal(
    <div style={{
      position: "fixed",
      top: 0,
      left: 0,
      width: "100vw",
      height: "100vh",
      background: "rgba(15, 23, 42, 0.5)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 99999,
      fontFamily: "'DM Sans',sans-serif",
      padding: "16px",
      boxSizing: "border-box"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Syne:wght@700;800&display=swap');
        @keyframes modalPop{from{opacity:0;transform:scale(0.95) translateY(10px)}to{opacity:1;transform:scale(1) translateY(0)}}
        .budget-input{width:100%;border:1.5px solid #e5e7eb;border-radius:14px;padding:12px 14px 12px 44px;font-size:22px;font-weight:700;font-family:'DM Sans',sans-serif;outline:none;background:#fafafa;transition:all 0.2s;box-sizing:border-box;color:#111827}
        .budget-input:focus{border-color:#6366f1;background:white;box-shadow:0 0 0 4px rgba(99,102,241,0.08)}
        .quick-btn{padding:8px 14px;border-radius:99px;border:1.5px solid #e5e7eb;background:#fafafa;font-size:13px;font-weight:600;font-family:'DM Sans',sans-serif;cursor:pointer;transition:all 0.2s;color:#374151}
        .quick-btn:hover{border-color:#6366f1;background:#eef2ff;color:#6366f1}
      `}</style>

      <div style={{ position: "absolute", inset: 0, zIndex: -1 }} onClick={onClose} />

      <div style={{
        background: "white",
        borderRadius: 24,
        padding: 28,
        width: "100%",
        maxWidth: 420,
        animation: "modalPop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards",
        boxShadow: "0 30px 70px rgba(15,23,42,0.22)",
        boxSizing: "border-box"
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", borderRadius: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Target size={18} color="white" />
            </div>
            <div>
              <p style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 16, color: "#111827", margin: 0 }}>Set Monthly Budget</p>
              <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>How much do you plan to spend?</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, background: "#f8fafc", border: "1px solid #e5e7eb", borderRadius: 9, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "#374151" }}>
            <X size={15} />
          </button>
        </div>
        <div style={{ position: "relative", marginBottom: 14 }}>
          <DollarSign size={18} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" }} />
          <input
            type="number" placeholder="Enter budget amount"
            value={amount} onChange={e => setAmount(e.target.value)}
            className="budget-input"
            autoFocus
            onKeyDown={e => e.key === "Enter" && handleSubmit()}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#9ca3af", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.06em" }}>Quick Select</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {QUICK_AMOUNTS.map(amt => (
              <button type="button" key={amt} className="quick-btn" onClick={() => setAmount(amt.toString())}
                style={amount === amt.toString() ? { borderColor: "#6366f1", background: "#6366f1", color: "white" } : {}}>
                ₹{amt.toLocaleString()}
              </button>
            ))}
          </div>
        </div>
        {amount > 0 && (
          <div style={{ padding: "12px 14px", background: "#eef2ff", borderRadius: 12, marginBottom: 16, border: "1px solid #c7d2fe" }}>
            <p style={{ fontSize: 13, color: "#4338ca", fontWeight: 600, margin: 0 }}>
              Daily limits track: ₹{Math.round(Number(amount) / 30).toLocaleString()} · Weekly guardrails: ₹{Math.round(Number(amount) / 4).toLocaleString()}
            </p>
          </div>
        )}
        <div style={{ display: "flex", gap: 10 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, padding: "12px", borderRadius: 12, border: "1.5px solid #e5e7eb", background: "white", fontSize: 14, fontWeight: 600, fontFamily: "'DM Sans',sans-serif", cursor: "pointer", color: "#374151", transition: "all 0.2s" }}>
            Cancel
          </button>
          <button type="button" onClick={handleSubmit} disabled={loading} style={{ flex: 2, padding: "12px", borderRadius: 12, border: "none", background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "white", fontSize: 14, fontWeight: 700, fontFamily: "'DM Sans',sans-serif", cursor: "pointer", boxShadow: "0 4px 12px rgba(99,102,241,0.3)", transition: "all 0.2s", opacity: loading ? 0.7 : 1 }}>
            {loading ? (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <div style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTop: "2px solid white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                Saving...
              </div>
            ) : "Save Budget →"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default BudgetModal;