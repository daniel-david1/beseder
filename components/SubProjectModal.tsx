"use client";

import { useState } from "react";
import { SubProject, StageExpense } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

const EMOJIS = ["📁","🚀","📱","💡","📢","💰","🎯","🛠️","🎨","📊","🔥","💪","🌱","🏆","⚡","🔬","🤝","🗄️","📋","🎬"];

interface Props {
  existing?: SubProject;
  order: number;
  onClose: () => void;
  onSave: (sub: SubProject) => void;
}

function ItemList({
  items,
  onChange,
  label,
  sublabel,
  addLabel,
  type,
}: {
  items: StageExpense[];
  onChange: (items: StageExpense[]) => void;
  label: string;
  sublabel: string;
  addLabel: string;
  type: "income" | "expense";
}) {
  const total = items.reduce((s, e) => s + e.amount, 0);
  const isIncome = type === "income";
  const badgeCls = isIncome
    ? "bg-green-50 text-green-700 border border-green-200"
    : "bg-red-50 text-red-700 border border-red-200";
  const rowHover = isIncome
    ? "hover:bg-green-50 hover:border-green-200"
    : "hover:bg-red-50 hover:border-red-200";
  const addHover = isIncome
    ? "hover:border-green-400 hover:text-green-600"
    : "hover:border-red-400 hover:text-red-500";
  const delHover = isIncome
    ? "hover:bg-green-100 hover:text-green-600"
    : "hover:bg-red-100 hover:text-red-500";

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="mb-0">{label}</label>
        {total > 0 && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeCls}`}>
            ₪{total.toLocaleString("he-IL")}/חודש
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-2">{sublabel}</p>
      <div className="space-y-1.5">
        {items.map((item, i) => (
          <div
            key={item.id}
            className={`flex flex-col gap-1 p-2 rounded-lg border border-transparent transition-colors ${rowHover}`}
          >
            <div className="flex items-center gap-2">
              <input
                className="input text-sm flex-1"
                value={item.name}
                placeholder="שם"
                onChange={e => { const arr = [...items]; arr[i] = { ...arr[i], name: e.target.value }; onChange(arr); }}
              />
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-gray-400 text-sm">₪</span>
                <input
                  type="number"
                  className="input text-sm w-24 text-center"
                  value={item.amount || ""}
                  placeholder="0"
                  onChange={e => { const arr = [...items]; arr[i] = { ...arr[i], amount: Number(e.target.value) }; onChange(arr); }}
                />
              </div>
              <button
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                className={`w-7 h-7 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${delHover}`}
              >×</button>
            </div>
            <div className="flex items-center gap-1.5 pr-1 w-fit">
              <span className="text-xs text-gray-400">📅 תאריך:</span>
              <input
                type="date"
                className="text-xs border border-gray-200 rounded-lg px-2 py-0.5 w-36 shrink-0 focus:outline-none focus:ring-1 focus:ring-teal-400 bg-white"
                value={item.date ?? ""}
                onChange={e => { const arr = [...items]; arr[i] = { ...arr[i], date: e.target.value || undefined }; onChange(arr); }}
              />
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => onChange([...items, { id: uuidv4(), name: "", amount: 0 }])}
        className={`mt-2 w-full py-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-semibold transition-all ${addHover}`}
      >+ {addLabel}</button>
    </div>
  );
}

export default function SubProjectModal({ existing, order, onClose, onSave }: Props) {
  const [name,        setName]        = useState(existing?.name ?? "");
  const [emoji,       setEmoji]       = useState(existing?.emoji ?? "📁");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [expenses,    setExpenses]    = useState<StageExpense[]>(existing?.expenses ?? []);
  const [incomes,     setIncomes]     = useState<StageExpense[]>(existing?.incomes  ?? []);

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id:          existing?.id ?? uuidv4(),
      name:        name.trim(),
      emoji,
      description: description.trim(),
      stages:      existing?.stages ?? [],
      channels:    existing?.channels ?? [],
      order:       existing?.order ?? order,
      expenses:    expenses.filter(e => e.name.trim() || e.amount > 0),
      incomes:     incomes.filter(e => e.name.trim() || e.amount > 0),
    });
    onClose();
  };

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal w-full" style={{ maxWidth: 540 }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-black text-gray-900">
            {existing ? "ערוך מחלקה" : "מחלקה חדשה"}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-sm">✕</button>
        </div>

        <div className="px-6 py-5 space-y-4">
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
            <label>שם המחלקה *</label>
            <input className="input text-base font-semibold" value={name}
              onChange={e => setName(e.target.value)}
              placeholder="לדוגמה: שיווק, פיתוח, תפעול..."
              autoFocus
            />
          </div>

          <div>
            <label>תיאור קצר</label>
            <input className="input" value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="מה המחלקה הזו אחראית עליה?"
            />
          </div>

          <ItemList
            items={incomes}
            onChange={setIncomes}
            label="הכנסות חודשיות של המחלקה 💚"
            sublabel="הכנסות שנוגעות לכל המחלקה — לא לשלב ספציפי"
            addLabel="הוסף הכנסה"
            type="income"
          />

          <ItemList
            items={expenses}
            onChange={setExpenses}
            label="הוצאות חודשיות של המחלקה 🔴"
            sublabel="הוצאות שנוגעות לכל המחלקה — לא לשלב ספציפי"
            addLabel="הוסף הוצאה"
            type="expense"
          />
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 sticky bottom-0 bg-white rounded-b-2xl">
          <button onClick={handleSave} disabled={!name.trim()} className="btn btn-orange flex-1"
            style={{ opacity: name.trim() ? 1 : 0.5 }}>
            {existing ? "שמור שינויים" : "צור מחלקה"}
          </button>
          <button onClick={onClose} className="btn btn-ghost">ביטול</button>
        </div>
      </div>
    </div>
  );
}
