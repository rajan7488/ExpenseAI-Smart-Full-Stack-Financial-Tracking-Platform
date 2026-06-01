import { useState } from "react";
import API from "../../api";
import toast from "react-hot-toast";
import { X, Lock, Eye, EyeOff } from "lucide-react";

function ChangePasswordModal({ isOpen, onClose }) {
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [show, setShow] = useState({ current: false, new: false, confirm: false });
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.newPassword.length < 6) return toast.error("New password must be at least 6 characters.");
    if (form.newPassword !== form.confirmPassword) return toast.error("Passwords do not match.");

    try {
      setLoading(true);
      await API.put("/profile/security/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword
      });
      toast.success("Password changed securely! 🎉");
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.backdrop}>
      <div style={styles.card}>
        <div style={styles.header}>
          <h3 style={styles.title}>Update Security Password 🔐</h3>
          <button onClick={onClose} style={styles.closeBtn}><X size={16} /></button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12, width: "100%" }}>
          {[
            { key: "currentPassword", label: "Current Password", showKey: "current" },
            { key: "newPassword", label: "New Password", showKey: "new" },
            { key: "confirmPassword", label: "Confirm New Password", showKey: "confirm" }
          ].map(({ key, label, showKey }) => (
            <div key={key}>
              <label style={styles.label}>{label}</label>
              <div style={{ position: "relative" }}>
                <Lock size={14} style={styles.inputIcon} />
                <input
                  type={show[showKey] ? "text" : "password"}
                  value={form[key]}
                  onChange={e => setForm({ ...form, [key]: e.target.value })}
                  placeholder="••••••••"
                  required
                  style={styles.input}
                />
                <div onClick={() => setShow({ ...show, [showKey]: !show[showKey] })} style={styles.eyeIcon}>
                  {show[showKey] ? <EyeOff size={14} /> : <Eye size={14} />}
                </div>
              </div>
            </div>
          ))}

          <div style={styles.footer}>
            <button type="button" onClick={onClose} className="cancel-btn" style={styles.cancelBtn}>Cancel</button>
            <button type="submit" disabled={loading} style={styles.saveBtn}>
              {loading ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  backdrop: { position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 },
  card: { width: "100%", maxWidth: "380px", backgroundColor: "#ffffff", borderRadius: "20px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 },
  title: { fontSize: "16px", fontWeight: "700", color: "#111827", margin: 0 },
  closeBtn: { background: "none", border: "none", color: "#9ca3af", cursor: "pointer" },
  label: { display: "block", fontSize: 12, fontWeight: 600, color: "#4b5563", marginBottom: 5 },
  inputIcon: { position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#9ca3af" },
  eyeIcon: { position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", cursor: "pointer", color: "#9ca3af" },
  input: { width: "100%", padding: "10px 40px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: 14, outline: "none", boxSizing: "border-box" },
  footer: { display: "flex", gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, padding: "11px", borderRadius: "12px", border: "1.5px solid #e5e7eb", background: "white", color: "#374151", fontWeight: 600, cursor: "pointer" },
  saveBtn: { flex: 1, padding: "11px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", fontWeight: 600, cursor: "pointer" }
};

export default ChangePasswordModal;