import { useState, useEffect } from "react";
import API from "../../api";
import toast from "react-hot-toast";
import { X, ShieldCheck } from "lucide-react";

function TwoFactorModal({ isOpen, onClose, isCurrentlyEnabled, onStatusUpdated }) {
    const [step, setStep] = useState(1);
    const [qrCode, setQrCode] = useState("");
    const [secret, setSecret] = useState("");
    const [token, setToken] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setToken(""); // Clear stale token inputs on open
            if (isCurrentlyEnabled) {
                setStep(3); // Go straight to deactivation flow if enabled
            } else {
                init2FASetup();
            }
        }
    }, [isOpen, isCurrentlyEnabled]);

    const init2FASetup = async () => {
        try {
            const res = await API.post("/profile/security/2fa/setup");
            setQrCode(res.data.qrCodeDataUrl);
            setSecret(res.data.secretCode);
            setStep(1);
        } catch (err) {
            toast.error("Failed to fetch secure code configuration vectors.");
        }
    };

    const handleVerify = async (actionType) => {
        if (token.length < 6) return toast.error("Enter a valid 6-digit confirmation key.");

        const activating = actionType === "enable";

        try {
            setLoading(true);

            // 1. First, verify the time-synced 2FA code token matches on the backend
            await API.post("/profile/security/2fa/verify", {
                token,
                action: actionType
            });

            // 2. ✅ FIXED: Fallback array mapping matches both standard naming conventions cleanly
            await API.put("/notifications/settings", {
                isTwoFactorEnabled: activating,
                twoFactorEnabled: activating
            });

            toast.success(activating ? "Two-factor authentication active! 🛡️" : "2FA deactivated successfully 🔓");

            // Sync status back up to the parent application shell memory state
            onStatusUpdated(activating);
            setToken("");
            onClose();
        } catch (err) {
            toast.error(err.response?.data?.message || "Invalid authentication token match.");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div style={styles.backdrop}>
            <div style={styles.card}>
                <div style={styles.header}>
                    <h3 style={styles.title}>Two-Factor Authentication (2FA) 🛡️</h3>
                    <button onClick={onClose} style={styles.closeBtn}><X size={16} /></button>
                </div>

                {step === 1 && (
                    <div style={{ textAlign: "center", animation: "fadeIn 0.2s ease" }}>
                        <p style={styles.text}>Scan this QR code with Google Authenticator or Microsoft Authenticator app:</p>
                        {qrCode ? (
                            <img src={qrCode} alt="QR Code Setup" style={{ width: 160, height: 160, margin: "10px auto", display: "block" }} />
                        ) : (
                            <div style={{ width: 160, height: 160, margin: "10px auto", background: "#f3f4f6", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#9ca3af" }}>Loading QR...</div>
                        )}
                        <p style={{ fontSize: 11, color: "#6b7280", background: "#f8fafc", padding: "10px", borderRadius: 8, wordBreak: "break-all", marginTop: 10, border: "1px dashed #e2e8f0", fontFamily: "monospace" }}>
                            Key: <strong>{secret}</strong>
                        </p>
                        <button onClick={() => setStep(2)} style={styles.primaryBtn}>Next: Verify Code</button>
                    </div>
                )}

                {step === 2 && (
                    <div style={{ animation: "fadeIn 0.2s ease" }}>
                        <p style={styles.text}>Enter the 6-digit verification sequence key shown inside your Authenticator app module:</p>
                        <input
                            type="text"
                            maxLength={6}
                            placeholder="000000"
                            value={token}
                            onChange={e => setToken(e.target.value.replace(/\D/g, ""))} // Prevent non-numeric characters
                            style={styles.input}
                        />
                        <button onClick={() => handleVerify("enable")} disabled={loading} style={styles.primaryBtn}>
                            {loading ? "Verifying..." : "Activate 2FA Security"}
                        </button>
                    </div>
                )}

                {step === 3 && (
                    <div style={{ animation: "fadeIn 0.2s ease" }}>
                        <div style={{ textAlign: "center", color: "#10b981", marginBottom: 12 }}><ShieldCheck size={36} style={{ margin: "0 auto" }} /></div>
                        <p style={styles.text}>Two-factor authentication is currently active on your account profile framework. Enter your code to turn it off:</p>
                        <input
                            type="text"
                            maxLength={6}
                            placeholder="000000"
                            value={token}
                            onChange={e => setToken(e.target.value.replace(/\D/g, ""))}
                            style={styles.input}
                        />
                        <button onClick={() => handleVerify("disable")} disabled={loading} style={styles.dangerBtn}>
                            {loading ? "Deactivating..." : "Disable 2FA Security"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

const styles = {
    backdrop: { position: "fixed", inset: 0, backgroundColor: "rgba(15,23,42,0.45)", backdropFilter: "blur(6px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 16 },
    card: { width: "100%", maxWidth: "360px", backgroundColor: "#ffffff", borderRadius: "20px", padding: "24px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" },
    header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    title: { fontSize: "15px", fontWeight: "700", color: "#111827", margin: 0 },
    closeBtn: { background: "none", border: "none", color: "#9ca3af", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", padding: 4 },
    text: { fontSize: "13px", color: "#4b5563", lineHeight: 1.5, margin: "0 0 12px 0" },
    input: { width: "100%", padding: "12px", border: "1.5px solid #e5e7eb", borderRadius: "12px", fontSize: 18, fontWeight: "700", textAlign: "center", letterSpacing: "4px", outline: "none", background: "#f9fafb", boxSizing: "border-box", marginBottom: 14, transition: "all 0.2s" },
    primaryBtn: { width: "100%", padding: "12px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #6366f1, #8b5cf6)", color: "white", fontWeight: 600, fontSize: "14px", cursor: "pointer", transition: "transform 0.1s" },
    dangerBtn: { width: "100%", padding: "12px", borderRadius: "12px", border: "none", background: "#ef4444", color: "white", fontWeight: 600, fontSize: "14px", cursor: "pointer", transition: "transform 0.1s" }
};

export default TwoFactorModal;