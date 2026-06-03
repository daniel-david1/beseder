"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function hebrewAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login") || m.includes("invalid credentials")) return "אימייל או סיסמה שגויים";
  if (m.includes("email not confirmed")) return "המייל עוד לא אומת. בדוק את תיבת הדואר שלך";
  if (m.includes("rate limit") || m.includes("too many")) return "יותר מדי ניסיונות. נסה שוב בעוד כמה דקות";
  if (m.includes("network") || m.includes("fetch")) return "בעיית חיבור לרשת. בדוק את האינטרנט ונסה שוב";
  if (m.includes("user not found")) return "לא נמצא חשבון עם האימייל הזה";
  return "משהו השתבש. נסה שוב";
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setError(hebrewAuthError(error.message)); setLoading(false); return; }
    router.push("/dashboard");
    router.refresh();
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B1B2B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px", fontFamily: "Heebo, sans-serif" }}>
      {/* Background orbs — same as landing page nav */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "10%", left: "5%", width: 500, height: 500, background: "radial-gradient(circle, rgba(31,174,181,0.08) 0%, transparent 65%)", filter: "blur(60px)" }}/>
        <div style={{ position: "absolute", bottom: "10%", right: "5%", width: 400, height: 400, background: "radial-gradient(circle, rgba(31,174,181,0.07) 0%, transparent 65%)", filter: "blur(60px)" }}/>
        <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 600, height: 600, background: "radial-gradient(circle, rgba(14,95,168,0.07) 0%, transparent 60%)", filter: "blur(80px)" }}/>
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 420 }}>
        {/* Logo — same PNG as landing page */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 44 }}>
          <a href="/" style={{ display: "block", lineHeight: 0 }}>
            <img
              src="/beseder_white_2x.png"
              alt="beseder"
              style={{ height: 56, width: "auto", maxWidth: 200, marginTop: -8, marginBottom: -8 }}
            />
          </a>
        </div>

        {/* Card */}
        <div style={{
          background: "rgba(232,244,246,0.04)",
          border: "1px solid rgba(232,244,246,0.09)",
          borderRadius: 20,
          padding: "40px 36px",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          boxShadow: "0 24px 64px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.04) inset",
        }}>
          <h1 style={{ fontFamily: "Heebo, sans-serif", fontWeight: 800, fontSize: 26, color: "#F0F6F8", marginBottom: 6, textAlign: "center", letterSpacing: "-0.02em" }}>
            ברוך הבא
          </h1>
          <p style={{ fontFamily: "Heebo, sans-serif", fontSize: 15, color: "rgba(232,244,246,0.42)", textAlign: "center", marginBottom: 32 }}>
            התחבר לסביבת העבודה שלך
          </p>

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div>
              <label style={{ fontFamily: "Heebo, sans-serif", fontSize: 12, fontWeight: 700, color: "rgba(232,244,246,0.45)", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: 7 }}>
                אימייל
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                dir="ltr"
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 12,
                  background: "rgba(232,244,246,0.06)", border: "1px solid rgba(232,244,246,0.11)",
                  color: "#F0F6F8", fontFamily: "Heebo, sans-serif", fontSize: 15,
                  outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
                }}
                onFocus={e => (e.target.style.borderColor = "rgba(31,174,181,0.6)")}
                onBlur={e => (e.target.style.borderColor = "rgba(232,244,246,0.11)")}
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                <label style={{ fontFamily: "Heebo, sans-serif", fontSize: 12, fontWeight: 700, color: "rgba(232,244,246,0.45)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  סיסמה
                </label>
                <a href="/reset-password" style={{ fontFamily: "Heebo, sans-serif", fontSize: 12, color: "rgba(31,174,181,0.85)", textDecoration: "none", fontWeight: 600 }}>
                  שכחת סיסמה?
                </a>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  dir="ltr"
                  style={{
                    width: "100%", padding: "12px 44px 12px 16px", borderRadius: 12,
                    background: "rgba(232,244,246,0.06)", border: "1px solid rgba(232,244,246,0.11)",
                    color: "#F0F6F8", fontFamily: "Heebo, sans-serif", fontSize: 15,
                    outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
                  }}
                  onFocus={e => (e.target.style.borderColor = "rgba(31,174,181,0.6)")}
                  onBlur={e => (e.target.style.borderColor = "rgba(232,244,246,0.11)")}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? "הסתר סיסמה" : "הצג סיסמה"}
                  style={{
                    position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", cursor: "pointer", padding: 4,
                    color: "rgba(232,244,246,0.45)", fontSize: 16, lineHeight: 0,
                  }}
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
              type="submit"
              disabled={loading}
              style={{
                marginTop: 8, padding: "14px 20px", borderRadius: 12, border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                background: loading ? "rgba(31,174,181,0.4)" : "linear-gradient(135deg, #1FAEB5, #0E5FA8)",
                color: "#fff", fontFamily: "Heebo, sans-serif", fontWeight: 800, fontSize: 16,
                letterSpacing: "-0.01em",
                transition: "opacity 0.2s, transform 0.15s",
                boxShadow: loading ? "none" : "0 4px 20px rgba(14,95,168,0.28)",
              }}
              onMouseEnter={e => { if (!loading) (e.target as HTMLButtonElement).style.opacity = "0.9"; }}
              onMouseLeave={e => { (e.target as HTMLButtonElement).style.opacity = "1"; }}
            >
              {loading ? "נכנס..." : "כניסה ←"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 24, fontFamily: "Heebo, sans-serif", fontSize: 14, color: "rgba(232,244,246,0.32)" }}>
            אין לך חשבון?{" "}
            <a href="/signup" style={{ color: "#1FAEB5", fontWeight: 700, textDecoration: "none" }}>הרשם חינם</a>
          </p>
        </div>

        {/* Back to site */}
        <p style={{ textAlign: "center", marginTop: 20, fontFamily: "Heebo, sans-serif", fontSize: 13, color: "rgba(232,244,246,0.22)" }}>
          <a href="/" style={{ color: "rgba(232,244,246,0.35)", textDecoration: "none" }}>← חזרה לאתר</a>
        </p>
      </div>
    </div>
  );
}
