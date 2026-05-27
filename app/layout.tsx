import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "beseder — ניהול מותגים ופרויקטים",
  description: "מערכת ניהול חכמה לעסקים",
};

function BesederNavbar() {
  return (
    <nav style={{
      position: "fixed", top: 0, right: 0, left: 0, zIndex: 50,
      background: "rgba(255,255,255,0.96)",
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      borderBottom: "1px solid rgba(14,95,168,0.09)",
      height: 56,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "0 24px",
      boxShadow: "0 1px 12px rgba(14,95,168,0.07)",
    }}>
      {/* Tagline (right side in RTL) */}
      <span style={{
        fontSize: 12,
        fontWeight: 500,
        color: "#6b7280",
        fontFamily: "Heebo, system-ui, sans-serif",
        letterSpacing: "0.01em",
      }}>
        ניהול חכם לכל עסק
      </span>

      {/* Logo — LTR so it renders left-to-right on the left side */}
      <div dir="ltr" style={{ lineHeight: 0 }}>
      <svg width="126" height="42" viewBox="0 0 244 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="navG" x1="20" y1="20" x2="72" y2="72" gradientUnits="userSpaceOnUse">
            <stop stopColor="#1FAEB5"/>
            <stop offset="1" stopColor="#0E5FA8"/>
          </linearGradient>
        </defs>
        <rect x="20" y="19" width="52" height="52" rx="15" fill="url(#navG)"/>
        <rect x="30" y="31" width="32" height="6" rx="3" fill="#ffffff" opacity="0.95"/>
        <rect x="30" y="42" width="24" height="6" rx="3" fill="#ffffff" opacity="0.8"/>
        <rect x="30" y="53" width="30" height="6" rx="3" fill="#ffffff" opacity="0.65"/>
        <text x="90" y="57" fontFamily="Sora, sans-serif" fontSize="30" fontWeight="700" fill="#0B1B2B" letterSpacing="-0.5">beseder</text>
      </svg>
      </div>
    </nav>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&family=Sora:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <BesederNavbar />
        <div style={{ paddingTop: 56 }}>
          {children}
        </div>
      </body>
    </html>
  );
}
