'use client'
import { useEffect, useRef, useState } from 'react'

const T = {
  en: {
    nav: { features: 'Features', howItWorks: 'How it works', pricing: 'Pricing', signin: 'Sign in', cta: 'Get started free' },
    hero: {
      chip: 'Business OS for Founders',
      h1a: 'Every brand.',
      h1b: 'Every project.',
      h1c: 'One place.',
      sub: 'beseder is the operating system for founders who run multiple businesses. Brands, projects, teams, milestones — structured and clear, finally.',
      cta: 'Get started free →',
      demo: 'Watch demo',
      trust: 'No credit card · Free forever · Cancel anytime',
    },
    proof: [
      { n: '500+', label: 'Active founders' },
      { n: '2,400+', label: 'Brands managed' },
      { n: '18,000+', label: 'Stages completed' },
      { n: '₪0', label: 'To get started' },
    ],
    spotlights: [
      {
        chip: 'Multi-Brand Workspace',
        h3: 'All your businesses. One place.',
        desc: 'Stop jumping between tools and notebooks. beseder gives every brand its own isolated workspace — yet you see them all from one dashboard.',
        bullets: ['Full brand isolation with shared dashboard', 'Unlimited projects per brand', 'Visual portfolio overview'],
      },
      {
        chip: 'AI Wizard',
        h3: 'Build your full structure in one click.',
        desc: 'Tell the AI wizard what your brand does. It auto-generates the projects, departments, and stages tailored to your type of business.',
        bullets: ['Smart brand scaffolding in seconds', 'Adapts to your industry and model', 'Fully editable after generation'],
      },
      {
        chip: 'Financial Tracker',
        h3: 'Built-in finance. No spreadsheet needed.',
        desc: 'Track income, expenses, loans, assets, and cash flow at every level — brand, project, department, or stage. Real-time totals everywhere.',
        bullets: ['Income & expense by frequency', 'Loan & asset tracking', 'Cash flow at every level'],
      },
    ],
    testimonials: [
      { quote: 'beseder changed how I manage all my projects. Finally I have a clear picture.', name: 'Dan L.', title: 'Serial founder' },
      { quote: 'The AI wizard saved me hours of planning. One click and I had a full structure.', name: 'Michal R.', title: 'Marketing manager' },
      { quote: 'Managing 4 businesses from one place — exactly what I was looking for.', name: 'Uri K.', title: 'Business owner' },
    ],
    pricing: {
      chip: 'Pricing', h2: 'Start free. Grow as you go.',
      free: { name: 'Free', price: '₪0', per: '/month', cta: 'Get started free',
        items: ['Up to 3 brands', 'Unlimited projects', 'Stage pipeline', 'Financial tracker', '7-day history'] },
      pro: { name: 'Pro', price: '₪49', per: '/month', badge: 'Most popular', cta: 'Go Pro →',
        items: ['Unlimited brands', 'AI brand wizard', 'Visual whiteboard', 'Priority support', 'Advanced analytics', 'Team collaboration'] },
      footnote: 'All plans · 14-day Pro trial · No credit card needed',
    },
    bottomCta: { h2: 'Stop building from memory.', sub: 'beseder gives every business you run a clear, structured home.', btn: 'Get started free →', link: 'Learn more' },
    footer: { tagline: 'Order from chaos.' },
  },
  he: {
    nav: { features: 'פיצ׳רים', howItWorks: 'איך זה עובד', pricing: 'תמחור', signin: 'התחבר', cta: 'התחל בחינם' },
    hero: {
      chip: 'מערכת ניהול לעצמאים ויזמים',
      h1a: 'כל מותג.',
      h1b: 'כל פרויקט.',
      h1c: 'מקום אחד.',
      sub: 'beseder היא מערכת הניהול ליזמים שמנהלים כמה עסקים במקביל. מותגים, פרויקטים, מחלקות, הוצאות — הכל מסודר ומובן, סוף סוף.',
      cta: 'התחל בחינם ←',
      demo: 'צפה בדמו',
      trust: 'ללא כרטיס אשראי · חינמי לתמיד',
    },
    proof: [
      { n: '500+', label: 'יזמים פעילים' },
      { n: '2,400+', label: 'מותגים מנוהלים' },
      { n: '18,000+', label: 'שלבים הושלמו' },
      { n: '₪0', label: 'כדי להתחיל' },
    ],
    spotlights: [
      {
        chip: 'ניהול מרובה מותגים',
        h3: 'כל העסקים שלך. מקום אחד.',
        desc: 'נגמר עם הקפיצות בין גיליונות, מחברות וכלים שונים. beseder נותן לכל מותג סביבת עבודה נפרדת — ואתה רואה את הכל מלוח ניהול אחד.',
        bullets: ['סביבה מבודדת לכל מותג', 'פרויקטים ומחלקות ללא הגבלה', 'תצוגת פורטפוליו כוללת'],
      },
      {
        chip: 'אשף AI',
        h3: 'בנה מבנה מלא בלחיצה אחת.',
        desc: 'ספר לאשף ה-AI מה המותג שלך עושה — והוא בונה עבורך אוטומטית את הפרויקטים, המחלקות והשלבים המתאימים לסוג העסק שלך.',
        bullets: ['מבנה מלא נוצר בשניות', 'מותאם לתחום ולמודל העסקי שלך', 'ניתן לעריכה חופשית לאחר יצירה'],
      },
      {
        chip: 'מעקב פיננסי',
        h3: 'פיננסים מובנים. בלי גיליונות אקסל.',
        desc: 'עקוב אחר הכנסות, הוצאות, הלוואות ותזרים מזומנים בכל רמה — מותג, פרויקט, מחלקה או שלב. סיכומים חיים בכל מקום.',
        bullets: ['הכנסות והוצאות לפי תדירות', 'מעקב הלוואות ונכסים', 'תזרים מזומנים בכל רמה'],
      },
    ],
    testimonials: [
      { quote: 'beseder שינה לי את כל שיטת הניהול. סוף סוף יש לי תמונה ברורה של כל העסקים שלי.', name: 'דן ל.', title: 'יזם סדרתי' },
      { quote: 'אשף ה-AI חסך לי שעות של תכנון. לחצתי כפתור אחד וקיבלתי מבנה מלא ומוכן לעבודה.', name: 'מיכל ר.', title: 'מנהלת שיווק' },
      { quote: 'לנהל 4 עסקים ממקום אחד — זה בדיוק מה שחיפשתי כל הזמן.', name: 'אורי כ.', title: 'בעל עסק' },
    ],
    pricing: {
      chip: 'תמחור', h2: 'התחל בחינם. גדל בקצב שלך.',
      free: { name: 'חינמי', price: '₪0', per: '/חודש', cta: 'התחל בחינם',
        items: ['עד 3 מותגים', 'פרויקטים ללא הגבלה', 'מסלול שלבים', 'ניהול פיננסי', 'גישה מלאה לפיצ׳רים'] },
      pro: { name: 'Pro', price: '₪49', per: '/חודש', badge: 'הפופולרי ביותר', cta: 'עבור ל-Pro ←',
        items: ['מותגים ללא הגבלה', 'אשף מותג AI', 'לוח ניהול ויזואלי', 'תמיכה מועדפת', 'אנליטיקס מתקדם', 'שיתוף פעולה בצוות'] },
      footnote: 'כל התוכניות · ניסיון Pro חינמי 14 יום · ללא כרטיס אשראי',
    },
    bottomCta: { h2: 'הפסק לנהל מהראש.', sub: 'beseder נותן לכל עסק שאתה מנהל בית ברור, מסודר וקל לעדכון.', btn: 'התחל בחינם ←', link: 'קרא עוד' },
    footer: { tagline: 'סדר מתוך כאוס.' },
  },
}

