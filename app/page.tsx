'use client'
import { useEffect, useRef, useState } from 'react'

const T = {
  en: {
    nav: { features: 'Features', howItWorks: 'How it works', pricing: 'Pricing', signin: 'Sign in', cta: 'Get started free' },
    hero: {
      chip: 'Business OS for Founders',
      h1a: 'Every brand. Every project.',
      h1b: 'One place.',
      sub: 'beseder is the operating system for founders who run multiple businesses. Brands, projects, teams, milestones — structured and clear, finally.',
      cta: 'Get started free →',
      demo: 'Watch demo',
      trust: 'No credit card · Free forever plan · Cancel anytime',
    },
    problem: {
      chip: 'The Problem',
      h2: 'Your to-do list is lying to you.',
      sub: "Most task apps reward the act of adding tasks. beseder rewards finishing them. There's a difference.",
      before: 'Before beseder', beforeBadge: 'Chaos',
      after: 'With beseder', afterBadge: 'Clarity',
    },
    how: {
      chip: 'How it works', h2: 'Three moves. Total clarity.',
      steps: [
        { n:'01', title:'Create your brands', desc:"Add every business or venture you're running. Each gets its own workspace." },
        { n:'02', title:'Build your structure', desc:'Break each brand into projects, departments, and stages. Your exact way of thinking, preserved.' },
        { n:'03', title:'Track everything', desc:'See progress at every level — from a single task to your entire portfolio on one whiteboard.' },
      ],
    },
    features: {
      chip: 'Features', h2: 'Everything you need to run your empire',
      items: [
        { title:'Multi-Brand Workspace', desc:'Run 5 companies? No problem. Each brand is fully isolated with its own structure.' },
        { title:'4-Level Hierarchy', desc:'Brand → Project → Department → Stage. As deep or as flat as you need.' },
        { title:'Visual Whiteboard', desc:'See your entire brand — all projects, departments, and channels — on one canvas.' },
        { title:'Stage Pipeline', desc:'Every department has a pipeline of stages. Move them from Todo → Active → Done → Blocked.' },
        { title:'Financial Tracker', desc:'Built-in financial management: loans, assets, expenses, cash flow. No spreadsheet needed.' },
        { title:'Channel Management', desc:'Departments can have sub-channels — perfect for agencies managing multiple clients.' },
      ],
    },
    pricing: {
      chip: 'Pricing', h2: 'Start free. Grow as you go.',
      free: { name:'Free', price:'₪0', per:'/month', cta:'Get started free',
        items:['Up to 3 brands','Unlimited projects','Stage pipeline','Financial tracker','7-day history'] },
      pro: { name:'Pro', price:'₪49', per:'/month', badge:'Most popular', cta:'Go Pro →',
        items:['Unlimited brands','AI brand wizard','Visual whiteboard','Priority support','Advanced analytics','Team collaboration'] },
      footnote: 'All plans · 14-day Pro trial · No credit card needed',
    },
    cta: { h2:'Stop building from memory.', sub:'beseder gives every business you run a clear, structured home.', btn:'Get started free →', link:'Learn more' },
    footer: { tagline:'Order from chaos.' },
  },
  he: {
    nav: { features: 'פיצ׳רים', howItWorks: 'איך זה עובד', pricing: 'תמחור', signin: 'התחבר', cta: 'התחל בחינם' },
    hero: {
      chip: 'מערכת ניהול לייסדרים',
      h1a: 'כל מותג. כל פרויקט.',
      h1b: 'מקום אחד.',
      sub: 'beseder היא מערכת ההפעלה לייסדרים שמנהלים כמה עסקים במקביל. מותגים, פרויקטים, צוותים, אבני דרך — מסודר וברור, סוף סוף.',
      cta: 'התחל בחינם ←',
      demo: 'צפה בדמו',
      trust: 'ללא כרטיס אשראי · חינמי לתמיד · ביטול בכל עת',
    },
    problem: {
      chip: 'הבעיה',
      h2: 'רשימת המשימות שלך משקרת לך.',
      sub: 'רוב האפליקציות מתגמלות על הוספת משימות. beseder מתגמל על סיום שלהן. יש הבדל.',
      before: 'לפני beseder', beforeBadge: 'כאוס',
      after: 'עם beseder', afterBadge: 'בהירות',
    },
    how: {
      chip: 'איך זה עובד', h2: 'שלושה צעדים. בהירות מלאה.',
      steps: [
        { n:'01', title:'צור את המותגים שלך', desc:'הוסף כל עסק או מיזם שאתה מנהל. לכל אחד יש סביבת עבודה נפרדת.' },
        { n:'02', title:'בנה את המבנה שלך', desc:'חלק כל מותג לפרויקטים, מחלקות ושלבים. בדיוק כמו שאתה חושב.' },
        { n:'03', title:'עקוב אחרי הכל', desc:'ראה התקדמות בכל רמה — ממשימה בודדת ועד כל הפורטפוליו שלך על לוח אחד.' },
      ],
    },
    features: {
      chip: 'פיצ׳רים', h2: 'כל מה שצריך לנהל את האימפריה שלך',
      items: [
        { title:'ניהול מרובה מותגים', desc:'מנהל 5 חברות? אין בעיה. כל מותג מבודד עם המבנה שלו.' },
        { title:'היררכיה ב-4 רמות', desc:'מותג → פרויקט → מחלקה → שלב. כמה עמוק שצריך.' },
        { title:'לוח ויזואלי', desc:'ראה את כל המותג שלך — פרויקטים, מחלקות וערוצים — על קנבס אחד.' },
        { title:'Pipeline של שלבים', desc:'לכל מחלקה יש pipeline. הזז שלבים מ-Todo → פעיל → הושלם → תקוע.' },
        { title:'ניהול פיננסי', desc:'ניהול פיננסי מובנה: הלוואות, נכסים, הוצאות, תזרים מזומנים.' },
        { title:'ניהול ערוצים', desc:'למחלקות יכולים להיות ערוצי משנה — מושלם לסוכנויות עם מספר לקוחות.' },
      ],
    },
    pricing: {
      chip: 'תמחור', h2: 'התחל בחינם. גדל בקצב שלך.',
      free: { name:'חינמי', price:'₪0', per:'/חודש', cta:'התחל בחינם',
        items:['עד 3 מותגים','פרויקטים ללא הגבלה','Pipeline שלבים','ניהול פיננסי','היסטוריה של 7 ימים'] },
      pro: { name:'Pro', price:'₪49', per:'/חודש', badge:'הפופולרי ביותר', cta:'עבור ל-Pro ←',
        items:['מותגים ללא הגבלה','אשף מותג AI','לוח ויזואלי','תמיכה עדיפותית','אנליטיקס מתקדם','שיתוף פעולה בצוות'] },
      footnote: 'כל התוכניות · ניסיון Pro 14 יום · ללא כרטיס אשראי',
    },
    cta: { h2:'הפסק לבנות מהזיכרון.', sub:'beseder נותן לכל עסק שאתה מנהל בית מסודר וברור.', btn:'התחל בחינם ←', link:'למד עוד' },
    footer: { tagline:'סדר מתוך כאוס.' },
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

function Fade({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, visible } = useFadeUp()
  return <div ref={ref} className={className} style={{ opacity: visible ? 1 : 0, transform: visible ? 'none' : 'translateY(28px)', transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms` }}>{children}</div>
}

function Logo({ white }: { white?: boolean }) {
  const c = white ? '#E8F4F6' : '#0B1B2B'
  const gs = white ? [['#2FE0D6','#3A9BE8'],['gw']] : [['#1FAEB5','#0E5FA8'],['g2']]
  const id = white ? 'gw' : 'g2'
  const [c1, c2] = white ? ['#2FE0D6','#3A9BE8'] : ['#1FAEB5','#0E5FA8']
  return (
    <svg width="130" height="48" viewBox="0 0 244 90" fill="none">
      <defs><linearGradient id={id} x1="20" y1="20" x2="72" y2="72" gradientUnits="userSpaceOnUse"><stop stopColor={c1}/><stop offset="1" stopColor={c2}/></linearGradient></defs>
      <rect x="20" y="19" width="52" height="52" rx="15" fill={`url(#${id})`}/>
      <rect x="30" y="31" width="32" height="6" rx="3" fill="#fff" opacity="0.95"/>
      <rect x="30" y="42" width="24" height="6" rx="3" fill="#fff" opacity="0.8"/>
      <rect x="30" y="53" width="30" height="6" rx="3" fill="#fff" opacity="0.65"/>
      <text x="90" y="57" fontFamily="Sora, sans-serif" fontSize="30" fontWeight="700" fill={c} letterSpacing="-0.5">beseder</text>
    </svg>
  )
}

function Check({ green }: { green?: boolean }) {
  return <div style={{ width:18, height:18, borderRadius:'50%', background: green ? 'rgba(31,174,181,0.15)' : 'rgba(31,174,181,0.1)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}><svg width="9" height="7" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1" stroke="#1FAEB5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
}

function LangToggle({ lang, setLang }: { lang: Lang; setLang: (l: Lang) => void }) {
  return (
    <div style={{ display:'flex', background:'rgba(232,244,246,0.08)', borderRadius:999, padding:3, gap:2 }}>
      {(['en','he'] as Lang[]).map(l => (
        <button key={l} onClick={() => setLang(l)} style={{ padding:'4px 12px', borderRadius:999, border:'none', cursor:'pointer', fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:12, transition:'all 0.2s', background: lang===l ? 'rgba(31,174,181,0.9)' : 'transparent', color: lang===l ? '#fff' : 'rgba(232,244,246,0.5)' }}>{l.toUpperCase()}</button>
      ))}
    </div>
  )
}

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

  return (
    <main dir={isHe ? 'rtl' : 'ltr'} style={{ fontFamily:'Manrope, sans-serif' }}>

      {/* ── Navbar ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white transition-all duration-200" style={scrolled ? { boxShadow:'0 1px 0 #E8F4F6, 0 2px 12px rgba(11,27,43,0.06)' } : {}}>
        <div className="max-w-6xl mx-auto px-5 md:px-8 flex items-center justify-between h-16">
          <a href="#"><Logo /></a>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" style={{ fontFamily:'Manrope, sans-serif', fontSize:14, fontWeight:500, color:'rgba(11,27,43,0.65)', textDecoration:'none' }}>{t.nav.features}</a>
            <a href="#how-it-works" style={{ fontFamily:'Manrope, sans-serif', fontSize:14, fontWeight:500, color:'rgba(11,27,43,0.65)', textDecoration:'none' }}>{t.nav.howItWorks}</a>
            <a href="#pricing" style={{ fontFamily:'Manrope, sans-serif', fontSize:14, fontWeight:500, color:'rgba(11,27,43,0.65)', textDecoration:'none' }}>{t.nav.pricing}</a>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <LangToggle lang={lang} setLang={setLang} />
            <a href="/login" style={{ fontFamily:'Sora, sans-serif', fontSize:14, fontWeight:600, color:'rgba(11,27,43,0.65)', textDecoration:'none', padding:'8px 16px' }}>{t.nav.signin}</a>
            <a href="/signup" style={{ background:'linear-gradient(135deg,#1FAEB5,#0E5FA8)', color:'#fff', fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:14, borderRadius:999, padding:'10px 22px', textDecoration:'none' }}>{t.nav.cta}</a>
          </div>
          <button className="md:hidden flex flex-col gap-1.5 p-2" onClick={() => setMobileOpen(!mobileOpen)}>
            <span className={`block w-6 h-0.5 bg-gray-800 transition-all ${mobileOpen?'rotate-45 translate-y-2':''}`}/>
            <span className={`block w-6 h-0.5 bg-gray-800 transition-all ${mobileOpen?'opacity-0':''}`}/>
            <span className={`block w-6 h-0.5 bg-gray-800 transition-all ${mobileOpen?'-rotate-45 -translate-y-2':''}`}/>
          </button>
        </div>
        <div className={`md:hidden overflow-hidden transition-all duration-300 bg-white border-t border-gray-100 ${mobileOpen?'max-h-80':'max-h-0'}`}>
          <div className="px-5 py-4 flex flex-col gap-4">
            <a href="#features" style={{ fontSize:14, color:'rgba(11,27,43,0.65)', textDecoration:'none' }}>{t.nav.features}</a>
            <a href="#how-it-works" style={{ fontSize:14, color:'rgba(11,27,43,0.65)', textDecoration:'none' }}>{t.nav.howItWorks}</a>
            <a href="#pricing" style={{ fontSize:14, color:'rgba(11,27,43,0.65)', textDecoration:'none' }}>{t.nav.pricing}</a>
            <div style={{ display:'flex', alignItems:'center', gap:12, paddingTop:8, borderTop:'1px solid #e5e7eb' }}>
              <LangToggle lang={lang} setLang={setLang} />
              <a href="/login" style={{ fontSize:14, color:'rgba(11,27,43,0.65)', textDecoration:'none' }}>{t.nav.signin}</a>
              <a href="/signup" style={{ background:'linear-gradient(135deg,#1FAEB5,#0E5FA8)', color:'#fff', fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:13, borderRadius:999, padding:'8px 18px', textDecoration:'none' }}>{t.nav.cta}</a>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ background:'#0B1B2B', minHeight:'100vh', display:'flex', alignItems:'center', paddingTop:80, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          <div style={{ position:'absolute', top:'10%', left:'5%', width:500, height:500, background:'radial-gradient(circle,rgba(31,174,181,0.1) 0%,transparent 70%)', filter:'blur(40px)' }}/>
          <div style={{ position:'absolute', bottom:'10%', right:'5%', width:400, height:400, background:'radial-gradient(circle,rgba(14,95,168,0.12) 0%,transparent 70%)', filter:'blur(40px)' }}/>
        </div>
        <div className="relative z-10 max-w-6xl mx-auto px-5 md:px-8 w-full py-20">
          <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-20">
            <div className="flex-1 text-center lg:text-left max-w-xl mx-auto lg:mx-0" style={isHe ? { textAlign:'right' } : {}}>
              <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:28, background:'rgba(31,174,181,0.1)', border:'1px solid rgba(31,174,181,0.25)', borderRadius:999, padding:'6px 14px' }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:'#1FAEB5', display:'inline-block' }}/>
                <span style={{ fontFamily:'Sora, sans-serif', fontSize:11, fontWeight:700, letterSpacing:'0.12em', color:'#1FAEB5', textTransform:'uppercase' }}>{t.hero.chip}</span>
              </div>
              <h1 style={{ fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:'clamp(42px,6vw,72px)', color:'#E8F4F6', lineHeight:1.1, marginBottom:24 }}>
                {t.hero.h1a}<br/>
                <span style={{ backgroundImage:'linear-gradient(135deg,#1FAEB5,#3A9BE8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{t.hero.h1b}</span>
              </h1>
              <p style={{ fontSize:18, color:'rgba(232,244,246,0.65)', lineHeight:1.7, marginBottom:32, maxWidth:460 }}>{t.hero.sub}</p>
              <div style={{ display:'flex', flexWrap:'wrap', gap:12, justifyContent: isHe ? 'flex-start' : 'flex-start', marginBottom:20 }}>
                <a href="/signup" style={{ background:'linear-gradient(135deg,#1FAEB5,#0E5FA8)', color:'#fff', fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:15, borderRadius:999, padding:'13px 28px', textDecoration:'none', display:'inline-flex', alignItems:'center' }}>{t.hero.cta}</a>
                <a href="#how-it-works" style={{ display:'inline-flex', alignItems:'center', gap:8, fontFamily:'Sora, sans-serif', fontWeight:600, fontSize:15, color:'rgba(232,244,246,0.8)', border:'1.5px solid rgba(232,244,246,0.2)', borderRadius:999, padding:'12px 22px', textDecoration:'none' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                  {t.hero.demo}
                </a>
              </div>
              <p style={{ fontSize:12, color:'rgba(232,244,246,0.35)' }}>{t.hero.trust}</p>
            </div>
            {/* Mockup */}
            <div className="flex-shrink-0">
              <div style={{ width:300, borderRadius:20, background:'linear-gradient(160deg,#0f2236,#0a1929)', border:'1px solid rgba(31,174,181,0.18)', boxShadow:'0 0 40px rgba(31,174,181,0.18),0 30px 80px rgba(0,0,0,0.55)', padding:'24px 20px 20px' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:10, color:'rgba(232,244,246,0.4)', letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:2 }}>Today&apos;s focus</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#E8F4F6', fontFamily:'Sora, sans-serif' }}>Wednesday, May 27</div>
                  </div>
                  <div style={{ background:'linear-gradient(135deg,#1FAEB5,#0E5FA8)', borderRadius:8, padding:'4px 10px', fontSize:11, fontWeight:700, color:'#fff' }}>3 / 7</div>
                </div>
                <div style={{ height:1, background:'rgba(232,244,246,0.08)', marginBottom:14 }}/>
                {[
                  { text:'Review pitch deck', badge:'Done', bc:'#1FAEB5', done:true },
                  { text:'Call with investor', badge:'High', bc:'#F59E0B', done:false },
                  { text:'Ship onboarding v2', badge:'Focus', bc:'#3B82F6', done:false },
                ].map((item, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10, opacity: item.done ? 0.6 : 1 }}>
                    <div style={{ width:18, height:18, borderRadius:5, background: item.done ? 'linear-gradient(135deg,#1FAEB5,#0E5FA8)' : 'transparent', border: item.done ? 'none' : '1.5px solid rgba(31,174,181,0.4)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      {item.done && <svg width="10" height="8" viewBox="0 0 11 9" fill="none"><path d="M1 4.5L4 7.5L10 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                    <span style={{ flex:1, fontSize:12, fontWeight:500, color: item.done ? 'rgba(232,244,246,0.5)' : '#E8F4F6', textDecoration: item.done ? 'line-through' : 'none' }}>{item.text}</span>
                    <span style={{ fontSize:10, fontWeight:700, color:item.bc, background:`${item.bc}18`, borderRadius:99, padding:'2px 8px' }}>{item.badge}</span>
                  </div>
                ))}
                <div style={{ height:1, background:'rgba(232,244,246,0.08)', margin:'14px 0 12px' }}/>
                <div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6 }}>
                    <span style={{ fontSize:10, color:'rgba(232,244,246,0.4)' }}>Daily progress</span>
                    <span style={{ fontSize:10, color:'#1FAEB5', fontWeight:700 }}>3 of 7 done</span>
                  </div>
                  <div style={{ height:4, background:'rgba(255,255,255,0.07)', borderRadius:999, overflow:'hidden' }}>
                    <div style={{ height:'100%', width:'43%', background:'linear-gradient(90deg,#1FAEB5,#0E5FA8)', borderRadius:999 }}/>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="how-it-works" style={{ background:'#E8F4F6', padding:'100px 0' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <Fade className="text-center mb-16">
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:20, background:'rgba(31,174,181,0.1)', border:'1px solid rgba(31,174,181,0.2)', borderRadius:999, padding:'5px 14px' }}>
              <span style={{ fontFamily:'Sora, sans-serif', fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'#1FAEB5', textTransform:'uppercase' }}>{t.how.chip}</span>
            </div>
            <h2 style={{ fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:'clamp(28px,4vw,48px)', color:'#0B1B2B' }}>{t.how.h2}</h2>
          </Fade>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {t.how.steps.map((step, i) => (
              <Fade key={i} delay={i * 120}>
                <div style={{ background:'#fff', borderRadius:20, padding:'32px 28px', border:'1px solid rgba(31,174,181,0.1)', height:'100%' }}>
                  <div style={{ fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:40, lineHeight:1, marginBottom:16, backgroundImage:'linear-gradient(135deg,#1FAEB5,#0E5FA8)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', backgroundClip:'text' }}>{step.n}</div>
                  <h3 style={{ fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:20, color:'#0B1B2B', marginBottom:12 }}>{step.title}</h3>
                  <p style={{ fontSize:14, color:'rgba(11,27,43,0.6)', lineHeight:1.7 }}>{step.desc}</p>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ background:'#fff', padding:'100px 0' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <Fade className="text-center mb-16">
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:20, background:'rgba(11,27,43,0.05)', border:'1px solid rgba(11,27,43,0.1)', borderRadius:999, padding:'5px 14px' }}>
              <span style={{ fontFamily:'Sora, sans-serif', fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'rgba(11,27,43,0.5)', textTransform:'uppercase' }}>{t.features.chip}</span>
            </div>
            <h2 style={{ fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:'clamp(28px,4vw,48px)', color:'#0B1B2B' }}>{t.features.h2}</h2>
          </Fade>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
            {t.features.items.map((f, i) => (
              <Fade key={i} delay={i * 80}>
                <div style={{ background:'#fff', borderRadius:18, padding:'28px 24px', border:'1.5px solid rgba(11,27,43,0.07)', height:'100%', transition:'all 0.2s', cursor:'default' }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='rgba(31,174,181,0.4)'; el.style.boxShadow='0 4px 24px rgba(31,174,181,0.1)'; el.style.transform='translateY(-2px)' }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.borderColor='rgba(11,27,43,0.07)'; el.style.boxShadow='none'; el.style.transform='none' }}
                >
                  <div style={{ width:40, height:40, borderRadius:12, background:'rgba(31,174,181,0.1)', display:'flex', alignItems:'center', justifyContent:'center', color:'#1FAEB5', marginBottom:14 }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
                  </div>
                  <h3 style={{ fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:15, color:'#0B1B2B', marginBottom:8 }}>{f.title}</h3>
                  <p style={{ fontSize:13, color:'rgba(11,27,43,0.55)', lineHeight:1.65 }}>{f.desc}</p>
                </div>
              </Fade>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ background:'#E8F4F6', padding:'100px 0' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <Fade className="text-center mb-14">
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, marginBottom:20, background:'rgba(31,174,181,0.12)', border:'1px solid rgba(31,174,181,0.22)', borderRadius:999, padding:'5px 14px' }}>
              <span style={{ fontFamily:'Sora, sans-serif', fontSize:11, fontWeight:700, letterSpacing:'0.1em', color:'#1FAEB5', textTransform:'uppercase' }}>{t.pricing.chip}</span>
            </div>
            <h2 style={{ fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:'clamp(28px,4vw,48px)', color:'#0B1B2B' }}>{t.pricing.h2}</h2>
          </Fade>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            <Fade>
              <div style={{ background:'#fff', borderRadius:24, padding:'36px 32px', border:'1.5px solid rgba(11,27,43,0.08)', height:'100%', display:'flex', flexDirection:'column' }}>
                <div style={{ fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:16, color:'#0B1B2B', marginBottom:8 }}>{t.pricing.free.name}</div>
                <div style={{ marginBottom:24 }}><span style={{ fontFamily:'Sora, sans-serif', fontWeight:800, fontSize:40, color:'#0B1B2B' }}>{t.pricing.free.price}</span><span style={{ fontSize:14, color:'rgba(11,27,43,0.45)', marginRight:6 }}>{t.pricing.free.per}</span></div>
                <ul style={{ listStyle:'none', padding:0, margin:'0 0 32px', flex:1 }}>
                  {t.pricing.free.items.map((item, i) => (
                    <li key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}><Check /><span style={{ fontSize:14, color:'rgba(11,27,43,0.7)' }}>{item}</span></li>
                  ))}
                </ul>
                <a href="/signup" style={{ background:'transparent', border:'2px solid rgba(31,174,181,0.4)', color:'#1FAEB5', fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:15, borderRadius:12, padding:'13px', textDecoration:'none', textAlign:'center', display:'block' }}>{t.pricing.free.cta}</a>
              </div>
            </Fade>
            <Fade delay={150}>
              <div style={{ background:'#0B1B2B', borderRadius:24, padding:'36px 32px', border:'1.5px solid rgba(31,174,181,0.25)', height:'100%', display:'flex', flexDirection:'column', position:'relative', overflow:'hidden', boxShadow:'0 8px 40px rgba(31,174,181,0.15)' }}>
                <div style={{ position:'absolute', top:20, [isHe?'left':'right']:20, background:'linear-gradient(135deg,#1FAEB5,#0E5FA8)', borderRadius:999, padding:'4px 12px', fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:11, color:'#fff' }}>{t.pricing.pro.badge}</div>
                <div style={{ fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:16, color:'#E8F4F6', marginBottom:8 }}>{t.pricing.pro.name}</div>
                <div style={{ marginBottom:24 }}><span style={{ fontFamily:'Sora, sans-serif', fontWeight:800, fontSize:40, color:'#E8F4F6' }}>{t.pricing.pro.price}</span><span style={{ fontSize:14, color:'rgba(232,244,246,0.4)', marginRight:6 }}>{t.pricing.pro.per}</span></div>
                <ul style={{ listStyle:'none', padding:0, margin:'0 0 32px', flex:1 }}>
                  {t.pricing.pro.items.map((item, i) => (
                    <li key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}><Check green /><span style={{ fontSize:14, color:'rgba(232,244,246,0.7)' }}>{item}</span></li>
                  ))}
                </ul>
                <a href="/signup" style={{ background:'linear-gradient(135deg,#1FAEB5,#0E5FA8)', color:'#fff', fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:15, borderRadius:12, padding:'13px', textDecoration:'none', textAlign:'center', display:'block' }}>{t.pricing.pro.cta}</a>
              </div>
            </Fade>
          </div>
          <Fade className="text-center mt-8">
            <p style={{ fontSize:13, color:'rgba(11,27,43,0.45)' }}>{t.pricing.footnote}</p>
          </Fade>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ background:'linear-gradient(135deg,#1FAEB5,#0E5FA8)', padding:'100px 0' }}>
        <div className="max-w-3xl mx-auto px-5 md:px-8 text-center">
          <Fade>
            <h2 style={{ fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:'clamp(32px,5vw,56px)', color:'#fff', lineHeight:1.15, marginBottom:16 }}>{t.cta.h2}</h2>
            <p style={{ fontSize:17, color:'rgba(255,255,255,0.75)', lineHeight:1.7, marginBottom:40 }}>{t.cta.sub}</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:16, justifyContent:'center' }}>
              <a href="/signup" style={{ background:'#fff', color:'#0B1B2B', fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:15, borderRadius:999, padding:'13px 28px', textDecoration:'none' }}>{t.cta.btn}</a>
              <a href="#features" style={{ color:'#fff', fontFamily:'Sora, sans-serif', fontWeight:600, fontSize:15, border:'2px solid rgba(255,255,255,0.45)', borderRadius:999, padding:'12px 28px', textDecoration:'none' }}>{t.cta.link}</a>
            </div>
          </Fade>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ background:'#0B1B2B', borderTop:'1px solid rgba(255,255,255,0.06)', padding:'60px 0 36px' }}>
        <div className="max-w-6xl mx-auto px-5 md:px-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-12 mb-12">
            <div>
              <Logo white />
              <p style={{ fontSize:13, color:'rgba(232,244,246,0.4)', marginTop:12 }}>{t.footer.tagline}</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              {[
                { title: isHe ? 'מוצר' : 'Product', items: [t.nav.features, t.nav.howItWorks, t.nav.pricing] },
                { title: isHe ? 'חברה' : 'Company', items: [isHe?'אודות':'About', isHe?'בלוג':'Blog'] },
                { title: isHe ? 'משפטי' : 'Legal', items: [isHe?'פרטיות':'Privacy', isHe?'תנאים':'Terms'] },
              ].map(col => (
                <div key={col.title}>
                  <div style={{ fontFamily:'Sora, sans-serif', fontWeight:700, fontSize:11, letterSpacing:'0.1em', color:'rgba(232,244,246,0.35)', textTransform:'uppercase', marginBottom:14 }}>{col.title}</div>
                  <ul style={{ listStyle:'none', padding:0, margin:0 }}>
                    {col.items.map(item => (
                      <li key={item} style={{ marginBottom:9 }}><a href="#" style={{ fontSize:13, color:'rgba(232,244,246,0.5)', textDecoration:'none' }}>{item}</a></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', paddingTop:24, display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
            <p style={{ fontSize:12, color:'rgba(232,244,246,0.3)' }}>&copy; 2026 beseder. All rights reserved.</p>
            <p style={{ fontFamily:'Sora, sans-serif', fontWeight:600, fontSize:12, color:'rgba(232,244,246,0.25)', letterSpacing:'0.04em' }}>getbeseder.com</p>
          </div>
        </div>
      </footer>
    </main>
  )
}
