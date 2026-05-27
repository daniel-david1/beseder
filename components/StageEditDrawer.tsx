"use client";

import { useState, useEffect } from "react";
import { Stage, StageStatus, StageExpense } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

interface Props {
  stage: Stage | null;
  stageNumber: number;
  totalStages: number;
  onClose: () => void;
  onSave: (stage: Stage) => void;
  onDelete: (id: string) => void;
  onAddAfter: () => void;
}

const STATUS_OPTIONS: { value: StageStatus; label: string; emoji: string; cls: string }[] = [
  { value: "todo",    label: "לא התחיל", emoji: "⬜", cls: "status-todo" },
  { value: "active",  label: "בתהליך",   emoji: "🔵", cls: "status-active" },
  { value: "done",    label: "הושלם",    emoji: "✅", cls: "status-done" },
  { value: "blocked", label: "תקוע",     emoji: "🔴", cls: "status-blocked" },
];

export default function StageEditDrawer({ stage, stageNumber, totalStages, onClose, onSave, onDelete, onAddAfter }: Props) {
  const [form, setForm] = useState<Stage | null>(stage);

  useEffect(() => { setForm(stage); }, [stage]);

  if (!stage || !form) return null;

  const set = (k: keyof Stage, v: unknown) => setForm(p => p ? { ...p, [k]: v } : p);

  const handleSave = () => { if (form) { onSave(form); onClose(); } };

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-black text-sm">
              {stageNumber}
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium">עורך שלב</p>
              <p className="font-bold text-gray-900 text-sm">{form.name || `שלב ${stageNumber}`}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm transition-colors">✕</button>
        </div>

        {/* Body */}
        <div className="flex-1 px-6 py-5 space-y-5">

          {/* Stage name */}
          <div>
            <label>שם השלב</label>
            <input
              className="input text-base font-semibold"
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="לדוגמה: גיוס משתמשים"
            />
          </div>

          {/* Status */}
          <div>
            <label>סטטוס</label>
            <div className="grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => set("status", opt.value)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-semibold text-right border-2 transition-all ${
                    form.status === opt.value
                      ? "border-current shadow-sm"
                      : "border-transparent bg-gray-50 text-gray-500"
                  } ${form.status === opt.value ? opt.cls : ""}`}
                >
                  {opt.emoji} {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step */}
          <div>
            <label>מה הצעד הזה? <span className="text-gray-400 font-normal normal-case text-xs">— הסבר קצר</span></label>
            <textarea
              className="textarea"
              value={form.step}
              onChange={e => set("step", e.target.value)}
              placeholder="מה בדיוק עושים בשלב הזה?"
            />
          </div>

          {/* Goal */}
          <div>
            <label>מה המטרה? <span className="text-gray-400 font-normal normal-case text-xs">— מה ההצלחה נראית כך</span></label>
            <textarea
              className="textarea"
              value={form.goal}
              onChange={e => set("goal", e.target.value)}
              placeholder="לדוגמה: להגיע ל-1,000 הורדות"
            />
          </div>

          {/* Next action */}
          <div>
            <label>הצעד הבא הספציפי</label>
            <input
              className="input"
              value={form.nextAction}
              onChange={e => set("nextAction", e.target.value)}
              placeholder="מה הדבר הכי קטן שאפשר לעשות עכשיו?"
            />
          </div>

          {/* Notes */}
          <div>
            <label>הערות</label>
            <textarea
              className="textarea"
              style={{ minHeight: 70 }}
              value={form.notes}
              onChange={e => set("notes", e.target.value)}
              placeholder="כל מה שצריך לזכור..."
            />
          </div>

          {/* Expenses */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="mb-0">הוצאות חודשיות 🔴</label>
              {(form.expenses ?? []).length > 0 && (
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
                  ₪{(form.expenses ?? []).reduce((s, e) => s + e.amount, 0).toLocaleString("he-IL")}/חודש
                </span>
              )}
            </div>
            <div className="space-y-1.5">
              {(form.expenses ?? []).map((exp, i) => (
                <div key={exp.id} className="flex flex-col gap-1 p-2 rounded-lg border border-transparent hover:bg-red-50 hover:border-red-200 transition-colors">
                  <div className="flex items-center gap-2">
                    <input
                      className="input text-sm flex-1"
                      value={exp.name}
                      placeholder="שם ההוצאה"
                      onChange={e => {
                        const exps = [...(form.expenses ?? [])];
                        exps[i] = { ...exps[i], name: e.target.value };
                        set("expenses", exps);
                      }}
                    />
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-gray-400 text-sm">₪</span>
                      <input
                        type="number"
                        className="input text-sm w-24 text-center"
                        value={exp.amount || ""}
                        placeholder="0"
                        onChange={e => {
                          const exps = [...(form.expenses ?? [])];
                          exps[i] = { ...exps[i], amount: Number(e.target.value) };
                          set("expenses", exps);
                        }}
                      />
                    </div>
                    <button
                      onClick={() => set("expenses", (form.expenses ?? []).filter((_, j) => j !== i))}
                      className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 flex items-center justify-center text-sm font-bold shrink-0 transition-colors"
                    >×</button>
                  </div>
                  <div className="flex items-center gap-1 pr-1">
                    {([
                      { value: 'monthly',  label: 'חודשי',   active: 'bg-teal-500 text-white border-teal-500' },
                      { value: 'yearly',   label: 'שנתי',    active: 'bg-blue-500 text-white border-blue-500' },
                      { value: 'one-time', label: 'חד פעמי', active: 'bg-gray-500 text-white border-gray-500' },
                    ] as { value: 'monthly'|'yearly'|'one-time'; label: string; active: string }[]).map(opt => {
                      const current = exp.frequency ?? 'monthly';
                      const isActive = current === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            const exps = [...(form.expenses ?? [])];
                            exps[i] = { ...exps[i], frequency: opt.value };
                            set("expenses", exps);
                          }}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border transition-all ${isActive ? opt.active : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                        >{opt.label}</button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={() => set("expenses", [...(form.expenses ?? []), { id: uuidv4(), name: "", amount: 0, frequency: 'monthly' } as StageExpense])}
              className="mt-2 w-full py-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-semibold hover:border-red-400 hover:text-red-500 transition-all"
            >
              + הוסף הוצאה
            </button>
          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 space-y-2 sticky bottom-0 bg-white">
          <div className="flex gap-2">
            <button onClick={handleSave} className="btn btn-orange flex-1">שמור שינויים</button>
            <button onClick={onClose} className="btn btn-ghost">ביטול</button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { onAddAfter(); onClose(); }}
              className="btn btn-ghost flex-1 text-sm text-blue-600 border-blue-100 hover:bg-blue-50"
            >
              + הוסף שלב אחרי זה
            </button>
            <button
              onClick={() => { if (confirm("למחוק שלב זה?")) { onDelete(stage.id); onClose(); } }}
              className="btn btn-red text-sm"
            >
              מחק
            </button>
          </div>
        </div>

      </div>
    </>
  );
}