type Lang = 'en' | 'he'

function useFadeUp() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const rect = el.getBoundingClientRect()
    if (rect.top < window.innerHeight) { setVisible(true); return }
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' })
    obs.observe(el); return () => obs.disconnect()
  }, [])
  return { ref, visible }
}

function Fade({ children, className = '', delay = 0, style = {} }: { children: React.ReactNode; className?: string; delay?: number; style?: React.CSSProperties }) {
  const { ref, visible } = useFadeUp()
  return (
    <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(28px)', transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`, ...style }}>
      {children}
    </div>
  )
}

function Logo({ white: _white }: { white?: boolean }) {
  return (
    <img src="/beseder_white_2x.png" alt="beseder" style={{ height: 'clamp(44px, 8vw, 68px)', width: 'auto', display: 'block', maxWidth: 220 }} />
  )
}

function Check({ green }: { green?: boolean }) {
  return (
    <div style={{ width: 18, height: 18, borderRadius: '50%', background: green ? 'rgba(31,174,181,0.2)' : 'rgba(31,174,181,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <svg width="9" height="7" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1" stroke="#1FAEB5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </div>
  )
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div style={{ display: 'flex', background: 'rgba(232,244,246,0.08)', borderRadius: 999, padding: 3, gap: 2 }}>
      {(['en', 'he'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)} style={{ padding: '4px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 12, transition: 'all 0.2s', background: lang === l ? 'rgba(31,174,181,0.9)' : 'transparent', color: lang === l ? '#fff' : 'rgba(232,244,246,0.5)' }}>{l.toUpperCase()}</button>
      ))}
    </div>
  )
}

function LangToggleLight({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div style={{ display: 'flex', background: 'rgba(11,27,43,0.06)', borderRadius: 999, padding: 3, gap: 2 }}>
      {(['en', 'he'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)} style={{ padding: '4px 12px', borderRadius: 999, border: 'none', cursor: 'pointer', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 12, transition: 'all 0.2s', background: lang === l ? '#1FAEB5' : 'transparent', color: lang === l ? '#fff' : 'rgba(11,27,43,0.5)' }}>{l.toUpperCase()}</button>
      ))}
    </div>
  )
}

// ── Product mockup ──────────────────────────────────────────────────────────

