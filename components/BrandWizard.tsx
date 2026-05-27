"use client";

import { useState } from "react";
import { Brand, SubProject, Stage } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

const COLORS = ["#f97316","#3b82f6","#10b981","#8b5cf6","#ec4899","#f59e0b","#ef4444","#14b8a6"];
const EMOJIS = ["🍽️","🚀","💡","🛍️","🎯","💰","🌟","🛠️","🎨","📊","🔥","💪","🌱","🏆","⚡","🎬","🏢","👔","💼","🌐"];

interface AIDept {
  name: string;
  emoji: string;
  description: string;
  stages: string[];
  enabled: boolean;
}

interface Props {
  existing?: Brand;
  onClose: () => void;
  onSave: (brand: Brand) => void;
}

function makeStage(name: string, order: number): Stage {
  return { id: uuidv4(), name, step: "", goal: "", status: "todo", notes: "", nextAction: "", order };
}

function makeSub(dept: AIDept, order: number): SubProject {
  return {
    id: uuidv4(),
    name: dept.name,
    emoji: dept.emoji,
    description: dept.description,
    stages: dept.stages.map((s, i) => makeStage(s, i)),
    channels: [],
    order,
  };
}

export default function BrandWizard({ existing, onClose, onSave }: Props) {
  const [step, setStep] = useState<"form" | "loading" | "suggestions" | "simple">(existing ? "simple" : "form");

  /* form fields */
  const [name,        setName]        = useState(existing?.name        ?? "");
  const [emoji,       setEmoji]       = useState(existing?.emoji       ?? "🍽️");
  const [color,       setColor]       = useState(existing?.color       ?? "#f97316");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [goal,        setGoal]        = useState("");
  const [brandType,   setBrandType]   = useState<"regular" | "financial">("regular");

  /* AI state */
  const [depts, setDepts]     = useState<AIDept[]>([]);
  const [aiError, setAiError] = useState("");

  /* ── call AI ── */
  const fetchSuggestions = async () => {
    if (!name.trim() || !goal.trim()) return;
    setStep("loading");
    setAiError("");
    try {
      const res = await fetch("/api/suggest-departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ brandName: name, description, goal }),
      });
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setDepts((json.departments ?? []).map((d: Omit<AIDept, "enabled">) => ({ ...d, enabled: true })));
      setStep("suggestions");
    } catch (err) {
      setAiError(err instanceof Error ? err.message : "שגיאה לא ידועה");
      setStep("form");
    }
  };

  /* ── save with AI departments ── */
  const handleSaveWithDepts = () => {
    if (!name.trim()) return;
    const enabled = depts.filter(d => d.enabled);
    const brand: Brand = {
      id:          existing?.id          ?? uuidv4(),
      name:        name.trim(),
      emoji,
      color,
      description: description.trim(),
      createdAt:   existing?.createdAt   ?? new Date().toISOString(),
      projects:    existing?.projects ?? [],
    };
    /* If we have AI departments and no existing projects, create a project with them */
    if (enabled.length > 0 && brand.projects.length === 0) {
      brand.projects = [{
        id:          uuidv4(),
        name:        goal.trim() || name.trim(),
        emoji:       "🎯",
        color,
        description: goal.trim(),
        subProjects: enabled.map((d, i) => makeSub(d, i)),
        order:       0,
      }];
    }
    onSave(brand);
    onClose();
  };

  /* ── save simple (edit mode / skip AI) ── */
  const handleSaveSimple = () => {
    if (!name.trim()) return;
    onSave({
      id:          existing?.id          ?? uuidv4(),
      name:        name.trim(),
      emoji,
      color,
      description: description.trim(),
      projects:    existing?.projects    ?? [],
      createdAt:   existing?.createdAt   ?? new Date().toISOString(),
    });
    onClose();
  };

  /* ════ SIMPLE EDIT MODE ════ */
  if (step === "simple") {
    return (
      <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal w-full" style={{ maxWidth: 480 }}>
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
            <h2 className="text-lg font-black text-gray-900">ערוך מותג</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm">✕</button>
          </div>
          <div className="px-6 py-5 space-y-5">
            <div>
              <label>אייקון</label>
              <div className="grid grid-cols-10 gap-1 mt-1">
                {EMOJIS.map(e => <button key={e} onClick={() => setEmoji(e)} className={`text-xl p-1.5 rounded-lg transition-all ${emoji === e ? "bg-teal-100 ring-2 ring-teal-400" : "hover:bg-gray-100"}`}>{e}</button>)}
              </div>
            </div>
            <div>
              <label>שם המותג *</label>
              <input className="input text-base font-semibold" value={name} onChange={e => setName(e.target.value)} placeholder="לדוגמה: ואכלת, בריתס..." autoFocus />
            </div>
            <div>
              <label>תיאור קצר</label>
              <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="מה המותג הזה עושה?" />
            </div>
            <div>
              <label>צבע מותג</label>
              <div className="flex gap-2 mt-1">
                {COLORS.map(c => <button key={c} onClick={() => setColor(c)} className="w-8 h-8 rounded-full transition-all" style={{ background: c, transform: color === c ? "scale(1.2)" : "scale(1)", outline: color === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }} />)}
              </div>
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex gap-2 sticky bottom-0 bg-white rounded-b-2xl">
            <button onClick={handleSaveSimple} disabled={!name.trim()} className="btn btn-orange flex-1" style={{ opacity: name.trim() ? 1 : 0.5 }}>שמור שינויים</button>
            <button onClick={onClose} className="btn btn-ghost">ביטול</button>
          </div>
        </div>
      </div>
    );
  }

  /* ════ STEP 1: FORM ════ */
  if (step === "form") {
    return (
      <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal w-full" style={{ maxWidth: 520 }}>
          <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
            <div>
              <h2 className="text-lg font-black text-gray-900">מותג חדש ✨</h2>
              <p className="text-xs text-gray-400 mt-0.5">ספר לנו מה אתה בונה — ה-AI יציע לך מחלקות</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm">✕</button>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Brand type selector */}
            <div>
              <label>סוג</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  onClick={() => { setBrandType("regular"); }}
                  className="rounded-xl border-2 px-3 py-3 text-right transition-all"
                  style={{ borderColor: brandType === "regular" ? "#f97316" : "#e5e7eb", background: brandType === "regular" ? "#fff7ed" : "#f9fafb" }}
                >
                  <div className="text-lg mb-0.5">🚀</div>
                  <div className="text-sm font-bold text-gray-800">מותג / פרויקט</div>
                  <div className="text-xs text-gray-400">שלבים, ערוצים, AI</div>
                </button>
                <button
                  onClick={() => { setBrandType("financial"); setEmoji("💰"); setColor("#10b981"); if (!name) setName("פיננסי אישי"); }}
                  className="rounded-xl border-2 px-3 py-3 text-right transition-all"
                  style={{ borderColor: brandType === "financial" ? "#10b981" : "#e5e7eb", background: brandType === "financial" ? "#f0fdf4" : "#f9fafb" }}
                >
                  <div className="text-lg mb-0.5">💰</div>
                  <div className="text-sm font-bold text-gray-800">פיננסי אישי</div>
                  <div className="text-xs text-gray-400">הלוואות, נכסים, הוצאות</div>
                </button>
              </div>
            </div>

            {/* Name */}
            <div>
              <label>שם *</label>
              <input className="input text-base font-semibold" value={name} onChange={e => setName(e.target.value)} placeholder={brandType === "financial" ? "פיננסי אישי" : "לדוגמה: ואכלת, קמפיין חגים..."} autoFocus />
            </div>

            {brandType === "regular" && (
              <>
                {/* Emoji */}
                <div>
                  <label>אייקון</label>
                  <div className="grid grid-cols-10 gap-1 mt-1">
                    {EMOJIS.map(e => <button key={e} onClick={() => setEmoji(e)} className={`text-xl p-1.5 rounded-lg transition-all ${emoji === e ? "bg-teal-100 ring-2 ring-teal-400" : "hover:bg-gray-100"}`}>{e}</button>)}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label>תיאור קצר</label>
                  <input className="input" value={description} onChange={e => setDescription(e.target.value)} placeholder="מה זה בגדול?" />
                </div>

                {/* Goal — the AI key */}
                <div>
                  <label>
                    מה המטרה שלך? *
                    <span className="text-xs font-normal text-teal-500 mr-1">— ה-AI ייצור מחלקות לפי זה</span>
                  </label>
                  <textarea
                    className="input min-h-[80px] resize-none"
                    value={goal}
                    onChange={e => setGoal(e.target.value)}
                    placeholder="לדוגמה: להגיע ל-100,000 משתמשים, להשיק קמפיין פרסומי, לנהל 10 לקוחות עם הכנסה של 20,000₪ לחודש..."
                  />
                </div>

                {/* Color */}
                <div>
                  <label>צבע מותג</label>
                  <div className="flex gap-2 mt-1">
                    {COLORS.map(c => <button key={c} onClick={() => setColor(c)} className="w-8 h-8 rounded-full transition-all" style={{ background: c, transform: color === c ? "scale(1.2)" : "scale(1)", outline: color === c ? `3px solid ${c}` : "none", outlineOffset: "2px" }} />)}
                  </div>
                </div>
              </>
            )}

            {brandType === "financial" && (
              <div className="rounded-xl p-3 text-sm text-emerald-700" style={{ background: "#f0fdf4", border: "1px solid #bbf7d0" }}>
                יוצר דשבורד פיננסי עם מעקב הלוואות, נכסים, הכנסות והוצאות — תוכל להוסיף את הנתונים שלך מיד.
              </div>
            )}

            {aiError && (
              <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600">{aiError}</div>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex flex-col gap-2 sticky bottom-0 bg-white rounded-b-2xl">
            {brandType === "financial" ? (
              <button
                onClick={handleSaveSimple}
                disabled={!name.trim()}
                className="btn btn-orange w-full"
                style={{ opacity: name.trim() ? 1 : 0.5, background: "#10b981" }}
              >
                💰 צור דשבורד פיננסי
              </button>
            ) : (
              <>
                <button
                  onClick={fetchSuggestions}
                  disabled={!name.trim() || !goal.trim()}
                  className="btn btn-orange w-full"
                  style={{ opacity: name.trim() && goal.trim() ? 1 : 0.5 }}
                >
                  ✨ קבל המלצות AI למחלקות
                </button>
                <button
                  onClick={handleSaveSimple}
                  disabled={!name.trim()}
                  className="btn btn-ghost w-full text-sm"
                  style={{ opacity: name.trim() ? 1 : 0.5 }}
                >
                  צור מותג ריק (ללא AI)
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  /* ════ LOADING ════ */
  if (step === "loading") {
    return (
      <div className="modal-bg">
        <div className="modal w-full flex flex-col items-center justify-center py-16 gap-5" style={{ maxWidth: 400 }}>
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-teal-100" />
            <div className="absolute inset-0 rounded-full border-4 border-teal-500 border-t-transparent animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center text-2xl">✨</div>
          </div>
          <div className="text-center">
            <p className="font-black text-gray-900 text-lg">ה-AI חושב...</p>
            <p className="text-sm text-gray-400 mt-1">מנתח את המטרה שלך ומציע מחלקות</p>
          </div>
        </div>
      </div>
    );
  }

  /* ════ STEP 2: SUGGESTIONS ════ */
  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal w-full" style={{ maxWidth: 560 }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <div>
            <h2 className="text-lg font-black text-gray-900">המלצות AI 🤖</h2>
            <p className="text-xs text-gray-400 mt-0.5">סמן אילו מחלקות ליצור — תוכל לשנות הכל אחר כך</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm">✕</button>
        </div>

        {/* Brand preview */}
        <div className="px-6 pt-4 pb-2">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl" style={{ background: color + "12", border: `1.5px solid ${color}30` }}>
            <span className="text-2xl">{emoji}</span>
            <div>
              <div className="font-black text-gray-900 text-sm">{name}</div>
              {goal && <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">מטרה: {goal}</div>}
            </div>
          </div>
        </div>

        {/* Department list */}
        <div className="px-6 pb-2 space-y-2 max-h-[50vh] overflow-y-auto">
          {depts.map((dept, i) => (
            <div
              key={i}
              onClick={() => setDepts(depts.map((d, j) => j === i ? { ...d, enabled: !d.enabled } : d))}
              className={`flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${dept.enabled ? "ring-2 ring-teal-400" : "opacity-50"}`}
              style={{ background: dept.enabled ? "#f0fdf4" : "#f9fafb", border: `1px solid ${dept.enabled ? "#86efac" : "#e5e7eb"}` }}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${dept.enabled ? "bg-teal-500 border-teal-500" : "border-gray-300"}`}>
                {dept.enabled && <span className="text-white text-[10px] font-black">✓</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className="text-lg leading-none">{dept.emoji}</span>
                  <span className="font-bold text-gray-900 text-sm">{dept.name}</span>
                </div>
                <p className="text-xs text-gray-500">{dept.description}</p>
                {dept.stages.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {dept.stages.map((s, si) => (
                      <span key={si} className="text-[10px] px-1.5 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">{s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex flex-col gap-2 sticky bottom-0 bg-white rounded-b-2xl">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>{depts.filter(d => d.enabled).length} מחלקות נבחרו</span>
            <button onClick={() => setStep("form")} className="text-teal-500 hover:text-teal-700 transition-colors">← חזור לעריכה</button>
          </div>
          <button
            onClick={handleSaveWithDepts}
            disabled={!name.trim()}
            className="btn btn-orange w-full"
          >
            🚀 צור מותג עם {depts.filter(d => d.enabled).length} מחלקות
          </button>
          <button onClick={handleSaveSimple} className="btn btn-ghost w-full text-sm">
            צור מותג ריק (ללא מחלקות)
          </button>
        </div>
      </div>
    </div>
  );
}
