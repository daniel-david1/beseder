"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function hebrewAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("already registered") || m.includes("already exists") || m.includes("user already")) return "כבר קיים חשבון עם האימייל הזה. נסה להתחבר";
  if (m.includes("password") && m.includes("least")) return "הסיסמה צריכה להכיל לפחות 6 תווים";
  if (m.includes("invalid email") || m.includes("email address")) return "כתובת אימייל לא תקינה";
  if (m.includes("rate limit") || m.includes("too many")) return "יותר מדי ניסיונות. נסה שוב בעוד כמה דקות";
  if (m.includes("network") || m.includes("fetch")) return "בעיית חיבור לרשת. בדוק את האינטרנט ונסה שוב";
  return "משהו השתבש. נסה שוב";
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [done, setDone]         = useState(false);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) { setError(hebrewAuthError(error.message)); setLoading(false); return; }
    // If Supabase returns an active session, email confirmation is disabled → go straight in.
    // Otherwise the user must confirm via email before logging in.
    if (data.session) {
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } else {
      setNeedsConfirm(true);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B1B2B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "Heebo, sans-serif" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "10%", right: "5%", width: 500, height: 500, background: "radial-gradient(circle, rgba(31,174,181,0.08) 0%, transparent 65%)", filter: "blur(60px)" }}/>
        <div style={{ position: "absolute", bottom: "10%", left: "5%", width: 400, height: 400, background: "radial-gradient(circle, rgba(31,174,181,0.07) 0%, transparent 65%)", filter: "blur(60px)" }}/>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, background: "radial-gradient(circle, rgba(14,95,168,0.07) 0%, transparent 60%)", filter: "blur(80px)" }}/>
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 44 }}>
          <a href="/" style={{ display: "block", lineHeight: 0 }}>
            <img
              src="/beseder_white_2x.png"
              alt="beseder"
              style={{ height: 56, width: "auto", maxWidth: 200, marginTop: -8, marginBottom: -8 }}
            />
          </a>
        </div>

        <div style={{
          background: "rgba(232,244,246,0.04)",
          border: "1px solid rgba(232,244,246,0.09)",
          borderRadius: 20,
          padding: "40px 36px",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.04) inset",
        }}>
          {needsConfirm ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>📩</div>
              <h2 style={{ fontFamily: "Heebo, sans-serif", fontWeight: 800, fontSize: 24, color: "#F0F6F8", marginBottom: 8, letterSpacing: "-0.02em" }}>כמעט שם!</h2>
              <p style={{ fontFamily: "Heebo, sans-serif", fontSize: 15, color: "rgba(232,244,246,0.55)", lineHeight: 1.7 }}>
                שלחנו מייל אימות לכתובת<br/>
                <span dir="ltr" style={{ color: "#1FAEB5", fontWeight: 700 }}>{email}</span><br/>
                לחץ על הקישור במייל כדי להפעיל את החשבון
              </p>
              <a href="/login" style={{ display: "inline-block", marginTop: 24, color: "#1FAEB5", fontWeight: 700, textDecoration: "none", fontFamily: "Heebo, sans-serif", fontSize: 15 }}>
                כבר אישרת? התחבר ←
              </a>
            </div>
          ) : done ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontFamily: "Heebo, sans-serif", fontWeight: 800, fontSize: 24, color: "#F0F6F8", marginBottom: 8, letterSpacing: "-0.02em" }}>נרשמת בהצלחה!</h2>
              <p style={{ fontFamily: "Heebo, sans-serif", fontSize: 15, color: "rgba(232,244,246,0.45)" }}>מעביר אותך לדשבורד...</p>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: "Heebo, sans-serif", fontWeight: 800, fontSize: 26, color: "#F0F6F8", marginBottom: 6, textAlign: "center", letterSpacing: "-0.02em" }}>
                התחל בחינם
              </h1>
              <p style={{ fontFamily: "Heebo, sans-serif", fontSize: 15, color: "rgba(232,244,246,0.42)", textAlign: "center", marginBottom: 32 }}>
                צור את חשבון beseder שלך
              </p>

              <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontFamily: "Heebo, sans-serif", fontSize: 12, fontWeight: 700, color: "rgba(232,244,246,0.45)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>
                    שם מלא
                  </label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)} required
                    placeholder="דניאל דוד"
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(232,244,246,0.06)", border: "1px solid rgba(232,244,246,0.11)", color: "#F0F6F8", fontFamily: "Heebo, sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                    onFocus={e => (e.target.style.borderColor = "rgba(31,174,181,0.6)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(232,244,246,0.11)")}
                  />
                </div>

                <div>
                  <label style={{ fontFamily: "Heebo, sans-serif", fontSize: 12, fontWeight: 700, color: "rgba(232,244,246,0.45)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>
                    אימייל
                  </label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="you@example.com"
                    dir="ltr"
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(232,244,246,0.06)", border: "1px solid rgba(232,244,246,0.11)", color: "#F0F6F8", fontFamily: "Heebo, sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                    onFocus={e => (e.target.style.borderColor = "rgba(31,174,181,0.6)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(232,244,246,0.11)")}
                  />
                </div>

                <div>
                  <label style={{ fontFamily: "Heebo, sans-serif", fontSize: 12, fontWeight: 700, color: "rgba(232,244,246,0.45)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>
                    סיסמה
                  </label>
                  <div style={{ position: "relative" }}>
                    <input
                      type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                      placeholder="לפחות 6 תווים"
                      dir="ltr"
                      style={{ width: "100%", padding: "12px 44px 12px 16px", borderRadius: 12, background: "rgba(232,244,246,0.06)", border: "1px solid rgba(232,244,246,0.11)", color: "#F0F6F8", fontFamily: "Heebo, sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                      onFocus={e => (e.target.style.borderColor = "rgba(31,174,181,0.6)")}
                      onBlur={e => (e.target.style.borderColor = "rgba(232,244,246,0.11)")}
                    />
                    <button
                      type="button" onClick={() => setShowPw(v => !v)}
                      aria-label={showPw ? "הסתר סיסמה" : "הצג סיסמה"}
                      style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", padding: 4, color: "rgba(232,244,246,0.45)", fontSize: 16, lineHeight: 0 }}
                    >
                      {showPw ? "🙈" : "👁"}
                    </button>
                  </div>
                </div>

                {error && (
                  <p style={{ fontFamily: "Heebo, sans-serif", fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px" }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit" disabled={loading}
                  style={{
                    marginTop: 8, padding: "14px 20px", borderRadius: 12, border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    background: loading ? "rgba(31,174,181,0.4)" : "linear-gradient(135deg, #1FAEB5, #0E5FA8)",
                    color: "#fff", fontFamily: "Heebo, sans-serif", fontWeight: 800, fontSize: 16,
                    letterSpacing: "-0.01em",
                    transition: "opacity 0.2s",
                    boxShadow: loading ? "none" : "0 4px 20px rgba(14,95,168,0.28)",
                  }}
                  onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.opacity = "0.9"; }}
                  onMouseLeave={e => { (e.target as HTMLButtonElement).style.opacity = "1"; }}
                >
                  {loading ? "רושם..." : "צור חשבון חינם ←"}
                </button>
              </form>

              <p style={{ textAlign: "center", marginTop: 24, fontFamily: "Heebo, sans-serif", fontSize: 14, color: "rgba(232,244,246,0.32)" }}>
                כבר יש לך חשבון?{" "}
                <a href="/login" style={{ color: "#1FAEB5", fontWeight: 700, textDecoration: "none" }}>התחבר</a>
              </p>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontFamily: "Heebo, sans-serif", fontSize: 13 }}>
          <a href="/" style={{ color: "rgba(232,244,246,0.35)", textDecoration: "none" }}>← חזרה לאתר</a>
        </p>
      </div>
    </div>
  );
}
