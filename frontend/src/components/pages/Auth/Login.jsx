import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../../api";
import { Mail, Lock, Eye, EyeOff, TrendingUp, Shield, Zap, ShieldCheck, ArrowRight, KeyRound } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState("");
  const { loginAction } = useAuth();

  const [is2faRequired, setIs2faRequired] = useState(false);
  const [twoFactorToken, setTwoFactorToken] = useState("");
  const [tempUserId, setTempUserId] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    if (!form.email || !form.password) { toast.error("All fields are required"); return false; }
    if (!form.email.includes("@")) { toast.error("Enter valid email"); return false; }
    if (form.password.length < 6) { toast.error("Password must be 6+ chars"); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (is2faRequired) {
      if (twoFactorToken.length < 6) return toast.error("Please enter a valid 6-digit code.");
      try {
        setLoading(true);
        const res = await API.post("/auth/login", {
          email: form.email,
          password: form.password,
          twoFactorToken,
        });
        const accessToken = res.data.token;
        const userData = {
          _id: res.data._id, name: res.data.name,
          email: res.data.email, profileImage: res.data.profileImage,
        };
        if (!accessToken) throw new Error("Missing token in response.");
        toast.success(`Welcome back, ${userData.name || "User"}! 👋`);
        loginAction(userData, accessToken);
        navigate("/dashboard");
      } catch (err) {
        toast.error(err.response?.data?.message || "Invalid verification code.");
      } finally {
        setLoading(false);
      }
      return;
    }
    if (!validate()) return;

    try {
      setLoading(true);
      const res = await API.post("/auth/login", form);

      if (res.data?.twoFactorRequired) {
        setTempUserId(res.data.userId || res.data.tempUserId);
        setIs2faRequired(true);
        toast("Verification code required 🛡️", { icon: "🛡️" });
        return;
      }

      const token = res.data.token;
      const userData = res.data.user || res.data;

      toast.success(`Welcome back, ${userData.name || "User"}! 👋`);

      loginAction(userData, token);
      navigate("/dashboard");

    } catch (err) {
      toast.error(err.response?.data?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');

        .login-left {
          background: linear-gradient(135deg, #0f0c29, #302b63, #24243e);
          position: relative; overflow: hidden;
        }
        .orb { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.5; animation: float 6s ease-in-out infinite; }
        .orb-1 { width: 350px; height: 350px; background: #6366f1; top: -80px; left: -80px; animation-delay: 0s; }
        .orb-2 { width: 280px; height: 280px; background: #06b6d4; bottom: 50px; right: -60px; animation-delay: 2s; }
        .orb-3 { width: 200px; height: 200px; background: #8b5cf6; top: 40%; left: 30%; animation-delay: 4s; }
        @keyframes float { 0%,100% { transform: translateY(0) scale(1); } 50% { transform: translateY(-20px) scale(1.05); } }

        .grid-bg {
          position: absolute; inset: 0;
          background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }

        .stat-card {
          background: rgba(255,255,255,0.06); backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 16px;
          padding: 14px 18px; display: flex; align-items: center; gap: 12px;
          animation: slideUp 0.6s ease forwards; opacity: 0; transform: translateY(20px);
        }
        .stat-card:nth-child(1) { animation-delay: 0.2s; }
        .stat-card:nth-child(2) { animation-delay: 0.4s; }
        .stat-card:nth-child(3) { animation-delay: 0.6s; }
        @keyframes slideUp { to { opacity: 1; transform: translateY(0); } }

        .input-field {
          width: 100%; padding: 12px 14px 12px 42px;
          border: 1.5px solid #e5e7eb; border-radius: 12px;
          font-size: 14px; font-family: 'DM Sans', sans-serif;
          outline: none; background: #fafafa;
          transition: all 0.2s ease; color: #1f2937; box-sizing: border-box;
        }
        .input-field:focus { border-color: #6366f1; background: white; box-shadow: 0 0 0 4px rgba(99,102,241,0.08); }
        .input-field::placeholder { color: #9ca3af; }

        .sign-in-btn {
          width: 100%; padding: 13px; border-radius: 12px;
          font-size: 15px; font-weight: 600; font-family: 'DM Sans', sans-serif;
          color: white; border: none; cursor: pointer;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          box-shadow: 0 4px 20px rgba(99,102,241,0.35);
          transition: all 0.2s ease;
          display: flex; align-items: center; justify-content: center; gap: 6px;
          box-sizing: border-box;
        }
        .sign-in-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 24px rgba(99,102,241,0.45); }
        .sign-in-btn:active { transform: translateY(0); }
        .sign-in-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .form-card { animation: fadeIn 0.4s cubic-bezier(0.16,1,0.3,1) forwards; width: 100%; box-sizing: border-box; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        .divider { display: flex; align-items: center; gap: 12px; color: #9ca3af; font-size: 12px; margin: 18px 0; }
        .divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: #e5e7eb; }

        .trust-badges-row {
          display: flex; justify-content: center; gap: 12px;
          margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb; flex-wrap: wrap;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="login-left hidden lg:flex flex-col justify-between w-1/2 p-12 text-white relative">
        <div className="grid-bg" />
        <div className="orb orb-1" /><div className="orb orb-2" /><div className="orb orb-3" />

        <div>
          <div className="flex items-center gap-3 mb-2">
            <div style={{ width: 40, height: 40, background: 'linear-gradient(135deg,#6366f1,#06b6d4)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={20} color="white" />
            </div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 22, fontWeight: 800 }}>ExpenseAI</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, margin: 0 }}>Smart financial tracking</p>
        </div>

        <div>
          <h2 style={{ fontFamily: "'Syne',sans-serif", fontSize: "calc(24px + 0.6vw)", fontWeight: 800, lineHeight: 1.2, marginBottom: 14 }}>
            Take control of your<br />
            <span style={{ background: 'linear-gradient(90deg,#6366f1,#06b6d4)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>finances today</span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 14, lineHeight: 1.6, maxWidth: 360, margin: 0 }}>
            AI-powered insights that predict your spending, track your goals, and help you save smarter every month.
          </p>
        </div>

        <div className="space-y-3">
          {[
            { icon: <TrendingUp size={16} color="#6366f1" />, bg: "rgba(99,102,241,0.15)", label: "Avg. savings increase", value: "+23% monthly" },
            { icon: <Zap size={16} color="#06b6d4" />, bg: "rgba(6,182,212,0.15)", label: "AI predictions accuracy", value: "94.7% accurate" },
            { icon: <Shield size={16} color="#8b5cf6" />, bg: "rgba(139,92,246,0.15)", label: "Data security", value: "Bank-grade encryption" },
          ].map(({ icon, bg, label, value }) => (
            <div key={label} className="stat-card">
              <div style={{ width: 34, height: 34, background: bg, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{icon}</div>
              <div>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', margin: 0 }}>{label}</p>
                <p style={{ fontSize: 13, fontWeight: 600, color: 'white', margin: 0 }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-gray-50">
        <div className="form-card max-w-md">

          <div className="flex lg:hidden items-center gap-2 mb-6 justify-center">
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg,#6366f1,#06b6d4)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} color="white" />
            </div>
            <span style={{ fontFamily: "'Syne',sans-serif", fontSize: 20, fontWeight: 800, color: '#1f2937' }}>ExpenseAI</span>
          </div>

          <div className="mb-6 text-center sm:text-left">
            <h1 style={{ fontFamily: "'Syne',sans-serif", fontSize: 26, fontWeight: 800, color: '#111827', margin: 0 }}>
              {is2faRequired ? "Identity Verification 🛡️" : "Welcome back 👋"}
            </h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>
              {is2faRequired ? "Enter your authenticator code" : "Sign in to your account to continue"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {!is2faRequired ? (
              <>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.03em" }}>Email address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'email' ? '#6366f1' : '#9ca3af', transition: 'color 0.2s', zIndex: 1 }} />
                    <input name="email" type="email" placeholder="you@example.com" className="input-field"
                      onChange={handleChange} onFocus={() => setFocused('email')} onBlur={() => setFocused('')} value={form.email} />
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: '#374151', textTransform: "uppercase", letterSpacing: "0.03em" }}>Password</label>
                    <span style={{ fontSize: 12, color: '#6366f1', cursor: 'pointer', fontWeight: 500 }}>Forgot password?</span>
                  </div>
                  <div style={{ position: 'relative' }}>
                    <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'password' ? '#6366f1' : '#9ca3af', transition: 'color 0.2s', zIndex: 1 }} />
                    <input name="password" type={show ? "text" : "password"} placeholder="••••••••" className="input-field" style={{ paddingRight: 44 }}
                      onChange={handleChange} onFocus={() => setFocused('password')} onBlur={() => setFocused('')} value={form.password} />
                    <div onClick={() => setShow(!show)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#9ca3af', zIndex: 1 }}>
                      {show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ animation: "fadeIn 0.3s ease forwards" }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.03em" }}>Authenticator Code</label>
                <div style={{ position: 'relative' }}>
                  <KeyRound size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: twoFactorToken ? '#6366f1' : '#9ca3af', zIndex: 1 }} />
                  <input type="text" maxLength={6} autoFocus placeholder="000000" className="input-field"
                    style={{ textAlign: "center", letterSpacing: "6px", fontSize: "18px", fontWeight: "700" }}
                    value={twoFactorToken}
                    onChange={e => setTwoFactorToken(e.target.value.replace(/\D/g, ""))} />
                </div>
                <p onClick={() => { setIs2faRequired(false); setTwoFactorToken(""); }}
                  style={{ fontSize: 12, color: '#6366f1', cursor: 'pointer', marginTop: 8, fontWeight: 500, width: 'fit-content' }}>
                  ← Back to login
                </p>
              </div>
            )}

            <button type="submit" disabled={loading} className="sign-in-btn" style={{ marginTop: 6 }}>
              {loading
                ? <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
                : is2faRequired
                  ? <><ShieldCheck size={15} /> Verify Account</>
                  : <>Sign In <ArrowRight size={15} /></>
              }
            </button>
          </form>

          <div className="divider">or</div>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', margin: 0 }}>
            Don't have an account?{" "}
            <span onClick={() => navigate("/register")} style={{ color: '#6366f1', fontWeight: 600, cursor: 'pointer' }}>
              Create one free →
            </span>
          </p>

          <div className="trust-badges-row">
            {["🔒 SSL Secured", "⚡ Instant Access", "🛡️ Privacy First"].map(b => (
              <span key={b} style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>{b}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;