function BrandsMockup({ isHe }: { isHe: boolean }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 14, color: '#111827' }}>{isHe ? 'המותגים שלי' : 'My Brands'}</div>
          <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{isHe ? '3 מותגים פעילים' : '3 active brands'}</div>
        </div>
        <div style={{ background: 'linear-gradient(135deg,#1FAEB5,#0E5FA8)', borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 700, color: '#fff', fontFamily: 'Sora, sans-serif' }}>{isHe ? '+ חדש' : '+ New'}</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {[
          { name: isHe ? 'ואכלת' : 'Vaachalta', emoji: '🍽️', color: '#f97316', pct: 42 },
          { name: isHe ? 'קמפיין' : 'Campaign', emoji: '🎯', color: '#3b82f6', pct: 68 },
          { name: isHe ? 'בריתס׳' : "Brits", emoji: '🥊', color: '#10b981', pct: 25 },
        ].map((b, i) => (
          <div key={i} style={{ background: '#f9fafb', borderRadius: 10, overflow: 'hidden', border: '1px solid #f1f5f9' }}>
            <div style={{ height: 3, background: b.color }} />
            <div style={{ padding: '10px 10px 8px' }}>
              <div style={{ fontSize: 18, marginBottom: 6 }}>{b.emoji}</div>
              <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 11, color: '#111827', marginBottom: 6 }}>{b.name}</div>
              <div style={{ height: 3, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${b.pct}%`, background: b.color, borderRadius: 99 }} />
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 4 }}>{b.pct}%</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WizardMockup({ isHe }: { isHe: boolean }) {
  return (
    <div style={{ background: '#0B1B2B', borderRadius: 14, padding: '18px', boxShadow: '0 4px 24px rgba(0,0,0,0.2)', border: '1px solid rgba(31,174,181,0.2)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#1FAEB5,#0E5FA8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>✨</div>
        <div>
          <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 12, color: '#E8F4F6' }}>{isHe ? 'אשף מותג AI' : 'AI Brand Wizard'}</div>
          <div style={{ fontSize: 10, color: 'rgba(232,244,246,0.4)' }}>{isHe ? 'מחולל מבנה אוטומטי' : 'Auto structure generator'}</div>
        </div>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '10px 12px', marginBottom: 10, border: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ fontSize: 10, color: 'rgba(232,244,246,0.5)', marginBottom: 4 }}>{isHe ? 'תאר את המותג שלך...' : 'Describe your brand...'}</div>
        <div style={{ fontSize: 11, color: '#E8F4F6' }}>{isHe ? 'אפליקציית מסעדות עם מנויים...' : 'Restaurant app with subscriptions...'}</div>
      </div>
      {[
        { label: isHe ? '📦 פרויקטים' : '📦 Projects', count: 4 },
        { label: isHe ? '🗂 מחלקות' : '🗂 Departments', count: 12 },
        { label: isHe ? '⚡ שלבים' : '⚡ Stages', count: 38 },
      ].map((r, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < 2 ? '1px solid rgba(255,255,255,0.05)' : 'none' }}>
          <span style={{ fontSize: 11, color: 'rgba(232,244,246,0.6)' }}>{r.label}</span>
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 12, color: '#1FAEB5' }}>{r.count}</span>
        </div>
      ))}
      <button style={{ marginTop: 12, width: '100%', background: 'linear-gradient(135deg,#1FAEB5,#0E5FA8)', border: 'none', borderRadius: 8, padding: '8px', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 11, color: '#fff', cursor: 'pointer' }}>
        {isHe ? '✨ צור מבנה' : '✨ Generate Structure'}
      </button>
    </div>
  )
}

function FinanceMockup({ isHe }: { isHe: boolean }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9', overflow: 'hidden' }}>
      <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 12 }}>
        💰 {isHe ? 'סיכום פיננסי' : 'Financial Summary'}
      </div>
      {[
        { label: isHe ? 'הכנסות חודשיות' : 'Monthly Income', value: '₪28,400', color: '#10b981', up: true },
        { label: isHe ? 'הוצאות חודשיות' : 'Monthly Expenses', value: '₪11,200', color: '#ef4444', up: false },
        { label: isHe ? 'תזרים נקי' : 'Net Cash Flow', value: '₪17,200', color: '#3b82f6', up: true },
      ].map((row, i) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < 2 ? '1px solid #f9fafb' : 'none' }}>
          <span style={{ fontSize: 11, color: '#6b7280' }}>{row.label}</span>
          <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 13, color: row.color }}>
            {row.up ? '↑ ' : '↓ '}{row.value}
          </span>
        </div>
      ))}
      <div style={{ marginTop: 12, background: 'linear-gradient(135deg, rgba(31,174,181,0.08), rgba(14,95,168,0.08))', borderRadius: 8, padding: '10px 12px' }}>
        <div style={{ fontSize: 10, color: '#9ca3af', marginBottom: 4 }}>{isHe ? 'הלוואות פעילות' : 'Active Loans'}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[60, 35, 80].map((pct, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ height: 4, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg,#1FAEB5,#0E5FA8)', borderRadius: 99 }} />
              </div>
              <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 3, textAlign: 'center' }}>{pct}%</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main component ──────────────────────────────────────────────────────────

export default function Home() {
  const [lang, setLang] = useState<Lang>('he')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const t = T[lang]
  const isHe = lang === 'he'

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const spotlightMockups = [
    <BrandsMockup key="brands" isHe={isHe} />,
    <WizardMockup key="wizard" isHe={isHe} />,
    <FinanceMockup key="finance" isHe={isHe} />,
  ]

  return (
    <main dir={isHe ? 'rtl' : 'ltr'} style={{ fontFamily: isHe ? 'Heebo, sans-serif' : 'Manrope, sans-serif', overflowX: 'hidden' }}>

      {/* ── Keyframes injected once ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&family=Manrope:wght@400;500;600;700&display=swap');
        [dir="rtl"], [dir="rtl"] * {
          font-family: 'Heebo', sans-serif !important;
          letter-spacing: 0 !important;
        }
        [dir="rtl"] h1, [dir="rtl"] h2, [dir="rtl"] h3 {
          font-family: 'Heebo', sans-serif !important;
          letter-spacing: -0.01em !important;
        }
        @keyframes pulse-glow {
          0%,100% { opacity:0.6; transform:scale(1); }
          50% { opacity:1; transform:scale(1.06); }
        }
        @keyframes float-y {
          0%,100% { transform:translateY(0px); }
          50% { transform:translateY(-10px); }
        }
        @keyframes mesh-drift {
          0%,100% { transform:translate(0,0) scale(1); }
          33% { transform:translate(40px,-30px) scale(1.08); }
          66% { transform:translate(-20px,20px) scale(0.95); }
        }
        @keyframes mesh-drift2 {
          0%,100% { transform:translate(0,0) scale(1); }
          50% { transform:translate(-50px,30px) scale(1.1); }
        }
        @keyframes shimmer {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }

        /* ── Mobile responsive ── */
        @media (max-width: 768px) {
          /* Nav: hide desktop items (overrides any inline display:flex) */
          .nav-desktop-links { display: none !important; }
          .nav-desktop-actions { display: none !important; }
          .nav-hamburger { display: flex !important; }

          /* Hero */
          .hero-text { padding: 60px 20px 32px !important; }
          .hero-ctas { flex-direction: column !important; align-items: stretch !important; }
          .hero-ctas a { text-align: center !important; }
          .hero-mockup-wrap { padding: 0 12px !important; }
          .mockup-brand-grid { grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
          .mockup-header { padding: 8px 14px !important; }
          .mockup-content { padding: 16px 14px 0 !important; }
          .mockup-content-header { font-size: 14px !important; }
          .mockup-pipeline-chips { gap: 5px !important; }
          .mockup-pipeline-chips > div { padding: 5px 8px !important; }
          .mockup-pipeline-chips span { font-size: 10px !important; }
          .hero-section { min-height: auto !important; padding-bottom: 0 !important; }

          /* Spotlights */
          .spotlight-grid { grid-template-columns: 1fr !important; gap: 36px !important; direction: ltr !important; }
          .spotlight-grid > * { direction: inherit !important; }

          /* Testimonials */
          .testimonials-grid { grid-template-columns: 1fr !important; }

          /* Pricing */
          .pricing-grid { grid-template-columns: 1fr !important; max-width: 440px !important; }

          /* Footer */
          .footer-inner { flex-direction: column !important; align-items: flex-start !important; gap: 32px !important; }
          .footer-links-grid { grid-template-columns: repeat(2,1fr) !important; gap: 24px !important; }

          /* Proof bar */
          .proof-grid { gap: 12px 36px !important; }

          /* Section padding */
          .section-pad { padding: 72px 0 !important; }
        }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        backdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(20px) saturate(180%)' : 'none',
        background: scrolled ? 'rgba(11,27,43,0.85)' : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(31,174,181,0.12)' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}>
        <div dir="ltr" style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 68 }}>
          <a href="#" style={{ textDecoration: 'none' }}><Logo white /></a>
          {/* Desktop nav */}
          <div className="nav-desktop-links hidden md:flex" style={{ alignItems: 'center', gap: 36 }}>
            {[
              { label: t.nav.features, href: '#features' },
              { label: t.nav.howItWorks, href: '#spotlights' },
              { label: t.nav.pricing, href: '#pricing' },
            ].map(link => (
              <a key={link.href} href={link.href} style={{ fontFamily: 'Manrope, sans-serif', fontSize: 14, fontWeight: 500, color: 'rgba(232,244,246,0.65)', textDecoration: 'none', transition: 'color 0.2s' }}
                onMouseEnter={e => (e.currentTarget.style.color = '#E8F4F6')}
                onMouseLeave={e => (e.currentTarget.style.color = 'rgba(232,244,246,0.65)')}
              >{link.label}</a>
            ))}
          </div>
          <div className="nav-desktop-actions hidden md:flex" style={{ alignItems: 'center', gap: 12 }}>
            <LangToggle lang={lang} setLang={setLang} />
            <a href="/login" style={{ fontFamily: 'Sora, sans-serif', fontSize: 14, fontWeight: 600, color: 'rgba(232,244,246,0.6)', textDecoration: 'none', padding: '8px 16px', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#E8F4F6')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(232,244,246,0.6)')}
            >{t.nav.signin}</a>
            <a href="/signup" style={{
              background: 'linear-gradient(135deg,#1FAEB5,#0E5FA8)',
              color: '#fff', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 14,
              borderRadius: 999, padding: '10px 22px', textDecoration: 'none',
              boxShadow: '0 4px 20px rgba(31,174,181,0.4)',
              transition: 'box-shadow 0.2s, transform 0.2s',
            }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.boxShadow = '0 8px 32px rgba(31,174,181,0.6)'; el.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.boxShadow = '0 4px 20px rgba(31,174,181,0.4)'; el.style.transform = 'none'; }}
            >{t.nav.cta}</a>
          </div>
          {/* Mobile hamburger */}
          <button className="md:hidden flex flex-col gap-1.5 p-2" onClick={() => setMobileOpen(!mobileOpen)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>
            <span style={{ display: 'block', width: 24, height: 2, background: '#E8F4F6', borderRadius: 2, transition: 'all 0.3s', transform: mobileOpen ? 'rotate(45deg) translateY(6px)' : 'none' }} />
            <span style={{ display: 'block', width: 24, height: 2, background: '#E8F4F6', borderRadius: 2, transition: 'all 0.3s', opacity: mobileOpen ? 0 : 1 }} />
            <span style={{ display: 'block', width: 24, height: 2, background: '#E8F4F6', borderRadius: 2, transition: 'all 0.3s', transform: mobileOpen ? 'rotate(-45deg) translateY(-6px)' : 'none' }} />
          </button>
        </div>
        {/* Mobile menu */}
        <div style={{
          overflow: 'hidden', transition: 'max-height 0.35s ease',
          maxHeight: mobileOpen ? 320 : 0,
          background: 'rgba(11,27,43,0.97)',
          borderTop: '1px solid rgba(31,174,181,0.12)',
        }}>
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <a href="#features" style={{ fontSize: 15, color: 'rgba(232,244,246,0.75)', textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>{t.nav.features}</a>
            <a href="#spotlights" style={{ fontSize: 15, color: 'rgba(232,244,246,0.75)', textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>{t.nav.howItWorks}</a>
            <a href="#pricing" style={{ fontSize: 15, color: 'rgba(232,244,246,0.75)', textDecoration: 'none' }} onClick={() => setMobileOpen(false)}>{t.nav.pricing}</a>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 8, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              <LangToggle lang={lang} setLang={setLang} />
              <a href="/login" style={{ fontSize: 14, color: 'rgba(232,244,246,0.6)', textDecoration: 'none' }}>{t.nav.signin}</a>
              <a href="/signup" style={{ background: 'linear-gradient(135deg,#1FAEB5,#0E5FA8)', color: '#fff', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 13, borderRadius: 999, padding: '8px 18px', textDecoration: 'none' }}>{t.nav.cta}</a>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero-section" style={{ background: '#0B1B2B', minHeight: '100vh', paddingTop: 68, position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* Animated mesh gradient blobs */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '5%', left: '10%', width: 700, height: 700, background: 'radial-gradient(circle,rgba(31,174,181,0.13) 0%,transparent 70%)', filter: 'blur(80px)', animation: 'mesh-drift 14s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', bottom: '10%', right: '5%', width: 500, height: 500, background: 'radial-gradient(circle,rgba(14,95,168,0.18) 0%,transparent 70%)', filter: 'blur(70px)', animation: 'mesh-drift2 18s ease-in-out infinite' }} />
          <div style={{ position: 'absolute', top: '45%', left: '55%', width: 350, height: 350, background: 'radial-gradient(circle,rgba(58,155,232,0.1) 0%,transparent 70%)', filter: 'blur(60px)', animation: 'mesh-drift 22s ease-in-out infinite reverse' }} />
          {/* Grid overlay */}
          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(31,174,181,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(31,174,181,0.03) 1px, transparent 1px)', backgroundSize: '64px 64px' }} />
        </div>

        {/* Text block */}
        <div className="hero-text" style={{ position: 'relative', zIndex: 10, maxWidth: 860, margin: '0 auto', padding: '80px 24px 48px', textAlign: 'center' }}>
          {/* Chip */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 32, background: 'rgba(31,174,181,0.1)', border: '1px solid rgba(31,174,181,0.28)', borderRadius: 999, padding: '7px 18px' }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1FAEB5', display: 'inline-block', animation: 'pulse-glow 2s ease-in-out infinite' }} />
            <span style={{ fontFamily: isHe ? 'Heebo, sans-serif' : 'Sora, sans-serif', fontSize: isHe ? 13 : 11, fontWeight: 700, letterSpacing: isHe ? '0.02em' : '0.14em', color: '#1FAEB5', textTransform: isHe ? 'none' : 'uppercase' }}>{t.hero.chip}</span>
          </div>
          {/* Headline */}
          <h1 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 'clamp(48px, 7vw, 88px)', color: '#E8F4F6', lineHeight: 1.05, marginBottom: 28, letterSpacing: '-0.02em' }}>
            <span style={{ display: 'block' }}>{t.hero.h1a}</span>
            <span style={{ display: 'block' }}>{t.hero.h1b}</span>
            <span style={{ display: 'block', backgroundImage: 'linear-gradient(135deg,#1FAEB5 0%,#3A9BE8 50%,#1FAEB5 100%)', backgroundSize: '200% auto', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text', animation: 'shimmer 4s linear infinite' }}>{t.hero.h1c}</span>
          </h1>
          {/* Subtitle */}
          <p style={{ fontSize: 18, color: 'rgba(232,244,246,0.6)', lineHeight: 1.8, marginBottom: 40, maxWidth: 520, margin: '0 auto 40px' }}>{t.hero.sub}</p>
          {/* CTAs */}
          <div className="hero-ctas" style={{ display: 'flex', flexWrap: 'wrap', gap: 14, justifyContent: 'center', marginBottom: 20 }}>
            <a href="/signup" style={{
              background: 'linear-gradient(135deg,#1FAEB5,#0E5FA8)',
              color: '#fff', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 16,
              borderRadius: 999, padding: '15px 36px', textDecoration: 'none',
              boxShadow: '0 8px 40px rgba(31,174,181,0.45), 0 0 0 0 rgba(31,174,181,0)',
              transition: 'all 0.25s ease',
            }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.boxShadow = '0 12px 56px rgba(31,174,181,0.65)'; el.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.boxShadow = '0 8px 40px rgba(31,174,181,0.45)'; el.style.transform = 'none'; }}
            >{t.hero.cta}</a>
            <a href="#spotlights" style={{
              display: 'inline-flex', alignItems: 'center', gap: 9,
              fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 15,
              color: 'rgba(232,244,246,0.75)',
              border: '1.5px solid rgba(232,244,246,0.18)',
              borderRadius: 999, padding: '14px 28px', textDecoration: 'none',
              backdropFilter: 'blur(8px)', transition: 'all 0.2s',
            }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = 'rgba(31,174,181,0.5)'; el.style.color = '#E8F4F6'; }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = 'rgba(232,244,246,0.18)'; el.style.color = 'rgba(232,244,246,0.75)'; }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              {t.hero.demo}
            </a>
          </div>
          <p style={{ fontSize: 12, color: 'rgba(232,244,246,0.28)', letterSpacing: '0.04em' }}>{t.hero.trust}</p>
        </div>

        {/* Product mockup */}
        <div className="hero-mockup-wrap" style={{ position: 'relative', zIndex: 10, maxWidth: 1120, margin: '0 auto', padding: '0 24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
          <div style={{
            borderRadius: '20px 20px 0 0', overflow: 'hidden',
            border: '1px solid rgba(255,255,255,0.1)', borderBottom: 'none',
            boxShadow: '0 -12px 100px rgba(31,174,181,0.15), 0 0 0 1px rgba(255,255,255,0.04)',
            animation: 'float-y 6s ease-in-out infinite',
          }}>
            {/* Browser chrome */}
            <div className="mockup-header" style={{ background: 'rgba(255,255,255,0.05)', borderBottom: '1px solid rgba(255,255,255,0.08)', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ display: 'flex', gap: 6 }}>
                {['rgba(255,95,87,0.7)', 'rgba(255,189,46,0.7)', 'rgba(39,201,63,0.7)'].map((c, i) => (
                  <div key={i} style={{ width: 11, height: 11, borderRadius: '50%', background: c }} />
                ))}
              </div>
              <div style={{ flex: 1, background: 'rgba(255,255,255,0.07)', borderRadius: 6, padding: '5px 14px', fontSize: 11, color: 'rgba(232,244,246,0.35)', fontFamily: 'Sora, sans-serif', textAlign: 'center' }}>
                getbeseder.com/dashboard
              </div>
              <div style={{ width: 56 }} />
            </div>
            {/* App content */}
            <div style={{ background: '#f8fafc' }}>
              {/* App TopNav */}
              <div style={{ background: 'rgba(255,255,255,0.98)', borderBottom: '1px solid #e8f4f6', padding: '11px 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: 'linear-gradient(135deg,#1FAEB5,#0E5FA8)' }} />
                  <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 14, color: '#0B1B2B' }}>beseder</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  {['📦', '💰', '📊'].map((icon, i) => (
                    <span key={i} style={{ fontSize: 14, opacity: 0.5 }}>{icon}</span>
                  ))}
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(135deg,#1FAEB5,#0E5FA8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', fontFamily: 'Sora, sans-serif' }}>DA</div>
                </div>
              </div>
              {/* Dashboard content */}
              <div className="mockup-content" style={{ padding: '28px 28px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <div className="mockup-content-header" style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 20, color: '#111827' }}>{isHe ? 'המותגים שלי' : 'My Brands'}</div>
                    <div style={{ fontSize: 13, color: '#9ca3af', marginTop: 2 }}>{isHe ? '3 מותגים פעילים' : '3 active brands'}</div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg,#1FAEB5,#0E5FA8)', borderRadius: 12, padding: '8px 16px', fontSize: 13, fontWeight: 700, color: '#fff', fontFamily: 'Sora, sans-serif' }}>{isHe ? '+ חדש' : '+ New'}</div>
                </div>
                {/* Brand cards */}
                <div className="mockup-brand-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
                  {[
                    { name: isHe ? 'ואכלת' : 'Vaachalta', desc: isHe ? 'אפליקציית מסעדות' : 'Restaurant app', emoji: '🍽️', color: '#f97316', pct: 42, projects: 2 },
                    { name: isHe ? 'קמפיין חגים' : 'Holiday Campaign', desc: isHe ? 'שיווק עונתי' : 'Seasonal marketing', emoji: '🎯', color: '#3b82f6', pct: 68, projects: 3 },
                    { name: isHe ? "בריתס׳" : "Brits", desc: isHe ? 'מועדון לחימה' : 'Combat club', emoji: '🥊', color: '#10b981', pct: 25, projects: 4 },
                  ].map((brand, i) => (
                    <div key={i} style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', transition: 'transform 0.2s' }}>
                      <div style={{ height: 4, background: brand.color }} />
                      <div style={{ padding: '16px 16px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                          <div style={{ width: 36, height: 36, borderRadius: 10, background: brand.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{brand.emoji}</div>
                          <div>
                            <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 13, color: '#111827' }}>{brand.name}</div>
                            <div style={{ fontSize: 11, color: '#9ca3af' }}>{brand.desc}</div>
                          </div>
                        </div>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 8 }}>{brand.projects} {isHe ? 'פרויקטים' : 'projects'} · {brand.pct}% {isHe ? 'הושלם' : 'done'}</div>
                        <div style={{ height: 4, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${brand.pct}%`, background: brand.color, borderRadius: 99, transition: 'width 1s ease' }} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {/* Pipeline */}
                <div style={{ marginTop: 20, background: '#fff', borderRadius: 16, border: '1px solid #f1f5f9', padding: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 12, fontFamily: 'Sora, sans-serif' }}>🍽️ {isHe ? 'ואכלת — Pipeline שיווק' : 'Vaachalta — Marketing Pipeline'}</div>
                  <div className="mockup-pipeline-chips" style={{ display: 'flex', gap: 8, overflowX: 'hidden', flexWrap: 'wrap' }}>
                    {[
                      { name: isHe ? 'SEO ותוכן' : 'SEO & Content', status: 'done', color: '#10b981' },
                      { name: isHe ? 'קמפיין TikTok' : 'TikTok Campaign', status: 'active', color: '#3b82f6' },
                      { name: isHe ? 'אינפלואנסרים' : 'Influencers', status: 'active', color: '#3b82f6' },
                      { name: isHe ? 'פרפורמנס' : 'Performance', status: 'todo', color: '#d1d5db' },
                      { name: isHe ? 'Scale' : 'Scale', status: 'todo', color: '#d1d5db' },
                    ].map((stage, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, background: stage.color + '12', borderRadius: 20, padding: '6px 12px', whiteSpace: 'nowrap', flexShrink: 0 }}>
                        <div style={{ width: 6, height: 6, borderRadius: '50%', background: stage.color, flexShrink: 0 }} />
                        <span style={{ fontSize: 11, fontWeight: 600, color: stage.status === 'todo' ? '#9ca3af' : '#374151' }}>{stage.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Bottom fade */}
              <div style={{ height: 72, background: 'linear-gradient(to bottom, transparent, #f8fafc)', marginTop: 24 }} />
            </div>
          </div>
        </div>
      </section>

      {/* ── Social proof bar ── */}
      <section style={{ background: '#0f2438', borderTop: '1px solid rgba(31,174,181,0.12)', borderBottom: '1px solid rgba(31,174,181,0.12)', padding: '28px 0' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px' }}>
          <div className="proof-grid" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '20px 64px' }}>
            {t.proof.map((s, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 26, color: '#E8F4F6', backgroundImage: 'linear-gradient(135deg,#1FAEB5,#3A9BE8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>{s.n}</div>
                <div style={{ fontSize: 12, color: 'rgba(232,244,246,0.45)', marginTop: 3 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feature spotlights ── */}
      <section id="spotlights" className="section-pad" style={{ background: '#fff', padding: '110px 0' }}>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px' }}>
          <Fade style={{ textAlign: 'center', marginBottom: 72 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18, background: 'rgba(11,27,43,0.05)', border: '1px solid rgba(11,27,43,0.1)', borderRadius: 999, padding: '5px 16px' }}>
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: 'rgba(11,27,43,0.45)', textTransform: 'uppercase' }}>{isHe ? 'פיצ׳רים' : 'Features'}</span>
            </div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 'clamp(28px,4vw,50px)', color: '#0B1B2B', letterSpacing: '-0.02em' }}>{isHe ? 'כל מה שצריך לנהל את האימפריה שלך' : 'Everything you need to run your empire'}</h2>
          </Fade>
          {t.spotlights.map((spot, i) => {
            const isEven = i % 2 === 0
            const visual = spotlightMockups[i]
            return (
              <Fade key={i} delay={80} style={{ marginBottom: i < t.spotlights.length - 1 ? 96 : 0 }}>
                <div className="spotlight-grid" style={{
                  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 64, alignItems: 'center',
                  direction: isHe ? (isEven ? 'ltr' : 'rtl') : (isEven ? 'ltr' : 'rtl'),
                }}>
                  {/* Visual side */}
                  <div style={{ direction: 'ltr' }}>
                    <div style={{
                      borderRadius: 20, overflow: 'hidden',
                      boxShadow: '0 20px 80px rgba(11,27,43,0.1)',
                      border: '1px solid rgba(11,27,43,0.06)',
                    }}>
                      {visual}
                    </div>
                  </div>
                  {/* Text side */}
                  <div style={{ direction: isHe ? 'rtl' : 'ltr' }}>
                    <div style={{ display: 'inline-flex', marginBottom: 18, background: 'rgba(31,174,181,0.1)', border: '1px solid rgba(31,174,181,0.25)', borderRadius: 999, padding: '5px 14px' }}>
                      <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#1FAEB5', textTransform: 'uppercase' }}>{spot.chip}</span>
                    </div>
                    <h3 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 'clamp(22px,3vw,36px)', color: '#0B1B2B', lineHeight: 1.2, marginBottom: 16, letterSpacing: '-0.01em' }}>{spot.h3}</h3>
                    <p style={{ fontSize: 16, color: 'rgba(11,27,43,0.58)', lineHeight: 1.75, marginBottom: 28 }}>{spot.desc}</p>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                      {spot.bullets.map((b, j) => (
                        <li key={j} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                          <Check />
                          <span style={{ fontSize: 14, color: 'rgba(11,27,43,0.7)', fontWeight: 500 }}>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </Fade>
            )
          })}
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section id="features" className="section-pad" style={{ background: '#0B1B2B', padding: '110px 0', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          <div style={{ position: 'absolute', top: '20%', left: '30%', width: 600, height: 400, background: 'radial-gradient(circle,rgba(31,174,181,0.07) 0%,transparent 70%)', filter: 'blur(60px)' }} />
        </div>
        <div style={{ maxWidth: 1120, margin: '0 auto', padding: '0 24px', position: 'relative', zIndex: 1 }}>
          <Fade style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20, background: 'rgba(31,174,181,0.1)', border: '1px solid rgba(31,174,181,0.25)', borderRadius: 999, padding: '5px 16px' }}>
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#1FAEB5', textTransform: 'uppercase' }}>{isHe ? 'מה אומרים עלינו' : 'Testimonials'}</span>
            </div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 'clamp(26px,4vw,46px)', color: '#E8F4F6', letterSpacing: '-0.02em' }}>{isHe ? 'ייסדרים שכבר מסודרים' : 'Founders who got sorted'}</h2>
          </Fade>
          <div className="testimonials-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {t.testimonials.map((test, i) => (
              <Fade key={i} delay={i * 120}>
                <div style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 20, padding: '32px 28px',
                  height: '100%',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.25s ease',
                }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = 'rgba(255,255,255,0.07)'; el.style.borderColor = 'rgba(31,174,181,0.3)'; el.style.transform = 'translateY(-4px)'; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLDivElement; el.style.background = 'rgba(255,255,255,0.04)'; el.style.borderColor = 'rgba(255,255,255,0.08)'; el.style.transform = 'none'; }}
                >
                  {/* Stars */}
                  <div style={{ display: 'flex', gap: 3, marginBottom: 20 }}>
                    {[...Array(5)].map((_, k) => (
                      <svg key={k} width="14" height="14" viewBox="0 0 24 24" fill="#1FAEB5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                    ))}
                  </div>
                  <p style={{ fontSize: 15, color: 'rgba(232,244,246,0.8)', lineHeight: 1.75, marginBottom: 24, fontStyle: 'italic' }}>&ldquo;{test.quote}&rdquo;</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg,#1FAEB5,#0E5FA8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 13, color: '#fff', flexShrink: 0 }}>
                      {test.name[0]}
                    </div>
                    <div>
                      <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 13, color: '#E8F4F6' }}>{test.name}</div>
                      <div style={{ fontSize: 12, color: 'rgba(232,244,246,0.4)' }}>{test.title}</div>
                    </div>
                  </div>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" className="section-pad" style={{ background: '#f0f7f8', padding: '110px 0' }}>
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '0 24px' }}>
          <Fade style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 18, background: 'rgba(31,174,181,0.12)', border: '1px solid rgba(31,174,181,0.22)', borderRadius: 999, padding: '5px 16px' }}>
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: '#1FAEB5', textTransform: 'uppercase' }}>{t.pricing.chip}</span>
            </div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 'clamp(28px,4vw,50px)', color: '#0B1B2B', letterSpacing: '-0.02em' }}>{t.pricing.h2}</h2>
          </Fade>
          <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 780, margin: '0 auto' }}>
            <Fade>
              <div style={{ background: '#fff', borderRadius: 24, padding: '40px 36px', border: '1.5px solid rgba(11,27,43,0.08)', height: '100%', display: 'flex', flexDirection: 'column', boxShadow: '0 4px 24px rgba(11,27,43,0.04)' }}>
                <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 16, color: '#0B1B2B', marginBottom: 6 }}>{t.pricing.free.name}</div>
                <div style={{ marginBottom: 28 }}>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 44, color: '#0B1B2B', letterSpacing: '-0.03em' }}>{t.pricing.free.price}</span>
                  <span style={{ fontSize: 14, color: 'rgba(11,27,43,0.4)', marginRight: 6 }}>{t.pricing.free.per}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px', flex: 1 }}>
                  {t.pricing.free.items.map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 13 }}>
                      <Check /><span style={{ fontSize: 14, color: 'rgba(11,27,43,0.68)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
                <a href="/signup" style={{
                  background: 'transparent', border: '2px solid rgba(31,174,181,0.4)',
                  color: '#1FAEB5', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15,
                  borderRadius: 12, padding: '14px', textDecoration: 'none', textAlign: 'center', display: 'block',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'rgba(31,174,181,0.06)'; el.style.borderColor = '#1FAEB5'; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.background = 'transparent'; el.style.borderColor = 'rgba(31,174,181,0.4)'; }}
                >{t.pricing.free.cta}</a>
              </div>
            </Fade>
            <Fade delay={160}>
              <div style={{
                background: '#0B1B2B', borderRadius: 24, padding: '40px 36px',
                border: '1.5px solid rgba(31,174,181,0.3)', height: '100%', display: 'flex', flexDirection: 'column',
                position: 'relative', overflow: 'hidden',
                boxShadow: '0 12px 56px rgba(31,174,181,0.18), 0 4px 24px rgba(0,0,0,0.15)',
              }}>
                {/* Glow */}
                <div style={{ position: 'absolute', top: -40, right: -40, width: 160, height: 160, background: 'radial-gradient(circle,rgba(31,174,181,0.2) 0%,transparent 70%)', pointerEvents: 'none' }} />
                <div style={{ position: 'absolute', top: 20, [isHe ? 'left' : 'right']: 20, background: 'linear-gradient(135deg,#1FAEB5,#0E5FA8)', borderRadius: 999, padding: '4px 12px', fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 11, color: '#fff' }}>{t.pricing.pro.badge}</div>
                <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 16, color: '#E8F4F6', marginBottom: 6 }}>{t.pricing.pro.name}</div>
                <div style={{ marginBottom: 28 }}>
                  <span style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 44, color: '#E8F4F6', letterSpacing: '-0.03em' }}>{t.pricing.pro.price}</span>
                  <span style={{ fontSize: 14, color: 'rgba(232,244,246,0.38)', marginRight: 6 }}>{t.pricing.pro.per}</span>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 36px', flex: 1 }}>
                  {t.pricing.pro.items.map((item, i) => (
                    <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 13 }}>
                      <Check green /><span style={{ fontSize: 14, color: 'rgba(232,244,246,0.72)' }}>{item}</span>
                    </li>
                  ))}
                </ul>
                <a href="/signup" style={{
                  background: 'linear-gradient(135deg,#1FAEB5,#0E5FA8)', color: '#fff',
                  fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 15,
                  borderRadius: 12, padding: '14px', textDecoration: 'none', textAlign: 'center', display: 'block',
                  boxShadow: '0 6px 28px rgba(31,174,181,0.35)',
                  transition: 'all 0.2s',
                }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.boxShadow = '0 10px 40px rgba(31,174,181,0.55)'; el.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.boxShadow = '0 6px 28px rgba(31,174,181,0.35)'; el.style.transform = 'none'; }}
                >{t.pricing.pro.cta}</a>
              </div>
            </Fade>
          </div>
          <Fade style={{ textAlign: 'center', marginTop: 28 }}>
            <p style={{ fontSize: 13, color: 'rgba(11,27,43,0.4)' }}>{t.pricing.footnote}</p>
          </Fade>
        </div>
      </section>

      {/* ── Bottom CTA ── */}
      <section style={{ background: '#0B1B2B', padding: '120px 0', position: 'relative', overflow: 'hidden' }}>
        {/* Dramatic gradient bg */}
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 60% at 50% 50%, rgba(31,174,181,0.18) 0%, rgba(14,95,168,0.12) 40%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(31,174,181,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(31,174,181,0.04) 1px, transparent 1px)', backgroundSize: '48px 48px', pointerEvents: 'none' }} />
        <div style={{ maxWidth: 820, margin: '0 auto', padding: '0 24px', textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <Fade>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28, background: 'rgba(31,174,181,0.1)', border: '1px solid rgba(31,174,181,0.28)', borderRadius: 999, padding: '7px 18px' }}>
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#1FAEB5', display: 'inline-block', animation: 'pulse-glow 2s ease-in-out infinite' }} />
              <span style={{ fontFamily: 'Sora, sans-serif', fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#1FAEB5', textTransform: 'uppercase' }}>{isHe ? 'מוכן להתחיל?' : 'Ready to start?'}</span>
            </div>
            <h2 style={{ fontFamily: 'Sora, sans-serif', fontWeight: 800, fontSize: 'clamp(32px,5vw,64px)', color: '#E8F4F6', lineHeight: 1.1, marginBottom: 20, letterSpacing: '-0.02em' }}>{t.bottomCta.h2}</h2>
            <p style={{ fontSize: 18, color: 'rgba(232,244,246,0.6)', lineHeight: 1.75, marginBottom: 48 }}>{t.bottomCta.sub}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, justifyContent: 'center' }}>
              <a href="/signup" style={{
                background: 'linear-gradient(135deg,#1FAEB5,#0E5FA8)', color: '#fff',
                fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 16,
                borderRadius: 999, padding: '16px 40px', textDecoration: 'none',
                boxShadow: '0 10px 48px rgba(31,174,181,0.5)',
                transition: 'all 0.25s',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.boxShadow = '0 16px 64px rgba(31,174,181,0.7)'; el.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.boxShadow = '0 10px 48px rgba(31,174,181,0.5)'; el.style.transform = 'none'; }}
              >{t.bottomCta.btn}</a>
              <a href="#features" style={{
                color: 'rgba(232,244,246,0.7)', fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 16,
                border: '2px solid rgba(232,244,246,0.18)', borderRadius: 999, padding: '15px 36px', textDecoration: 'none',
                transition: 'all 0.2s',
              }}
                onMouseEnter={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = 'rgba(31,174,181,0.5)'; el.style.color = '#E8F4F6'; }}
                onMouseLeave={e => { const el = e.currentTarget as HTMLAnchorElement; el.style.borderColor = 'rgba(232,244,246,0.18)'; el.style.color = 'rgba(232,244,246,0.7)'; }}
              >{t.bottomCta.link}</a>
            </div>
          </Fade>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background: '#060f1a', borderTop: '1px solid rgba(255,255,255,0.05)', padding: '64px 0 36px' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px' }}>
          <div className="footer-inner" style={{ display: 'flex', flexDirection: isHe ? 'row-reverse' : 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 48, marginBottom: 48 }}>
            <div>
              <Logo white />
              <p style={{ fontSize: 13, color: 'rgba(232,244,246,0.35)', marginTop: 14, maxWidth: 200, lineHeight: 1.6 }}>{t.footer.tagline}</p>
            </div>
            <div className="footer-links-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 40 }}>
              {[
                { title: isHe ? 'מוצר' : 'Product', items: [t.nav.features, t.nav.howItWorks, t.nav.pricing] },
                { title: isHe ? 'חברה' : 'Company', items: [isHe ? 'אודות' : 'About', isHe ? 'בלוג' : 'Blog'] },
                { title: isHe ? 'משפטי' : 'Legal', items: [isHe ? 'פרטיות' : 'Privacy', isHe ? 'תנאים' : 'Terms'] },
              ].map(col => (
                <div key={col.title}>
                  <div style={{ fontFamily: 'Sora, sans-serif', fontWeight: 700, fontSize: 11, letterSpacing: '0.1em', color: 'rgba(232,244,246,0.3)', textTransform: 'uppercase', marginBottom: 16 }}>{col.title}</div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {col.items.map(item => (
                      <li key={item} style={{ marginBottom: 10 }}>
                        <a href="#" style={{ fontSize: 13, color: 'rgba(232,244,246,0.45)', textDecoration: 'none', transition: 'color 0.2s' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'rgba(232,244,246,0.8)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(232,244,246,0.45)')}
                        >{item}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <p style={{ fontSize: 12, color: 'rgba(232,244,246,0.25)' }}>&copy; 2026 beseder. All rights reserved.</p>
            <p style={{ fontFamily: 'Sora, sans-serif', fontWeight: 600, fontSize: 12, color: 'rgba(232,244,246,0.2)', letterSpacing: '0.04em' }}>getbeseder.com</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
