"use client";

import { useState, useRef, useEffect } from "react";
import { Brand, Project, SubProject, Stage } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

/* ─── Constants ───────────────────────────────────────────── */
const COLORS = ["#f97316","#3b82f6","#10b981","#8b5cf6","#ec4899","#f59e0b","#ef4444","#14b8a6"];
const EMOJIS = ["🍽️","🚀","💡","🛍️","🎯","💰","🌟","🛠️","🎨","📊","🔥","💪","🌱","🏆","⚡","🎬","🏢","👔","💼","🌐"];

/* ─── Template types ──────────────────────────────────────── */
type BizType = "service" | "startup" | "ecommerce" | "freelance" | "custom";
type WizardStep = "basics" | "type" | "template" | "action" | "done";

interface TplSub {
  id: string; name: string; emoji: string;
  description: string; useChannels: boolean; stages: string[];
}
interface TplProject {
  id: string; name: string; emoji: string; color: string; subs: TplSub[];
}

function mkSub(name: string, emoji: string, desc: string, useChannels: boolean, stages: string[]): TplSub {
  return { id: uuidv4(), name, emoji, description: desc, useChannels, stages };
}
function mkProj(name: string, emoji: string, color: string, subs: TplSub[]): TplProject {
  return { id: uuidv4(), name, emoji, color, subs };
}

/* ─── Templates ───────────────────────────────────────────── */
const TEMPLATES: Record<BizType, TplProject[]> = {
  service: [
    mkProj("ניהול לקוחות", "🤝", "#8b5cf6", [
      mkSub("לקוחות פעילים",  "💼", "פריט לכל לקוח — ניהול שוטף", true,  []),
      mkSub("גיוס לקוחות",   "🚀", "מהליד הראשון ועד חתימה",           false, ["ליד", "שיחת מכירה", "הצעת מחיר", "חתימה", "אונבורדינג"]),
      mkSub("שימור ונאמנות", "❤️", "מניעת נטישה ושדרוג",               false, ["מעקב חודשי", "דוח ביצועים", "הצעת שדרוג"]),
    ]),
    mkProj("שיווק", "📢", "#f97316", [
      mkSub("תוכן ורשתות",  "🌱", "אורגני — אינסטגרם, לינקדאין",    false, ["תכנון תוכן", "הפקה", "פרסום", "ניתוח"]),
      mkSub("פרסום ממומן",  "💸", "קמפיינים ופריטים ממומנים",        true,  []),
    ]),
    mkProj("פיננסי", "💰", "#10b981", [
      mkSub("מעקב הכנסות", "📊", "חשבוניות, גבייה, מע״מ", false, ["חשבוניות", "גבייה", "מע״מ"]),
    ]),
  ],
  startup: [
    mkProj("מוצר", "📱", "#3b82f6", [
      mkSub("פיתוח",  "🛠️", "מ-MVP ועד השקה",              false, ["אפיון", "MVP", "אלפא", "בטא", "השקה"]),
      mkSub("עיצוב",  "🎨", "UX/UI — מחקר עד ביצוע",        false, ["UX Research", "Wireframes", "UI Design", "בדיקות"]),
      mkSub("אנליטיקס", "📊", "כלים, דשבורד, פעולות",      false, ["הטמעת כלים", "דשבורד", "פעולות לפי נתונים"]),
    ]),
    mkProj("גדילה", "🚀", "#f97316", [
      mkSub("רכישת משתמשים", "👥", "פריטי רכישה — קמפיינים, שיתופי פעולה", true,  []),
      mkSub("שימור",         "🔄", "אונבורדינג, Engagement, ריטנשן",         false, ["אונבורדינג", "Engagement", "ריטנשן"]),
    ]),
    mkProj("עסק", "💼", "#8b5cf6", [
      mkSub("גיוס משקיעים", "💰", "פיץ׳ דק ועד סגירה",    false, ["פיץ׳ דק", "פגישות", "Due Diligence", "סגירה"]),
      mkSub("מנהלה",        "📋", "תאגוד, חשבונאות, משפטי", false, ["תאגוד", "חשבונאות", "משפטי"]),
    ]),
  ],
  ecommerce: [
    mkProj("מוצר ומלאי", "📦", "#f97316", [
      mkSub("ניהול מלאי", "🏭", "רכש, קבלה, ניהול שוטף",     false, ["רכש", "קבלה ובדיקה", "ניהול שוטף", "פריקה"]),
      mkSub("ספקים",      "🤝", "פריט לכל ספק/קטגוריה", true,  []),
    ]),
    mkProj("שיווק ומכירות", "📣", "#ec4899", [
      mkSub("חנות אונליין",      "🛒", "UX, CRO, SEO, אוטומציות",       false, ["UX / עיצוב", "CRO", "SEO", "אוטומציות"]),
      mkSub("רשתות חברתיות",     "📱", "תוכן ומכירות חברתיות",           true,  []),
      mkSub("פרסום ממומן",       "💸", "Google, Meta, TikTok",            true,  []),
    ]),
    mkProj("שירות ולוגיסטיקה", "🚚", "#10b981", [
      mkSub("משלוחים",       "📮", "ספקי משלוח ואינטגרציות",  false, ["בחירת ספק", "שילוב מערכות", "מעקב"]),
      mkSub("שירות לקוחות", "💬", "FAQ, SLA, תלונות",         false, ["FAQ", "SLA", "טיפול בתלונות"]),
    ]),
  ],
  freelance: [
    mkProj("לקוחות ופרויקטים", "💼", "#8b5cf6", [
      mkSub("פרויקטים פעילים", "🎨", "פריט לכל לקוח/פרויקט",           true,  []),
      mkSub("לידים ומכירות",  "🎯", "מהליד הראשון עד חוזה",      false, ["ליד", "שיחה ראשונה", "הצעת מחיר", "חוזה"]),
    ]),
    mkProj("שיווק עצמי", "📢", "#f97316", [
      mkSub("נוכחות אונליין", "🌐", "פורטפוליו, לינקדאין, אינסטגרם", false, ["פורטפוליו", "לינקדאין", "אינסטגרם"]),
      mkSub("רשת קשרים",     "🤝", "המלצות ושיתופי פעולה",          false, ["קשרים קיימים", "בקשת המלצות", "שיתופי פעולה"]),
    ]),
    mkProj("פיננסי", "💰", "#10b981", [
      mkSub("מעקב הכנסות", "📊", "חשבוניות, גבייה, דוחות", false, ["חשבוניות", "גבייה", "דוחות"]),
    ]),
  ],
  custom: [],
};

