"use client";

import { useState, useRef } from "react";
import { SubProject, StageExpense, PaymentCommitment, CommitmentPayment } from "@/lib/types";
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
                className={`icon-btn w-9 h-9 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center text-sm font-bold shrink-0 transition-colors ${delHover}`}
              >×</button>
            </div>
            <div className="flex items-center gap-1 pr-1">
              {([
                { value: 'monthly',  label: 'חודשי',    active: 'bg-teal-500 text-white border-teal-500' },
                { value: 'yearly',   label: 'שנתי',     active: 'bg-blue-500 text-white border-blue-500' },
                { value: 'one-time', label: 'חד פעמי',  active: 'bg-gray-500 text-white border-gray-500' },
              ] as { value: 'monthly'|'yearly'|'one-time'; label: string; active: string }[]).map(opt => {
                const current = item.frequency ?? 'monthly';
                const isActive = current === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => { const arr = [...items]; arr[i] = { ...arr[i], frequency: opt.value }; onChange(arr); }}
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full border transition-all ${isActive ? opt.active : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                  >{opt.label}</button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <button
        onClick={() => onChange([...items, { id: uuidv4(), name: "", amount: 0, frequency: 'monthly' }])}
        className={`mt-2 w-full py-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-semibold transition-all ${addHover}`}
      >+ {addLabel}</button>
    </div>
  );
}

function CommitmentList({
  items,
  onChange,
}: {
  items: PaymentCommitment[];
  onChange: (items: PaymentCommitment[]) => void;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  function calcDueDate(startDate: string | undefined, frequency: PaymentCommitment['frequency'], idx: number): string | undefined {
    if (!startDate || frequency === 'milestone') return undefined;
    const d = new Date(startDate + '-01T00:00:00');
    if (frequency === 'monthly') d.setMonth(d.getMonth() + idx);
    else if (frequency === 'weekly') d.setDate(d.getDate() + idx * 7);
    return d.toISOString().slice(0, 7);
  }

  function regeneratePayments(c: PaymentCommitment, prev: CommitmentPayment[]): CommitmentPayment[] {
    return Array.from({ length: c.totalPayments }, (_, idx) =>
      prev[idx]
        ? { ...prev[idx], dueDate: calcDueDate(c.startDate, c.frequency, idx) }
        : { id: uuidv4(), paid: false, dueDate: calcDueDate(c.startDate, c.frequency, idx) }
    );
  }

  function updateC(i: number, patch: Partial<PaymentCommitment>) {
    const arr = [...items];
    const merged = { ...arr[i], ...patch };
    const regen = 'totalPayments' in patch || 'startDate' in patch || 'frequency' in patch;
    arr[i] = regen ? { ...merged, payments: regeneratePayments(merged, arr[i].payments ?? []) } : merged;
    onChange(arr);
  }

  function updatePayment(ci: number, pi: number, patch: Partial<CommitmentPayment>) {
    const arr = [...items];
    const pays = [...(arr[ci].payments ?? [])];
    pays[pi] = { ...pays[pi], ...patch };
    arr[ci] = { ...arr[ci], payments: pays };
    onChange(arr);
  }

  function handleInvoice(ci: number, pi: number, file: File) {
    const reader = new FileReader();
    reader.onload = () => updatePayment(ci, pi, { invoiceDataUrl: reader.result as string, invoiceName: file.name });
    reader.readAsDataURL(file);
  }

  const totalMonthly = items.reduce((s, c) => {
    const paid = (c.payments ?? []).filter(p => p.paid).length;
    if (paid >= c.totalPayments && c.totalPayments > 0) return s;
    if (c.frequency === 'monthly') return s + c.amountPerPayment;
    if (c.frequency === 'weekly') return s + c.amountPerPayment * 4;
    return s;
  }, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="mb-0">לוח סילוקין 🤝</label>
        {totalMonthly > 0 && (
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
            ₪{totalMonthly.toLocaleString('he-IL')}/חודש
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-2">תשלומים לקבלנים וספקים — סמן כל תשלום וצרף חשבונית</p>
      <div className="space-y-3">
        {items.map((item, ci) => {
          const payments = item.payments ?? [];
          const paidCount = payments.filter(p => p.paid).length;
          const totalCost = item.amountPerPayment * item.totalPayments;
          const paidCost = item.amountPerPayment * paidCount;
          const progress = item.totalPayments > 0 ? (paidCount / item.totalPayments) * 100 : 0;
          const isDone = paidCount >= item.totalPayments && item.totalPayments > 0;
          const isExpanded = expanded.has(item.id);

          return (
            <div key={item.id} className={`rounded-xl border overflow-hidden transition-all ${isDone ? 'border-green-200' : 'border-gray-200'}`}>
              <div className={`p-3 ${isDone ? 'bg-green-50' : 'bg-white'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    className="input text-sm flex-1 font-semibold"
                    value={item.name}
                    placeholder="שם הספק / הקבלן"
                    onChange={e => updateC(ci, { name: e.target.value })}
                  />
                  <button
                    onClick={() => onChange(items.filter((_, j) => j !== ci))}
                    className="icon-btn w-9 h-9 shrink-0 rounded-lg bg-gray-100 text-gray-400 flex items-center justify-center text-sm hover:bg-red-100 hover:text-red-500 transition-colors"
                  >×</button>
                </div>

                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-xs">₪</span>
                    <input
                      type="number"
                      className="input text-sm w-20 text-center"
                      value={item.amountPerPayment || ''}
                      placeholder="0"
                      onChange={e => updateC(ci, { amountPerPayment: Number(e.target.value) })}
                    />
                    <span className="text-gray-400 text-xs">לתשלום ×</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      className="input text-sm w-14 text-center"
                      value={item.totalPayments || ''}
                      placeholder="0"
                      onChange={e => updateC(ci, { totalPayments: Number(e.target.value) })}
                    />
                    <span className="text-gray-400 text-xs">תשלומים</span>
                  </div>
                  {totalCost > 0 && (
                    <span className="text-xs text-gray-400 font-medium">= ₪{totalCost.toLocaleString('he-IL')}</span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5 mb-2">
                  {([
                    { value: 'monthly',   label: 'חודשי',   active: 'bg-purple-500 text-white border-purple-500' },
                    { value: 'weekly',    label: 'שבועי',   active: 'bg-indigo-500 text-white border-indigo-500' },
                    { value: 'milestone', label: 'אבן דרך', active: 'bg-gray-500 text-white border-gray-500' },
                  ] as { value: PaymentCommitment['frequency']; label: string; active: string }[]).map(opt => (
                    <button key={opt.value} type="button"
                      onClick={() => updateC(ci, { frequency: opt.value })}
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border transition-all ${item.frequency === opt.value ? opt.active : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'}`}
                    >{opt.label}</button>
                  ))}
                  {item.frequency !== 'milestone' && (
                    <div className="flex items-center gap-1 mr-1">
                      <span className="text-xs text-gray-400">מ-</span>
                      <input
                        type="month"
                        className="input text-xs py-0.5 w-32"
                        value={item.startDate ?? ''}
                        onChange={e => updateC(ci, { startDate: e.target.value })}
                      />
                    </div>
                  )}
                </div>

                {item.totalPayments > 0 && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className={isDone ? 'text-green-600 font-semibold' : 'text-gray-500'}>
                        {isDone ? '✓ הושלם' : `${paidCount}/${item.totalPayments} שולמו`}
                      </span>
                      <span className="text-gray-400">
                        ₪{paidCost.toLocaleString('he-IL')} / ₪{totalCost.toLocaleString('he-IL')}
                      </span>
                    </div>
                    <div className="relative h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`absolute inset-y-0 right-0 rounded-full transition-all duration-300 ${isDone ? 'bg-green-400' : 'bg-purple-400'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    {payments.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpanded(prev => { const s = new Set(prev); s.has(item.id) ? s.delete(item.id) : s.add(item.id); return s; })}
                        className="text-xs text-purple-500 hover:text-purple-700 font-semibold mt-0.5 transition-colors"
                      >
                        {isExpanded ? '▲ הסתר לוח' : '▼ הצג לוח סילוקין'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {isExpanded && payments.length > 0 && (
                <div className="border-t border-gray-100 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-100 text-gray-400 font-medium">
                        <th className="px-2 py-1.5 text-right w-7">#</th>
                        <th className="px-2 py-1.5 text-right">תאריך</th>
                        <th className="px-2 py-1.5 text-right">סכום</th>
                        <th className="px-2 py-1.5 text-center w-10">שולם</th>
                        <th className="px-2 py-1.5 text-right">חשבונית</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((pay, pi) => (
                        <tr key={pay.id} className={`border-b border-gray-50 last:border-0 transition-colors ${pay.paid ? 'bg-green-50/60' : 'hover:bg-gray-50'}`}>
                          <td className="px-2 py-2 text-gray-400">{pi + 1}</td>
                          <td className="px-2 py-2">
                            {item.frequency === 'milestone' ? (
                              <input
                                type="month"
                                className="input text-xs py-0.5 w-28"
                                value={pay.dueDate ?? ''}
                                onChange={e => updatePayment(ci, pi, { dueDate: e.target.value })}
                              />
                            ) : (
                              <span className="text-gray-500">
                                {pay.dueDate
                                  ? new Date(pay.dueDate + '-01').toLocaleDateString('he-IL', { month: 'short', year: '2-digit' })
                                  : '—'}
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 font-semibold text-gray-700">
                            ₪{item.amountPerPayment.toLocaleString('he-IL')}
                          </td>
                          <td className="px-2 py-2">
                            <button
                              type="button"
                              onClick={() => updatePayment(ci, pi, { paid: !pay.paid })}
                              className={`w-5 h-5 rounded border-2 flex items-center justify-center mx-auto transition-all ${pay.paid ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 hover:border-green-400 hover:bg-green-50'}`}
                            >
                              {pay.paid && <span className="text-[10px] leading-none font-bold">✓</span>}
                            </button>
                          </td>
                          <td className="px-2 py-2">
                            <input
                              ref={el => { fileRefs.current[`${item.id}-${pi}`] = el; }}
                              type="file"
                              accept="image/*,application/pdf"
                              className="hidden"
                              onChange={e => {
                                const file = e.target.files?.[0];
                                if (file) handleInvoice(ci, pi, file);
                                e.target.value = '';
                              }}
                            />
                            {pay.invoiceDataUrl ? (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => window.open(pay.invoiceDataUrl)}
                                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  <span>📄</span>
                                  <span className="truncate max-w-[80px] text-[11px]">{pay.invoiceName ?? 'חשבונית'}</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => updatePayment(ci, pi, { invoiceDataUrl: undefined, invoiceName: undefined })}
                                  className="text-gray-300 hover:text-red-400 transition-colors"
                                >×</button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => fileRefs.current[`${item.id}-${pi}`]?.click()}
                                className="flex items-center gap-1 text-gray-300 hover:text-purple-500 transition-colors"
                              >
                                <span>📎</span>
                                <span className="text-[11px]">צרף</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <button
        onClick={() => onChange([...items, { id: uuidv4(), name: '', amountPerPayment: 0, totalPayments: 0, frequency: 'monthly', payments: [] }])}
        className="mt-2 w-full py-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-semibold transition-all hover:border-purple-400 hover:text-purple-600"
      >+ הוסף התחייבות תשלום</button>
    </div>
  );
}

export default function SubProjectModal({ existing, order, onClose, onSave }: Props) {
  const [name,        setName]        = useState(existing?.name ?? "");
  const [emoji,       setEmoji]       = useState(existing?.emoji ?? "📁");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [expenses,    setExpenses]    = useState<StageExpense[]>(existing?.expenses ?? []);
  const [incomes,     setIncomes]     = useState<StageExpense[]>(existing?.incomes  ?? []);
  const [commitments, setCommitments] = useState<PaymentCommitment[]>(existing?.commitments ?? []);

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
      commitments: commitments.filter(c => c.name.trim()),
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
          <button onClick={onClose} className="icon-btn w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-base">✕</button>
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

          <CommitmentList items={commitments} onChange={setCommitments} />
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
