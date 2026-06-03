"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

function hebrewAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("rate limit") || m.includes("too many")) return "יותר מדי ניסיונות. נסה שוב בעוד כמה דקות";
  if (m.includes("invalid email") || m.includes("email address")) return "כתובת אימייל לא תקינה";
  if (m.includes("network") || m.includes("fetch")) return "בעיית חיבור לרשת. בדוק את האינטרנט ונסה שוב";
  return "משהו השתבש. נסה שוב";
}

export default function ResetPasswordPage() {
  const [email, setEmail]     = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const [sent, setSent]       = useState(false);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/update-password` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) { setError(hebrewAuthError(error.message)); setLoading(false); return; }
    setSent(true);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B1B2B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "Heebo, sans-serif" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "10%", left: "5%", width: 500, height: 500, background: "radial-gradient(circle, rgba(31,174,181,0.08) 0%, transparent 65%)", filter: "blur(60px)" }}/>
        <div style={{ position: "absolute", bottom: "10%", right: "5%", width: 400, height: 400, background: "radial-gradient(circle, rgba(31,174,181,0.07) 0%, transparent 65%)", filter: "blur(60px)" }}/>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, background: "radial-gradient(circle, rgba(14,95,168,0.07) 0%, transparent 60%)", filter: "blur(80px)" }}/>
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 44 }}>
          <a href="/" style={{ display: "block", lineHeight: 0 }}>
            <img src="/beseder_white_2x.png" alt="beseder" style={{ height: 56, width: "auto", maxWidth: 200, marginTop: -8, marginBottom: -8 }} />
          </a>
        </div>

        <div style={{
          background: "rgba(232,244,246,0.04)", border: "1px solid rgba(232,244,246,0.09)", borderRadius: 20,
          padding: "40px 36px", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.04) inset",
        }}>
          {sent ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 52, marginBottom: 16 }}>📩</div>
              <h2 style={{ fontWeight: 800, fontSize: 24, color: "#F0F6F8", marginBottom: 8, letterSpacing: "-0.02em" }}>בדוק את המייל</h2>
              <p style={{ fontSize: 15, color: "rgba(232,244,246,0.55)", lineHeight: 1.7 }}>
                אם קיים חשבון עם הכתובת<br/>
                <span dir="ltr" style={{ color: "#1FAEB5", fontWeight: 700 }}>{email}</span><br/>
                שלחנו אליו קישור לאיפוס הסיסמה
              </p>
              <a href="/login" style={{ display: "inline-block", marginTop: 24, color: "#1FAEB5", fontWeight: 700, textDecoration: "none", fontSize: 15 }}>
                חזרה לכניסה ←
              </a>
            </div>
          ) : (
            <>
              <h1 style={{ fontWeight: 800, fontSize: 26, color: "#F0F6F8", marginBottom: 6, textAlign: "center", letterSpacing: "-0.02em" }}>
                איפוס סיסמה
              </h1>
              <p style={{ fontSize: 15, color: "rgba(232,244,246,0.42)", textAlign: "center", marginBottom: 32 }}>
                נשלח לך קישור לאיפוס הסיסמה למייל
              </p>

              <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: "rgba(232,244,246,0.45)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>
                    אימייל
                  </label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="you@example.com" dir="ltr"
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(232,244,246,0.06)", border: "1px solid rgba(232,244,246,0.11)", color: "#F0F6F8", fontFamily: "Heebo, sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box", transition: "border-color 0.15s" }}
                    onFocus={e => (e.target.style.borderColor = "rgba(31,174,181,0.6)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(232,244,246,0.11)")}
                  />
                </div>

                {error && (
                  <p style={{ fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px" }}>
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
                    letterSpacing: "-0.01em", transition: "opacity 0.2s",
                    boxShadow: loading ? "none" : "0 4px 20px rgba(14,95,168,0.28)",
                  }}
                  onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.opacity = "0.9"; }}
                  onMouseLeave={e => { (e.target as HTMLButtonElement).style.opacity = "1"; }}
                >
                  {loading ? "שולח..." : "שלח קישור איפוס ←"}
                </button>
              </form>

              <p style={{ textAlign: "center", marginTop: 24, fontSize: 14, color: "rgba(232,244,246,0.32)" }}>
                נזכרת בסיסמה?{" "}
                <a href="/login" style={{ color: "#1FAEB5", fontWeight: 700, textDecoration: "none" }}>התחבר</a>
              </p>
            </>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 13, color: "rgba(232,244,246,0.22)" }}>
          <a href="/" style={{ color: "rgba(232,244,246,0.35)", textDecoration: "none" }}>← חזרה לאתר</a>
        </p>
      </div>
    </div>
  );
}