const BIZ_TYPES: { id: BizType; emoji: string; title: string; desc: string }[] = [
  { id: "service",   emoji: "🤝", title: "עסק שירותים",         desc: "רטיינרים, לקוחות קבועים, ייעוץ" },
  { id: "startup",   emoji: "📱", title: "סטארטאפ / אפליקציה",  desc: "מוצר דיגיטלי, משתמשים, גדילה"   },
  { id: "ecommerce", emoji: "🛍️", title: "E-commerce / מוצר",  desc: "מכירות, מלאי, שיווק"              },
  { id: "freelance", emoji: "🎨", title: "פרילנסר / יצירתי",    desc: "פרויקטים, לקוחות, תוצרים"        },
  { id: "custom",    emoji: "✨", title: "בנה מאפס",             desc: "מבנה חופשי, ללא תבנית"           },
];

/* ─── Helper to build real project from template ─────────── */
function makeStage(name: string, order: number): Stage {
  return { id: uuidv4(), name, step: "", goal: "", status: "todo", notes: "", nextAction: "", order };
}
function buildProjects(
  tplProjects: TplProject[],
  selProjects: Set<string>,
  selSubs: Set<string>,
  names: Record<string, string>,
  firstAction: string,
): Project[] {
  let isFirst = true;
  return tplProjects
    .filter(tp => selProjects.has(tp.id))
    .map((tp, pi) => {
      const subs: SubProject[] = tp.subs
        .filter(ts => selSubs.has(ts.id))
        .map((ts, si) => {
          const stages = ts.useChannels
            ? []
            : ts.stages.map((s, i) => {
                const stage = makeStage(s, i);
                if (isFirst && i === 0 && firstAction.trim()) {
                  stage.nextAction = firstAction.trim();
                  stage.status = "active";
                  isFirst = false;
                }
                return stage;
              });
          return {
            id: uuidv4(),
            name: names[ts.id] ?? ts.name,
            emoji: ts.emoji,
            description: ts.description,
            stages,
            channels: [],
            order: si,
          } as SubProject;
        });
      return {
        id: uuidv4(),
        name: names[tp.id] ?? tp.name,
        emoji: tp.emoji,
        color: tp.color,
        description: "",
        subProjects: subs,
        order: pi,
      } as Project;
    });
}

