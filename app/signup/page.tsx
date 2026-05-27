"use client";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

function Logo() {
  return (
    <svg width="130" height="48" viewBox="0 0 244 90" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lgs" x1="20" y1="20" x2="72" y2="72" gradientUnits="userSpaceOnUse">
          <stop stopColor="#1FAEB5"/><stop offset="1" stopColor="#0E5FA8"/>
        </linearGradient>
      </defs>
      <rect x="20" y="19" width="52" height="52" rx="15" fill="url(#lgs)"/>
      <rect x="30" y="31" width="32" height="6" rx="3" fill="#fff" opacity="0.95"/>
      <rect x="30" y="42" width="24" height="6" rx="3" fill="#fff" opacity="0.8"/>
      <rect x="30" y="53" width="30" height="6" rx="3" fill="#fff" opacity="0.65"/>
      <text x="90" y="57" fontFamily="Sora, sans-serif" fontSize="30" fontWeight="700" fill="#0B1B2B" letterSpacing="-0.5">beseder</text>
    </svg>
  );
}

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [done, setDone]         = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: name } },
    });
    if (error) { setError(error.message); setLoading(false); return; }
    setDone(true);
    setTimeout(() => router.push("/dashboard"), 1500);
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0B1B2B", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: "15%", right: "10%", width: 400, height: 400, background: "radial-gradient(circle, rgba(31,174,181,0.08) 0%, transparent 70%)", filter: "blur(40px)" }}/>
        <div style={{ position: "absolute", bottom: "15%", left: "10%", width: 300, height: 300, background: "radial-gradient(circle, rgba(14,95,168,0.1) 0%, transparent 70%)", filter: "blur(40px)" }}/>
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: 420 }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 40 }}>
          <a href="/"><Logo /></a>
        </div>

        <div style={{
          background: "rgba(232,244,246,0.04)",
          border: "1px solid rgba(232,244,246,0.1)",
          borderRadius: 24, padding: "40px 36px",
          backdropFilter: "blur(20px)",
        }}>
          {done ? (
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h2 style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 22, color: "#E8F4F6", marginBottom: 8 }}>!נרשמת בהצלחה</h2>
              <p style={{ fontFamily: "Manrope, sans-serif", fontSize: 14, color: "rgba(232,244,246,0.5)" }}>מעביר אותך לדשבורד...</p>
            </div>
          ) : (
            <>
              <h1 style={{ fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 24, color: "#E8F4F6", marginBottom: 6, textAlign: "center" }}>
                התחל בחינם
              </h1>
              <p style={{ fontFamily: "Manrope, sans-serif", fontSize: 14, color: "rgba(232,244,246,0.45)", textAlign: "center", marginBottom: 32 }}>
                Create your free beseder account
              </p>

              <form onSubmit={handleSignup} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontFamily: "Manrope, sans-serif", fontSize: 12, fontWeight: 600, color: "rgba(232,244,246,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    שם מלא / Full name
                  </label>
                  <input
                    type="text" value={name} onChange={e => setName(e.target.value)} required
                    placeholder="Daniel David"
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(232,244,246,0.06)", border: "1px solid rgba(232,244,246,0.12)", color: "#E8F4F6", fontFamily: "Manrope, sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                    onFocus={e => (e.target.style.borderColor = "rgba(31,174,181,0.5)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(232,244,246,0.12)")}
                  />
                </div>

                <div>
                  <label style={{ fontFamily: "Manrope, sans-serif", fontSize: 12, fontWeight: 600, color: "rgba(232,244,246,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    Email
                  </label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)} required
                    placeholder="you@example.com"
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(232,244,246,0.06)", border: "1px solid rgba(232,244,246,0.12)", color: "#E8F4F6", fontFamily: "Manrope, sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                    onFocus={e => (e.target.style.borderColor = "rgba(31,174,181,0.5)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(232,244,246,0.12)")}
                  />
                </div>

                <div>
                  <label style={{ fontFamily: "Manrope, sans-serif", fontSize: 12, fontWeight: 600, color: "rgba(232,244,246,0.5)", letterSpacing: "0.06em", textTransform: "uppercase", display: "block", marginBottom: 6 }}>
                    סיסמה / Password
                  </label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)} required minLength={6}
                    placeholder="לפחות 6 תווים"
                    style={{ width: "100%", padding: "12px 16px", borderRadius: 12, background: "rgba(232,244,246,0.06)", border: "1px solid rgba(232,244,246,0.12)", color: "#E8F4F6", fontFamily: "Manrope, sans-serif", fontSize: 15, outline: "none", boxSizing: "border-box" }}
                    onFocus={e => (e.target.style.borderColor = "rgba(31,174,181,0.5)")}
                    onBlur={e => (e.target.style.borderColor = "rgba(232,244,246,0.12)")}
                  />
                </div>

                {error && (
                  <p style={{ fontFamily: "Manrope, sans-serif", fontSize: 13, color: "#f87171", background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)", borderRadius: 10, padding: "10px 14px" }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit" disabled={loading}
                  style={{ marginTop: 8, padding: "14px", borderRadius: 12, border: "none", cursor: loading ? "not-allowed" : "pointer", background: loading ? "rgba(31,174,181,0.4)" : "linear-gradient(135deg, #1FAEB5, #0E5FA8)", color: "#fff", fontFamily: "Sora, sans-serif", fontWeight: 700, fontSize: 15, transition: "opacity 0.2s" }}
                >
                  {loading ? "רושם..." : "צור חשבון חינם →"}
                </button>
              </form>

              <p style={{ textAlign: "center", marginTop: 24, fontFamily: "Manrope, sans-serif", fontSize: 13, color: "rgba(232,244,246,0.35)" }}>
                כבר יש לך חשבון?{" "}
                <a href="/login" style={{ color: "#1FAEB5", fontWeight: 600, textDecoration: "none" }}>התחבר</a>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
