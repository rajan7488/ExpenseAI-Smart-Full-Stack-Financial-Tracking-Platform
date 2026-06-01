// frontend/src/components/ConfirmModal.jsx
import { useEffect } from "react";
import { AlertTriangle, X } from "lucide-react";

function ConfirmModal({ isOpen, onClose, onConfirm, title, message, loading }) {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "unset";
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={styles.backdrop}>
      <style>{`
        @keyframes modalScaleUp {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes backdropFade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .modal-card {
          animation: modalScaleUp 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="modal-card" style={styles.card}>
        {/* Close Button Icon */}
        <button onClick={onClose} disabled={loading} style={styles.closeIconBtn}>
          <X size={16} />
        </button>

        {/* Modal Header Icon Banner */}
        <div style={styles.iconContainer}>
          <AlertTriangle size={24} color="#ef4444" />
        </div>

        {/* Typography Content */}
        <div style={styles.contentWrap}>
          <h3 style={styles.title}>{title || "Are you sure?"}</h3>
          <p style={styles.message}>{message || "This action cannot be undone."}</p>
        </div>

        {/* Action Buttons Footer */}
        <div style={styles.footer}>
          <button 
            onClick={onClose} 
            disabled={loading} 
            style={styles.cancelBtn}
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm} 
            disabled={loading} 
            style={styles.confirmBtn}
          >
            {loading ? (
              <div style={styles.spinner} />
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed",
    inset: 0,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    backdropFilter: "blur(6px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9999,
    padding: "16px",
    animation: "backdropFade 0.2s ease forwards",
  },
  card: {
    width: "100%",
    maxWidth: "400px",
    backgroundColor: "#ffffff",
    borderRadius: "20px",
    padding: "24px",
    position: "relative",
    boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    fontFamily: "'DM Sans', sans-serif",
    boxSizing: "border-box",
  },
  closeIconBtn: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "none",
    border: "none",
    color: "#9ca3af",
    cursor: "pointer",
    padding: "4px",
    borderRadius: "50%",
    transition: "background 0.2s",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    ":hover": { background: "#f3f4f6", color: "#1f2937" }
  },
  iconContainer: {
    width: "56px",
    height: "56px",
    borderRadius: "50%",
    backgroundColor: "#fef2f2",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "16px",
  },
  contentWrap: {
    textAlign: "center",
    marginBottom: "24px",
  },
  title: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#111827",
    margin: "0 0 8px 0",
  },
  message: {
    fontSize: "14px",
    color: "#4b5563",
    margin: 0,
    lineHeight: "1.5",
  },
  footer: {
    display: "flex",
    gap: "12px",
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "12px",
    border: "1.5px solid #e5e7eb",
    backgroundColor: "#ffffff",
    color: "#374151",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    fontFamily: "'DM Sans', sans-serif",
  },
  confirmBtn: {
    flex: 1,
    padding: "12px",
    borderRadius: "12px",
    border: "none",
    backgroundColor: "#ef4444",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'DM Sans', sans-serif",
  },
  spinner: {
    width: "18px",
    height: "18px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid white",
    borderRadius: "50%",
    animation: "spin 0.6s linear infinite",
  }
};

export default ConfirmModal;