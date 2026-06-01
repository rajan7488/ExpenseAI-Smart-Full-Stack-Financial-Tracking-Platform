import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import socket from "../../../Socket";
import { ShieldCheck, Loader2, XCircle } from "lucide-react";

// This page is the redirect landing after the user approves consent on Setu's AA screen.
// Setu redirects here with ?consentId=... and ?status=SUCCESS or FAILURE.
// The actual webhook (CONSENT_STATUS_UPDATE → FI_NOTIFICATION) is fired
// server-to-server by Setu directly to your backend — we just wait for the
// bank_sync_complete socket event here.

export default function BankRedirectSandbox() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { refreshUser } = useAuth();

    const [status, setStatus] = useState("waiting"); // waiting | success | error
    const [message, setMessage] = useState("Waiting for your bank to confirm the connection...");

    const consentId = searchParams.get("consentId");
    const setuStatus = searchParams.get("status"); // SUCCESS or FAILURE from Setu redirect

    useEffect(() => {
        // If Setu redirected with a failure status, show error immediately
        if (setuStatus && setuStatus !== "SUCCESS") {
            setStatus("error");
            setMessage("Consent was declined or cancelled. Please try again.");
            setTimeout(() => navigate("/profile"), 4000);
            return;
        }

        if (!consentId) {
            setStatus("error");
            setMessage("Invalid consent reference. Redirecting back...");
            setTimeout(() => navigate("/profile"), 3000);
            return;
        }

        // Listen for bank_sync_complete socket event fired by our backend
        // after Setu's webhook delivers the transaction data
        const handleSyncComplete = ({ success }) => {
            if (success) {
                setStatus("success");
                setMessage("Transactions imported! Returning to your profile...");
                refreshUser();
                setTimeout(() => navigate("/profile?synced=1"), 3000);
            } else {
                setStatus("error");
                setMessage("Sync failed. Please try again from your profile.");
                setTimeout(() => navigate("/profile"), 4000);
            }
        };

        socket.on("bank_sync_complete", handleSyncComplete);

        // Fallback: if webhook takes too long (ngrok delay, sandbox latency),
        // still redirect after 60s so user isn't stuck
        const timeout = setTimeout(() => {
            setStatus("success");
            setMessage("Bank linked! Transactions may take a moment to appear.");
            refreshUser();
            setTimeout(() => navigate("/profile?synced=1"), 2000);
        }, 60000);

        return () => {
            socket.off("bank_sync_complete", handleSyncComplete);
            clearTimeout(timeout);
        };
    }, [consentId, setuStatus, navigate, refreshUser]);

    return (
        <div style={{
            minHeight: "100vh",
            background: "#0d0d1f",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'DM Sans', sans-serif",
            color: "white",
        }}>
            <div style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 24,
                padding: 40,
                maxWidth: 420,
                width: "100%",
                textAlign: "center",
                backdropFilter: "blur(10px)",
            }}>
                {status === "waiting" && (
                    <>
                        <Loader2
                            size={44}
                            style={{ color: "#6366f1", margin: "0 auto 20px", animation: "spin 1s linear infinite" }}
                        />
                        <h2 style={{ fontSize: 20, margin: "0 0 8px" }}>Connecting Your Bank</h2>
                        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 20px" }}>
                            {message}
                        </p>
                        <div style={{
                            background: "rgba(99,102,241,0.08)",
                            border: "1px solid rgba(99,102,241,0.2)",
                            borderRadius: 12,
                            padding: "12px 16px",
                            fontSize: 12,
                            color: "rgba(255,255,255,0.4)",
                            lineHeight: 1.6,
                        }}>
                            Your bank is securely sharing transaction data via RBI-regulated Account Aggregator framework.
                            This may take up to 30 seconds.
                        </div>
                    </>
                )}

                {status === "success" && (
                    <>
                        <div style={{
                            width: 64,
                            height: 64,
                            background: "rgba(16,185,129,0.15)",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 20px",
                            border: "1px solid rgba(16,185,129,0.3)",
                        }}>
                            <ShieldCheck size={30} color="#10b981" />
                        </div>
                        <h2 style={{ fontSize: 20, margin: "0 0 8px", color: "#6ee7b7" }}>Bank Connected!</h2>
                        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>{message}</p>
                    </>
                )}

                {status === "error" && (
                    <>
                        <div style={{
                            width: 64,
                            height: 64,
                            background: "rgba(239,68,68,0.12)",
                            borderRadius: "50%",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            margin: "0 auto 20px",
                            border: "1px solid rgba(239,68,68,0.25)",
                        }}>
                            <XCircle size={30} color="#ef4444" />
                        </div>
                        <h2 style={{ fontSize: 20, margin: "0 0 8px", color: "#fca5a5" }}>Connection Failed</h2>
                        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: 0 }}>{message}</p>
                    </>
                )}
            </div>

            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    );
}