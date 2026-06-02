import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "beseder — ניהול מותגים ופרויקטים",
  description: "מערכת ניהול חכמה לעסקים",
  icons: {
    icon: "/beseder_appicon_HQ.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="icon" href="/beseder_appicon_HQ.png" type="image/png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <meta name="theme-color" content="#1FAEB5" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800;900&family=Sora:wght@400;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
