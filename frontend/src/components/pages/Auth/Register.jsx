import { useState } from "react";
import { useNavigate } from "react-router-dom";
import API from "../../../api";
import { User, Mail, Lock, Eye, EyeOff, TrendingUp, CheckCircle, Star, Phone, ArrowRight } from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../../context/AuthContext";

function Register() {
  const navigate = useNavigate();
  const { loginAction } = useAuth();

  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState("");

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const getPasswordStrength = (pwd) => {
    if (!pwd) return { label: "", color: "", width: "0%" };
    if (pwd.length < 6) return { label: "Weak", color: "#ef4444", width: "25%" };
    if (pwd.length < 8) return { label: "Fair", color: "#f59e0b", width: "50%" };
    if (pwd.match(/[A-Z]/) && pwd.match(/[0-9]/)) return { label: "Strong", color: "#10b981", width: "100%" };
    return { label: "Good", color: "#6366f1", width: "75%" };
  };

  const strength = getPasswordStrength(form.password);

  const validate = () => {
    if (!form.name || !form.email || !form.phone || !form.password) { toast.error("All fields are required"); return false; }
    if (!form.email.includes("@")) { toast.error("Enter a valid email address"); return false; }
    if (form.phone.length < 10) { toast.error("Enter a valid 10-digit phone number"); return false; }
    if (form.password.length < 6) { toast.error("Password must be at least 6 characters"); return false; }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;
    try {
      setLoading(true);
      const res = await API.post("/auth/register", form);

      await loginAction(res.data, res.data.token);

      toast.success("Account created successfully! 🎉");
      navigate("/dashboard");
    } catch (err) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'DM Sans', sans-serif", boxSizing: "border-box" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700&family=Syne:wght@700;800&display=swap');

        .reg-left {
          background: linear-gradient(145deg, #0a0a1a, #1a0533, #0d1f3c);
          position: relative;
          overflow: hidden;
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.45;
          animation: pulse 7s ease-in-out infinite;
        }
        .orb-a { width: 380px; height: 380px; background: #7c3aed; top: -100px; right: -80px; }
        .orb-b { width: 300px; height: 300px; background: #db2777; bottom: 0px; left: -60px; }
        .orb-c { width: 220px; height: 220px; background: #2563eb; top: 45%; right: 20%; }

        @keyframes pulse {
          0%, 100% { transform: scale(1) translateY(0); opacity: 0.45; }
          50% { transform: scale(1.05) translateY(-10px); opacity: 0.55; }
        }

        .dots-bg {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(rgba(255,255,255,0.07) 1px, transparent 1px);
          background-size: 28px 28px;
        }

        .feature-row {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 14px;
          background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 12px;
          animation: fadeUp 0.5s ease forwards;
          opacity: 0;
          transform: translateY(16px);
        }
        .feature-row:nth-child(1) { animation-delay: 0.15s; }
        .feature-row:nth-child(2) { animation-delay: 0.3s; }
        .feature-row:nth-child(3) { animation-delay: 0.45s; }
        .feature-row:nth-child(4) { animation-delay: 0.6s; }

        @keyframes fadeUp { to { opacity: 1; transform: translateY(0); } }

        .input-wrap { position: relative; width: 100%; }

        .reg-input {
          width: 100%;
          padding: 12px 14px 12px 42px;
          border: 1.5px solid #e5e7eb;
          border-radius: 12px;
          font-size: 14px;
          font-family: 'DM Sans', sans-serif;
          outline: none;
          background: #fafafa;
          transition: all 0.2s ease;
          color: #1f2937;
          box-sizing: border-box;
        }
        .reg-input:focus {
          border-color: #7c3aed;
          background: white;
          box-shadow: 0 0 0 4px rgba(124, 58, 237, 0.08);
        }
        .reg-input::placeholder { color: #9ca3af; }

        .reg-btn {
          width: 100%;
          padding: 13px;
          border-radius: 12px;
          font-size: 15px;
          font-weight: 600;
          font-family: 'DM Sans', sans-serif;
          color: white;
          border: none;
          cursor: pointer;
          background: linear-gradient(135deg, #7c3aed, #db2777);
          box-shadow: 0 4px 16px rgba(124, 58, 237, 0.3);
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          box-sizing: border-box;
        }
        .reg-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 6px 22px rgba(124, 58, 237, 0.4);
        }
        .reg-btn:disabled { opacity: 0.7; cursor: not-allowed; }

        .form-enter {
          animation: slideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          width: 100%;
          box-sizing: border-box;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .strength-bar {
          height: 4px;
          border-radius: 99px;
          background: #e5e7eb;
          margin-top: 6px;
          overflow: hidden;
        }
        .strength-fill { height: 100%; border-radius: 99px; transition: all 0.4s ease; }
        
        .trust-badges-row {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #e5e7eb;
          flex-wrap: wrap;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
      <div className="reg-left hidden lg:flex flex-col justify-between w-[45%] p-12 text-white relative">
        <div className="dots-bg" />
        <div className="orb orb-a" />
        <div className="orb orb-b" />
        <div className="orb orb-c" />
        <div className="relative z-10">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 2 }}>
            <div style={{ width: 36, height: 36, background: 'linear-gradient(135deg, #7c3aed, #db2777)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={18} color="white" />
            </div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 800 }}>ExpenseAI</span>
          </div>
          <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, margin: 0 }}>Your AI-powered finance companion</p>
        </div>

        <div className="relative z-10 my-4">
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 99, padding: '3px 10px', marginBottom: 12 }}>
            <Star size={11} color="#a78bfa" fill="#a78bfa" />
            <span style={{ fontSize: 11, color: '#a78bfa', fontWeight: 600 }}>Free forever plan available</span>
          </div>
          <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "calc(22px + 0.6vw)", fontWeight: 800, lineHeight: 1.2, marginBottom: 10, margin: 0 }}>
            Start your journey<br />
            <span style={{ background: 'linear-gradient(90deg, #a78bfa, #f472b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              to financial freedom
            </span>
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 14, lineHeight: 1.6, maxWidth: 320, marginTop: 10, margin: 0 }}>
            Join thousands of users who are already saving smarter with AI-powered budget tracking.
          </p>
        </div>

        <div className="relative z-10 space-y-2">
          {[
            { emoji: "🤖", title: "AI Budget Analysis", desc: "Groq-powered spending insights" },
            { emoji: "📊", title: "Smart Predictions", desc: "Know your expenses before they happen" },
            { emoji: "🎯", title: "Goal Tracking", desc: "Hit your savings targets every month" },
            { emoji: "⚡", title: "Real-time Alerts", desc: "Never miss a spending limit" },
          ].map(({ emoji, title, desc }) => (
            <div key={title} className="feature-row">
              <div style={{ width: 32, height: 32, background: 'rgba(255,255,255,0.06)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                {emoji}
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'white', margin: 0 }}>{title}</p>
                <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.35)', margin: 0 }}>{desc}</p>
              </div>
              <CheckCircle size={13} color="#a78bfa" style={{ marginLeft: 'auto', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-gray-50">
        <div className="form-enter w-full max-w-md">

          <div className="flex lg:hidden items-center gap-2 mb-6 justify-center">
            <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, #7c3aed, #db2777)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingUp size={16} color="white" />
            </div>
            <span style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800, color: '#1f2937' }}>ExpenseAI</span>
          </div>

          <div className="mb-6 text-center sm:text-left">
            <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: '#111827', marginBottom: 4, margin: 0 }}>
              Create your account 🚀
            </h1>
            <p style={{ color: '#6b7280', fontSize: 13, margin: 0 }}>Start tracking smarter in under 60 seconds</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.03em" }}>Full name</label>
              <div className="input-wrap">
                <User size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'name' ? '#7c3aed' : '#9ca3af', transition: 'color 0.2s', zIndex: 1 }} />
                <input
                  name="name"
                  placeholder="Rajan Singh"
                  className="reg-input"
                  onChange={handleChange}
                  onFocus={() => setFocused('name')}
                  onBlur={() => setFocused('')}
                  value={form.name}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.03em" }}>Email address</label>
              <div className="input-wrap">
                <Mail size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'email' ? '#7c3aed' : '#9ca3af', transition: 'color 0.2s', zIndex: 1 }} />
                <input
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  className="reg-input"
                  onChange={handleChange}
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused('')}
                  value={form.email}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.03em" }}>Phone number</label>
              <div className="input-wrap">
                <Phone size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'phone' ? '#7c3aed' : '#9ca3af', transition: 'color 0.2s', zIndex: 1 }} />
                <input
                  name="phone"
                  type="tel"
                  placeholder="xxxxxxxxxx"
                  className="reg-input"
                  onChange={handleChange}
                  onFocus={() => setFocused('phone')}
                  onBlur={() => setFocused('')}
                  value={form.phone}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.03em" }}>Password</label>
              <div className="input-wrap">
                <Lock size={15} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: focused === 'password' ? '#7c3aed' : '#9ca3af', transition: 'color 0.2s', zIndex: 1 }} />
                <input
                  name="password"
                  type={show ? "text" : "password"}
                  placeholder="Min. 6 characters"
                  className="reg-input"
                  style={{ paddingRight: 44 }}
                  onChange={handleChange}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused('')}
                  value={form.password}
                />
                <div onClick={() => setShow(!show)} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: '#9ca3af', zIndex: 1 }}>
                  {show ? <EyeOff size={15} /> : <Eye size={15} />}
                </div>
              </div>

              {form.password.length > 0 && (
                <div style={{ animation: "fadeUp 0.2s ease forwards" }}>
                  <div className="strength-bar">
                    <div className="strength-fill" style={{ width: strength.width, background: strength.color }} />
                  </div>
                  <p style={{ fontSize: 11, color: strength.color, marginTop: 4, fontWeight: 600, margin: "4px 0 0" }}>
                    {strength.label} password
                  </p>
                </div>
              )}
            </div>

            <p style={{ fontSize: 12, color: '#9ca3af', lineHeight: 1.5, margin: "10px 0" }}>
              By creating an account you agree to our{" "}
              <span style={{ color: '#7c3aed', cursor: 'pointer', fontWeight: 500 }}>Terms of Service</span>
              {" "}and{" "}
              <span style={{ color: '#7c3aed', cursor: 'pointer', fontWeight: 500 }}>Privacy Policy</span>.
            </p>

            <button type="submit" disabled={loading} className="reg-btn" style={{ marginTop: 6 }}>
              {loading ? (
                <div style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', animation: 'spin 0.6s linear infinite' }} />
              ) : (
                <>Create Free Account <ArrowRight size={15} /></>
              )}
            </button>
          </form>

          <p style={{ textAlign: 'center', fontSize: 13, color: '#6b7280', marginTop: 18, margin: "18px 0 0" }}>
            Already have an account?{" "}
            <span onClick={() => navigate("/login")} style={{ color: '#7c3aed', fontWeight: 600, cursor: 'pointer' }}>
              Sign in →
            </span>
          </p>

          <div className="trust-badges-row">
            {["🔒 Secure", "⚡ Instant Setup", "🎁 Free Plan"].map(b => (
              <span key={b} style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>{b}</span>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}

export default Register;