/* ─── Props ───────────────────────────────────────────────── */
interface Props {
  existing?: Brand;
  onClose: () => void;
  onSave:  (brand: Brand) => void;
  onEnter?: (brand: Brand) => void;
}

/* ═══════════════════════════════════════════════════════════ */
export default function BrandWizard({ existing, onClose, onSave, onEnter }: Props) {

  /* ── Edit mode: show simple form ───────────────────────── */
  if (existing) return <SimpleEditForm existing={existing} onClose={onClose} onSave={onSave} />;

  /* ── New brand wizard ───────────────────────────────────── */
  const [step, setStep]           = useState<WizardStep>("basics");
  const [name, setName]           = useState("");
  const [emoji, setEmoji]         = useState("🚀");
  const [color, setColor]         = useState("#f97316");
  const [isFinancial, setIsFinancial] = useState(false);

  /* type + template state */
  const [bizType,    setBizType]  = useState<BizType | null>(null);
  const [selProjects, setSelProjects] = useState<Set<string>>(new Set());
  const [selSubs,     setSelSubs]     = useState<Set<string>>(new Set());
  const [names,       setNames]       = useState<Record<string, string>>({});
  const [editingId,   setEditingId]   = useState<string | null>(null);

  /* first action */
  const [firstAction, setFirstAction] = useState("");

  /* completed brand for done step */
  const [doneBrand, setDoneBrand] = useState<Brand | null>(null);

  /* ── helpers ───────────────────────────────────────────── */
  const STEP_LABELS: WizardStep[] = isFinancial
    ? ["basics", "done"]
    : bizType === "custom"
      ? ["basics", "type", "action", "done"]
      : ["basics", "type", "template", "action", "done"];

  const stepNum = STEP_LABELS.indexOf(step) + 1;
  const stepTotal = STEP_LABELS.length;

  const selectTemplate = (type: BizType) => {
    setBizType(type);
    const tpl = TEMPLATES[type];
    const pIds = new Set(tpl.map(p => p.id));
    const sIds = new Set(tpl.flatMap(p => p.subs.map(s => s.id)));
    setSelProjects(pIds);
    setSelSubs(sIds);
  };

  const toggleProject = (id: string) => {
    const s = new Set(selProjects);
    if (s.has(id)) {
      s.delete(id);
      // also deselect all its subs
      const tpl = bizType ? TEMPLATES[bizType] : [];
      const proj = tpl.find(p => p.id === id);
      if (proj) {
        const newSubs = new Set(selSubs);
        proj.subs.forEach(sub => newSubs.delete(sub.id));
        setSelSubs(newSubs);
      }
    } else {
      s.add(id);
    }
    setSelProjects(s);
  };

  const toggleSub = (id: string) => {
    const s = new Set(selSubs);
    s.has(id) ? s.delete(id) : s.add(id);
    setSelSubs(s);
  };

  const setItemName = (id: string, val: string) => setNames(prev => ({ ...prev, [id]: val }));

  /* ── build + finish ────────────────────────────────────── */
  const finish = (skipAction = false) => {
    const tpl = bizType && bizType !== "custom" ? TEMPLATES[bizType] : [];
    const projects = buildProjects(tpl, selProjects, selSubs, names, skipAction ? "" : firstAction);
    const brand: Brand = {
      id: uuidv4(),
      name: name.trim() || "מותג חדש",
      emoji: isFinancial ? "💰" : emoji,
      color: isFinancial ? "#10b981" : color,
      description: "",
      projects,
      createdAt: new Date().toISOString(),
    };
    setDoneBrand(brand);
    onSave(brand);
    setStep("done");
  };

  /* ── step: basics ─────────────────────────────────────── */
  if (step === "basics") {
    return (
      <WizardShell onClose={onClose} stepNum={stepNum} stepTotal={stepTotal} title="מותג חדש">
        <div className="space-y-5 px-6 py-5">
          {/* Type toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => { setIsFinancial(false); setEmoji("🚀"); setColor("#f97316"); }}
              className="rounded-xl border-2 px-3 py-3 text-right transition-all"
              style={{ borderColor: !isFinancial ? "#1FAEB5" : "#e5e7eb", background: !isFinancial ? "#f0f7fa" : "#f9fafb" }}
            >
              <div className="text-xl mb-0.5">🚀</div>
              <div className="text-sm font-bold text-gray-800">מותג / פרויקט</div>
              <div className="text-xs text-gray-400">משימות, פריטים, תבניות</div>
            </button>
            <button
              onClick={() => { setIsFinancial(true); setEmoji("💰"); setColor("#10b981"); if (!name) setName("פיננסי אישי"); }}
              className="rounded-xl border-2 px-3 py-3 text-right transition-all"
              style={{ borderColor: isFinancial ? "#10b981" : "#e5e7eb", background: isFinancial ? "#f0fdf4" : "#f9fafb" }}
            >
              <div className="text-xl mb-0.5">💰</div>
              <div className="text-sm font-bold text-gray-800">פיננסי אישי</div>
              <div className="text-xs text-gray-400">הלוואות, נכסים, הוצאות</div>
            </button>
          </div>

          {/* Name */}
          <div>
            <label>שם המותג *</label>
            <input
              className="input text-base font-semibold" autoFocus
              value={name} onChange={e => setName(e.target.value)}
              placeholder={isFinancial ? "פיננסי אישי" : "לדוגמה: ואכלת, דניאל סושיאל..."}
              onKeyDown={e => { if (e.key === "Enter" && name.trim()) { isFinancial ? finish() : setStep("type"); }}}
            />
          </div>

          {!isFinancial && (
            <>
              <div>
                <label>אייקון</label>
                <div className="grid grid-cols-10 gap-1 mt-1">
                  {EMOJIS.map(e => (
                    <button key={e} onClick={() => setEmoji(e)}
                      className={`text-xl p-1.5 rounded-lg transition-all ${emoji === e ? "bg-teal-100 ring-2 ring-teal-400" : "hover:bg-gray-100"}`}
                    >{e}</button>
                  ))}
                </div>
              </div>
              <div>
                <label>צבע מותג</label>
                <div className="flex gap-2 mt-1">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)} className="w-8 h-8 rounded-full transition-all"
                      style={{ background: c, transform: color === c ? "scale(1.2)" : "scale(1)", outline: color === c ? `3px solid ${c}` : "none", outlineOffset: 2 }}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {isFinancial && (
            <div className="rounded-xl p-3 text-sm text-emerald-700" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
              יוצר דשבורד פיננסי עם מעקב הלוואות, נכסים, הכנסות והוצאות.
            </div>
          )}
        </div>

        <WizardFooter
          onBack={onClose} backLabel="ביטול"
          onNext={() => isFinancial ? finish() : setStep("type")}
          nextLabel={isFinancial ? "💰 צור דשבורד" : "הבא ←"}
          nextDisabled={!name.trim()}
        />
      </WizardShell>
    );
  }

  /* ── step: type ───────────────────────────────────────── */
  if (step === "type") {
    return (
      <WizardShell onClose={onClose} stepNum={stepNum} stepTotal={stepTotal} title="סוג העסק">
        <div className="px-6 py-4">
          <p className="text-sm text-gray-500 mb-4">בחר תבנית שמתאימה לך — תוכל לשנות הכל אחר כך</p>
          <div className="grid grid-cols-1 gap-2.5">
            {BIZ_TYPES.map(bt => (
              <button
                key={bt.id}
                onClick={() => { selectTemplate(bt.id); setBizType(bt.id); }}
                className="flex items-center gap-4 px-4 py-3.5 rounded-2xl border-2 text-right transition-all hover:shadow-sm"
                style={{
                  borderColor: bizType === bt.id ? color : "#e5e7eb",
                  background:  bizType === bt.id ? color + "0f" : "#fafafa",
                }}
              >
                <span className="text-3xl shrink-0">{bt.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-gray-900 text-sm">{bt.title}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{bt.desc}</div>
                </div>
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${bizType === bt.id ? "border-current" : "border-gray-200"}`}
                  style={{ borderColor: bizType === bt.id ? color : undefined, background: bizType === bt.id ? color : undefined }}>
                  {bizType === bt.id && <span className="text-white text-[10px] font-black">✓</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        <WizardFooter
          onBack={() => setStep("basics")}
          onNext={() => bizType === "custom" ? setStep("action") : setStep("template")}
          nextLabel={bizType === "custom" ? "דלג לפעולה ←" : "המשך לתבנית ←"}
          nextDisabled={!bizType}
        />
      </WizardShell>
    );
  }

  /* ── step: template ───────────────────────────────────── */
  if (step === "template" && bizType && bizType !== "custom") {
    const tpl = TEMPLATES[bizType];
    const totalSubs   = tpl.flatMap(p => p.subs).filter(s => selSubs.has(s.id)).length;
    const totalStages = tpl.flatMap(p => p.subs).filter(s => selSubs.has(s.id)).reduce((n, s) => n + (s.useChannels ? 0 : s.stages.length), 0);

    return (
      <WizardShell onClose={onClose} stepNum={stepNum} stepTotal={stepTotal}
        title="בנה את המבנה" subtitle="סמן מה רלוונטי — שמות ניתנים לעריכה">
        {/* Summary bar */}
        <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100 bg-gray-50/80 text-xs text-gray-500">
          <span className="font-semibold">{selProjects.size} פרויקטים</span>
          <span className="text-gray-300">·</span>
          <span>{totalSubs} מחלקות</span>
          {totalStages > 0 && <><span className="text-gray-300">·</span><span>{totalStages} משימות</span></>}
        </div>

        <div className="overflow-y-auto" style={{ maxHeight: "52vh" }}>
          {tpl.map(tp => {
            const projSelected = selProjects.has(tp.id);
            return (
              <div key={tp.id} className="border-b border-gray-100 last:border-0">
                {/* Project row */}
                <div
                  className="flex items-center gap-3 px-5 py-3 cursor-pointer select-none transition-colors hover:bg-gray-50"
                  onClick={() => toggleProject(tp.id)}
                >
                  <Checkbox checked={projSelected} color={tp.color} />
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0"
                    style={{ background: tp.color + "20" }}>{tp.emoji}</div>
                  {editingId === tp.id ? (
                    <EditableInput
                      value={names[tp.id] ?? tp.name}
                      onChange={v => setItemName(tp.id, v)}
                      onDone={() => setEditingId(null)}
                    />
                  ) : (
                    <span className="font-bold text-gray-900 flex-1"
                      onDoubleClick={e => { e.stopPropagation(); setEditingId(tp.id); }}>
                      {names[tp.id] ?? tp.name}
                    </span>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); setEditingId(editingId === tp.id ? null : tp.id); }}
                    className="text-gray-300 hover:text-gray-500 text-xs px-1 transition-colors shrink-0"
                  >✏️</button>
                </div>

                {/* Sub rows */}
                {projSelected && tp.subs.map(ts => {
                  const subSelected = selSubs.has(ts.id);
                  return (
                    <div key={ts.id}
                      className="flex items-center gap-3 pl-12 pr-5 py-2.5 cursor-pointer select-none transition-colors hover:bg-gray-50"
                      onClick={() => toggleSub(ts.id)}
                    >
                      <Checkbox checked={subSelected} color={tp.color} small />
                      <span className="text-base shrink-0">{ts.emoji}</span>
                      {editingId === ts.id ? (
                        <EditableInput
                          value={names[ts.id] ?? ts.name}
                          onChange={v => setItemName(ts.id, v)}
                          onDone={() => setEditingId(null)}
                        />
                      ) : (
                        <span className="text-sm text-gray-700 flex-1"
                          onDoubleClick={e => { e.stopPropagation(); setEditingId(ts.id); }}>
                          {names[ts.id] ?? ts.name}
                        </span>
                      )}
                      <div className="flex items-center gap-1 shrink-0">
                        {ts.useChannels
                          ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 font-medium">פריטים</span>
                          : ts.stages.length > 0
                            ? <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{ts.stages.length} משימות</span>
                            : null
                        }
                        <button
                          onClick={e => { e.stopPropagation(); setEditingId(editingId === ts.id ? null : ts.id); }}
                          className="text-gray-300 hover:text-gray-500 text-xs px-1 transition-colors"
                        >✏️</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>

        <WizardFooter
          onBack={() => setStep("type")}
          onNext={() => setStep("action")}
          nextLabel="הבא ←"
          nextDisabled={selProjects.size === 0}
        />
      </WizardShell>
    );
  }

  /* ── step: action ─────────────────────────────────────── */
  if (step === "action") {
    return (
      <WizardShell onClose={onClose} stepNum={stepNum} stepTotal={stepTotal}
        title="פעולה ראשונה" subtitle="מה הדבר הראשון שצריך לקרות?">
        <div className="px-6 py-6 space-y-4">
          <div className="rounded-2xl p-4" style={{ background: color + "0f", border: `1.5px solid ${color}30` }}>
            <p className="text-sm text-gray-600 mb-1">🎯 הפעולה הזו תיכנס למשימה הראשונה במחלקה הראשונה</p>
            <p className="text-xs text-gray-400">כל משימה שנוצרת תחכה לך — תוכל למלא לפי הקצב שלך</p>
          </div>
          <textarea
            autoFocus
            className="input w-full min-h-[100px] resize-none text-base"
            value={firstAction}
            onChange={e => setFirstAction(e.target.value)}
            placeholder="לדוגמה: ליצור קשר עם 3 לקוחות פוטנציאליים, לסיים את ה-MVP הראשון..."
          />
        </div>

        <WizardFooter
          onBack={() => bizType === "custom" ? setStep("type") : setStep("template")}
          onNext={() => finish(false)}
          nextLabel="✨ צור מותג"
          skipLabel="דלג"
          onSkip={() => finish(true)}
        />
      </WizardShell>
    );
  }

  /* ── step: done ───────────────────────────────────────── */
  if (step === "done" && doneBrand) {
    const totalProjects = doneBrand.projects.length;
    const totalSubsCount = doneBrand.projects.reduce((n, p) => n + p.subProjects.length, 0);
    const totalStagesCount = doneBrand.projects.reduce((n, p) => p.subProjects.reduce((m, s) => m + s.stages.length, n), 0);
    return (
      <WizardShell onClose={onClose} stepNum={stepNum} stepTotal={stepTotal} title="">
        <div className="flex flex-col items-center text-center px-8 py-10 gap-5">
          <div className="text-6xl animate-bounce">🎉</div>
          <div>
            <h2 className="font-black text-gray-900 text-2xl mb-2">
              {doneBrand.emoji} {doneBrand.name} מוכן!
            </h2>
            <p className="text-gray-400 text-sm">הכל מוכן לעבודה — בוא נתחיל</p>
          </div>

          {/* Stats */}
          {totalProjects > 0 && (
            <div className="flex gap-3 flex-wrap justify-center">
              {[
                { n: totalProjects, label: "פרויקטים",  emoji: "📁" },
                { n: totalSubsCount, label: "מחלקות",   emoji: "🗂️" },
                { n: totalStagesCount, label: "משימות",  emoji: "✅" },
              ].filter(s => s.n > 0).map(s => (
                <div key={s.label} className="px-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-100">
                  <div className="text-xl mb-0.5">{s.emoji}</div>
                  <div className="font-black text-gray-900 text-lg leading-none">{s.n}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
          )}

          {firstAction.trim() && (
            <div className="w-full rounded-2xl p-4 text-right" style={{ background: color + "0f", border: `1.5px solid ${color}30` }}>
              <p className="text-xs text-gray-400 mb-1">פעולה ראשונה 🎯</p>
              <p className="text-sm font-semibold text-gray-800">{firstAction}</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 sticky bottom-0 bg-white rounded-b-2xl" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <button
            onClick={() => { onEnter?.(doneBrand); onClose(); }}
            className="btn btn-orange w-full text-base py-3.5"
            style={{ background: color }}
          >
            כנס למותג {doneBrand.emoji} ←
          </button>
        </div>
      </WizardShell>
    );
  }

  return null;
}

/* ─── Reusable sub-components ─────────────────────────────── */

function WizardShell({ children, onClose, stepNum, stepTotal, title, subtitle }: {
  children: React.ReactNode;
  onClose: () => void;
  stepNum: number; stepTotal: number;
  title: string; subtitle?: string;
}) {
  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal w-full flex flex-col" style={{ maxWidth: 540 }}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl shrink-0">
          <div>
            {title && <h2 className="text-lg font-black text-gray-900">{title}</h2>}
            {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-3">
            {/* Progress dots */}
            <div className="flex gap-1.5">
              {Array.from({ length: stepTotal }).map((_, i) => (
                <div key={i} className="rounded-full transition-all duration-300"
                  style={{
                    width: i + 1 === stepNum ? 16 : 6,
                    height: 6,
                    background: i + 1 <= stepNum ? "#f97316" : "#e5e7eb",
                  }}
                />
              ))}
            </div>
            <button onClick={onClose} className="icon-btn w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm">✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}

function WizardFooter({ onBack, backLabel = "← חזור", onNext, nextLabel, nextDisabled, skipLabel, onSkip }: {
  onBack: () => void; backLabel?: string;
  onNext: () => void; nextLabel: string; nextDisabled?: boolean;
  skipLabel?: string; onSkip?: () => void;
}) {
  return (
    <div className="px-6 py-4 border-t border-gray-100 flex flex-col gap-2 sticky bottom-0 bg-white rounded-b-2xl shrink-0" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
      <div className="flex gap-2">
        <button onClick={onNext} disabled={nextDisabled}
          className="btn btn-orange flex-1" style={{ opacity: nextDisabled ? 0.4 : 1 }}>
          {nextLabel}
        </button>
        <button onClick={onBack} className="btn btn-ghost px-4">{backLabel}</button>
      </div>
      {skipLabel && onSkip && (
        <button onClick={onSkip} className="text-sm text-gray-400 hover:text-gray-600 transition-colors text-center py-1">
          {skipLabel}
        </button>
      )}
    </div>
  );
}

function Checkbox({ checked, color, small }: { checked: boolean; color: string; small?: boolean }) {
  const size = small ? "w-4 h-4" : "w-5 h-5";
  return (
    <div className={`${size} rounded border-2 flex items-center justify-center shrink-0 transition-all`}
      style={{
        borderColor: checked ? color : "#d1d5db",
        background:  checked ? color : "white",
      }}>
      {checked && <span className="text-white font-black" style={{ fontSize: small ? 8 : 10 }}>✓</span>}
    </div>
  );
}

function EditableInput({ value, onChange, onDone }: {
  value: string; onChange: (v: string) => void; onDone: () => void;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <input ref={ref} className="input text-sm py-1 px-2 flex-1 font-semibold"
      value={value} onChange={e => onChange(e.target.value)}
      onBlur={onDone} onKeyDown={e => { if (e.key === "Enter" || e.key === "Escape") onDone(); }}
      onClick={e => e.stopPropagation()}
    />
  );
}

/* ─── Simple edit form (for editing existing brands) ─────── */
function SimpleEditForm({ existing, onClose, onSave }: {
  existing: Brand; onClose: () => void; onSave: (b: Brand) => void;
}) {
  const [name,  setName]  = useState(existing.name);
  const [emoji, setEmoji] = useState(existing.emoji);
  const [color, setColor] = useState(existing.color);

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal w-full" style={{ maxWidth: 480 }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-black text-gray-900">ערוך מותג</h2>
          <button onClick={onClose} className="icon-btn w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm">✕</button>
        </div>
        <div className="px-6 py-5 space-y-5">
          <div>
            <label>אייקון</label>
            <div className="grid grid-cols-10 gap-1 mt-1">
              {EMOJIS.map(e => (
                <button key={e} onClick={() => setEmoji(e)}
                  className={`text-xl p-1.5 rounded-lg transition-all ${emoji === e ? "bg-teal-100 ring-2 ring-teal-400" : "hover:bg-gray-100"}`}
                >{e}</button>
              ))}
            </div>
          </div>
          <div>
            <label>שם המותג *</label>
            <input className="input text-base font-semibold" value={name} autoFocus
              onChange={e => setName(e.target.value)} placeholder="שם המותג..." />
          </div>
          <div>
            <label>צבע מותג</label>
            <div className="flex gap-2 mt-1">
              {COLORS.map(c => (
                <button key={c} onClick={() => setColor(c)} className="w-8 h-8 rounded-full transition-all"
                  style={{ background: c, transform: color === c ? "scale(1.2)" : "scale(1)", outline: color === c ? `3px solid ${c}` : "none", outlineOffset: 2 }}
                />
              ))}
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 sticky bottom-0 bg-white rounded-b-2xl" style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}>
          <button onClick={() => { onSave({ ...existing, name: name.trim(), emoji, color }); onClose(); }}
            disabled={!name.trim()} className="btn btn-orange flex-1" style={{ opacity: name.trim() ? 1 : 0.5 }}>
            שמור שינויים
          </button>
          <button onClick={onClose} className="btn btn-ghost">ביטול</button>
        </div>
      </div>
    </div>
  );
}
