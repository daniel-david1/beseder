"use client";

import { useState, useEffect } from "react";
import {
  FinancialData,
  Loan,
  FixedExpense,
  Income,
  Property,
  PropertyIncome,
  PropertyLiability,
} from "@/lib/types";
import { loadFinancialData, saveFinancialData, loadFinancialFromCloud } from "@/lib/storage";
import CreditReportScanner from "./CreditReportScanner";

/* ─── helpers ─────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 10);
const ils = (n: number) => "₪" + Math.round(n).toLocaleString("he-IL");

interface Props {
  brandId: string;
  brandName?: string;
  onBack: () => void;
}

const inp =
  "border border-gray-200 rounded-lg px-2 py-1 text-sm w-full text-right bg-white focus:outline-none focus:border-teal-500 font-['Heebo',system-ui,sans-serif]";

function SubHeader({ label, color }: { label: string; color: string }) {
  return (
    <div className="text-xs font-bold px-2 py-1 rounded-lg mb-2 inline-block" style={{ background: color + "18", color }}>
      {label}
    </div>
  );
}

function AddRowBtn({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full mt-2 py-2 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 text-sm font-semibold hover:border-teal-300 hover:text-teal-500 transition-all"
    >
      + {label}
    </button>
  );
}

/* ─── Loan math ──────────────────────────────────────── */
function calcPMT(principal: number, annualRate: number, totalMonths: number): number {
  if (totalMonths === 0 || principal === 0) return 0;
  if (annualRate === 0) return principal / totalMonths;
  const r = annualRate / 100 / 12;
  return (principal * r * Math.pow(1 + r, totalMonths)) / (Math.pow(1 + r, totalMonths) - 1);
}

function loanRemainingBalance(principal: number, annualRate: number, monthlyPayment: number, paidMonths: number): number {
  if (paidMonths <= 0) return principal;
  if (monthlyPayment <= 0) return principal;
  if (annualRate === 0) return Math.max(0, principal - monthlyPayment * paidMonths);
  const r = annualRate / 100 / 12;
  const factor = Math.pow(1 + r, paidMonths);
  return Math.max(0, principal * factor - monthlyPayment * (factor - 1) / r);
}

function loanRemaining(l: Loan) {
  return loanRemainingBalance(l.principal, l.annualRate ?? 0, l.monthlyPayment, l.paidMonths);
}

function hebrewMonthYear(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("he-IL", { month: "long", year: "numeric" });
}

/* ══ Main Component ══════════════════════════════════════ */
export default function FinancialDashboard({ brandId, brandName, onBack }: Props) {
  const [data, setData] = useState<FinancialData>(() => loadFinancialData(brandId));
  const [openSection, setOpenSection] = useState<"loans" | "expenses" | "incomes" | "properties" | null>("loans");
  const [editingDate, setEditingDate] = useState(false);

  const [editingLoan,        setEditingLoan]        = useState<string | null>(null);
  const [editingExpense,     setEditingExpense]      = useState<string | null>(null);
  const [editingIncomeLine,  setEditingIncomeLine]   = useState<string | null>(null);
  const [editingProperty,    setEditingProperty]     = useState<string | null>(null);
  const [editingIncome,      setEditingIncome]       = useState<string | null>(null);
  const [editingPropExpense, setEditingPropExpense]  = useState<string | null>(null);
  const [editingLiability,   setEditingLiability]   = useState<string | null>(null);
  const [showScanner,        setShowScanner]         = useState(false);

  const save = (updated: FinancialData) => { setData(updated); saveFinancialData(updated, brandId); };

  const handleScannerImport = (importedLoans: import("@/lib/types").Loan[]) => {
    const updated = { ...data, loans: [...data.loans, ...importedLoans] };
    save(updated);
    setOpenSection("loans");
  };

  useEffect(() => {
    loadFinancialFromCloud(brandId).then(cloud => {
      if (cloud) {
        setData(cloud);
        if (typeof window !== "undefined") {
          localStorage.setItem(`beseder_financial_${brandId}`, JSON.stringify(cloud));
        }
      }
    });
  }, [brandId]);

  const advanceMonth = () => {
    const prev = data.asOfDate ? new Date(data.asOfDate) : new Date();
    prev.setMonth(prev.getMonth() + 1);
    const newDate = prev.toISOString().slice(0, 10);
    const loans = data.loans.map(l => ({ ...l, paidMonths: Math.min(l.paidMonths + 1, l.totalMonths) }));
    save({ ...data, loans, asOfDate: newDate });
  };

  const advanceLoanOne = (id: string) => {
    save({
      ...data,
      loans: data.loans.map(l =>
        l.id === id ? { ...l, paidMonths: Math.min(l.paidMonths + 1, l.totalMonths) } : l
      ),
    });
  };

  /* KPIs */
  const totalRemaining       = data.loans.reduce((s, l) => s + loanRemaining(l), 0);
  const totalMonthly         = data.loans.reduce((s, l) => s + (l.paidMonths < l.totalMonths ? l.monthlyPayment : 0), 0);
  const totalPropertyValue   = data.properties.reduce((s, p) => s + p.purchasePrice, 0);
  const totalMonthlyIncome   = (data.incomes ?? []).filter(i => i.frequency === "monthly").reduce((s, i) => s + i.amount, 0);
  const totalOnetimeIncome   = (data.incomes ?? []).filter(i => i.frequency === "one-time").reduce((s, i) => s + i.amount, 0);
  const totalExpensesMonthly = data.expenses.filter(e => e.frequency === "monthly").reduce((s, e) => s + e.amount, 0);

  const toggle = (s: "loans" | "expenses" | "incomes" | "properties") =>
    setOpenSection(prev => prev === s ? null : s);

  /* ════ LOANS ════ */
  const LoanRow = ({ loan }: { loan: Loan }) => {
    const initForm = () => ({
      ...loan,
      annualRate: loan.annualRate ?? 0,
      manualPayment: loan.manualPayment ?? false,
      paymentDayOfMonth: loan.paymentDayOfMonth,
    });
    const [form, setForm] = useState(initForm);
    const isEditing = editingLoan === loan.id;

    const pct = loan.totalMonths > 0 ? Math.round((loan.paidMonths / loan.totalMonths) * 100) : 0;
    const remaining = loanRemaining(loan);
    const isDone = loan.paidMonths >= loan.totalMonths;

    /* ── helpers inside edit mode ── */
    const autoPMT = calcPMT(form.principal, form.annualRate, form.totalMonths);
    const effectivePMT = form.manualPayment ? form.monthlyPayment : autoPMT;

    const handleField = (field: keyof typeof form, value: number | string | boolean) => {
      setForm(prev => {
        const next = { ...prev, [field]: value } as typeof prev;
        // Auto-sync monthly payment when loan params change
        if (!next.manualPayment && (field === "principal" || field === "annualRate" || field === "totalMonths")) {
          next.monthlyPayment = calcPMT(next.principal, next.annualRate, next.totalMonths);
        }
        return next;
      });
    };

    const handleSave = () => {
      const saved: Loan = {
        ...form,
        monthlyPayment: form.manualPayment ? form.monthlyPayment : autoPMT,
      };
      save({ ...data, loans: data.loans.map(l => l.id === loan.id ? saved : l) });
      setEditingLoan(null);
    };

    const handleDelete = () => {
      if (!confirm("למחוק הלוואה זו?")) return;
      save({ ...data, loans: data.loans.filter(l => l.id !== loan.id) });
      setEditingLoan(null);
    };

    /* ── EDIT FORM ── */
    if (isEditing) {
      const previewRemaining = loanRemainingBalance(form.principal, form.annualRate, effectivePMT, form.paidMonths);
      const totalPaid = effectivePMT * form.totalMonths;
      const totalInterest = Math.max(0, totalPaid - form.principal);

      return (
        <div className="py-4 px-1 border-b border-gray-100">
          {/* Name */}
          <div className="mb-3">
            <label className="text-xs text-gray-400 mb-0.5 block">שם ההלוואה</label>
            <input className={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} dir="rtl" placeholder="לדוגמה: רכב, כאל, משכנתא..." />
          </div>

          {/* Loan parameters */}
          <div className="rounded-xl bg-blue-50/50 border border-blue-100 p-3 mb-3">
            <div className="text-[11px] font-bold text-blue-600 mb-2.5 flex items-center gap-1.5">💡 פרטי ההלוואה</div>
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div>
                <label className="text-xs text-gray-400 mb-0.5 block">קרן מקורית (₪)</label>
                <input className={inp} type="number" value={form.principal || ""} onChange={e => handleField("principal", Number(e.target.value))} dir="rtl" placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-0.5 block">ריבית שנתית (%)</label>
                <input className={inp} type="number" step="0.01" value={form.annualRate || ""} onChange={e => handleField("annualRate", Number(e.target.value))} dir="rtl" placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-0.5 block">תקופה (חודשים)</label>
                <input className={inp} type="number" value={form.totalMonths || ""} onChange={e => handleField("totalMonths", Number(e.target.value))} dir="rtl" placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                  החזר חודשי (₪)
                  {!form.manualPayment && autoPMT > 0 && (
                    <span className="bg-teal-100 text-teal-700 px-1.5 rounded-full text-[10px] font-bold">אוטו</span>
                  )}
                </label>
                {form.manualPayment ? (
                  <div className="flex gap-1">
                    <input className={inp + " flex-1"} type="number" value={form.monthlyPayment || ""} onChange={e => setForm({ ...form, monthlyPayment: Number(e.target.value) })} dir="rtl" />
                    <button
                      onClick={() => setForm({ ...form, manualPayment: false, monthlyPayment: autoPMT })}
                      className="px-2 rounded-lg bg-teal-50 text-teal-600 text-xs font-bold hover:bg-teal-100 transition-colors whitespace-nowrap border border-teal-200"
                    >⟳</button>
                  </div>
                ) : (
                  <div className="flex gap-1 items-center">
                    <div className="flex-1 border border-teal-300 rounded-lg px-2 py-1 text-sm font-semibold text-right bg-teal-50 text-teal-800">
                      {autoPMT > 0 ? Math.round(autoPMT).toLocaleString("he-IL") : (form.monthlyPayment || 0).toLocaleString("he-IL")}
                    </div>
                    <button
                      onClick={() => setForm({ ...form, manualPayment: true })}
                      className="px-2 py-1 rounded-lg bg-gray-100 text-gray-500 text-xs font-bold hover:bg-gray-200 transition-colors border border-gray-200"
                    >ידני</button>
                  </div>
                )}
              </div>
            </div>

            {/* Summary row */}
            {form.principal > 0 && effectivePMT > 0 && form.totalMonths > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-1 pt-2 border-t border-blue-100">
                <div className="text-center">
                  <div className="text-[10px] text-gray-400">סה״כ לשלם</div>
                  <div className="text-xs font-bold text-gray-700">{ils(totalPaid)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-400">ריבית כוללת</div>
                  <div className="text-xs font-bold text-red-500">{ils(totalInterest)}</div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-400">יתרה כעת</div>
                  <div className="text-xs font-bold" style={{ color: "#dc2626" }}>{ils(previewRemaining)}</div>
                </div>
              </div>
            )}
          </div>

          {/* Tracking */}
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 mb-3">
            <div className="text-[11px] font-bold text-gray-500 mb-2.5 flex items-center gap-1.5">📊 מעקב תשלומים</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 mb-0.5 block">חודשים ששולמו</label>
                <input className={inp} type="number" value={form.paidMonths || 0} onChange={e => setForm({ ...form, paidMonths: Math.min(Number(e.target.value), form.totalMonths) })} dir="rtl" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-0.5 block">יתרה לתשלום</label>
                <div className="border border-gray-200 rounded-lg px-2 py-1 text-sm font-black text-right bg-white" style={{ color: form.paidMonths >= form.totalMonths ? "#16a34a" : "#dc2626" }}>
                  {ils(previewRemaining)}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="mb-3">
            <label className="text-xs text-gray-400 mb-0.5 block">הערות</label>
            <textarea className={inp + " resize-none"} rows={2} value={form.notes ?? ""} onChange={e => setForm({ ...form, notes: e.target.value })} dir="rtl" placeholder="הערות נוספות..." />
          </div>

          {/* Payment Day of Month */}
          <div className="mb-3">
            <label className="text-xs text-gray-400 mb-0.5 block">יום קבוע לתשלום (אופציונלי)</label>
            <input className={inp} type="number" min="1" max="31" value={form.paymentDayOfMonth ?? ""} onChange={e => setForm({ ...form, paymentDayOfMonth: e.target.value ? Number(e.target.value) : undefined })} dir="rtl" placeholder="לדוגמה: 15 (ל־15 בחודש)" />
          </div>

          <div className="flex gap-2">
            <button className="btn btn-orange text-xs px-3 py-1.5" onClick={handleSave}>שמור</button>
            <button className="btn btn-ghost text-xs px-3 py-1.5" onClick={() => setEditingLoan(null)}>ביטול</button>
            <button className="btn btn-red text-xs px-3 py-1.5 mr-auto" onClick={handleDelete}>מחק</button>
          </div>
        </div>
      );
    }

    /* ── DISPLAY ROW ── */
    const monthsLeft = Math.max(0, loan.totalMonths - loan.paidMonths);
    const barColor = isDone ? "#16a34a" : pct >= 66 ? "#16a34a" : pct >= 33 ? "#f97316" : "#dc2626";
    const amountColor = isDone ? "#16a34a" : "#dc2626";

    return (
      <div className={`py-4 px-1 border-b border-gray-100 group hover:bg-gray-50/40 transition-colors rounded-lg ${isDone ? "opacity-55" : ""}`}>
        {/* Row 1: Name + amount */}
        <div className="flex items-start justify-between mb-2.5">
          <div className="text-right">
            <div className="flex items-center gap-2 justify-end">
              {isDone && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-bold">✓ שולם</span>}
              <span className="font-bold text-gray-900 text-base">{loan.name}</span>
            </div>
            <div className="text-xs text-gray-400 mt-0.5">{ils(loan.monthlyPayment)}/חודש</div>
          </div>
          <div className="text-left flex-shrink-0">
            <div className="font-black text-xl leading-tight" style={{ color: amountColor }}>{ils(remaining)}</div>
            <div className="text-[11px] text-gray-400 mt-0.5">
              {isDone ? "הסתיים" : `${monthsLeft} חודשים נותרים`}
            </div>
          </div>
        </div>

        {/* Row 2: Progress bar */}
        <div className="mb-1.5">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: barColor }} />
          </div>
        </div>

        {/* Row 3: Stats + actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
            {!isDone && (
              <button onClick={() => advanceLoanOne(loan.id)} className="px-2.5 h-6 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-700 flex items-center justify-center text-[11px] font-bold transition-colors">
                + תשלום
              </button>
            )}
            <button onClick={() => setEditingLoan(loan.id)} className="icon-btn w-8 h-8 rounded-md bg-gray-100 hover:bg-teal-50 text-gray-400 hover:text-teal-600 flex items-center justify-center text-xs transition-colors">✏️</button>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="font-medium" style={{ color: barColor }}>{pct}%</span>
            <span>·</span>
            <span>{loan.paidMonths}/{loan.totalMonths} חודשים</span>
            {(loan.annualRate ?? 0) > 0 && (
              <><span>·</span><span className="text-blue-500 font-medium">{loan.annualRate}%</span></>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ════ EXPENSES ════ */
  const ExpenseRow = ({ expense }: { expense: FixedExpense }) => {
    const [form, setForm] = useState({ ...expense });
    const isEditing = editingExpense === expense.id;

    if (isEditing) {
      return (
        <div className="py-3 px-1 border-b border-gray-50">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div>
              <label className="text-xs text-gray-400 mb-0.5 block">שם הוצאה</label>
              <input className={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} dir="rtl" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-0.5 block">סכום (₪)</label>
              <input className={inp} type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} dir="rtl" />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-0.5 block">תדירות</label>
              <select className={inp} value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as "monthly" | "yearly" })}>
                <option value="monthly">חודשי</option>
                <option value="yearly">שנתי</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-orange text-xs px-3 py-1.5" onClick={() => { save({ ...data, expenses: data.expenses.map(e => e.id === expense.id ? { ...form } : e) }); setEditingExpense(null); }}>שמור</button>
            <button className="btn btn-ghost text-xs px-3 py-1.5" onClick={() => setEditingExpense(null)}>ביטול</button>
            <button className="btn btn-red text-xs px-3 py-1.5 mr-auto" onClick={() => { if (!confirm("למחוק הוצאה זו?")) return; save({ ...data, expenses: data.expenses.filter(e => e.id !== expense.id) }); setEditingExpense(null); }}>מחק</button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 py-3 px-1 border-b border-gray-50 group hover:bg-gray-50/50 rounded-lg transition-colors">
        <div className="flex-1 text-right font-semibold text-gray-800 text-sm">{expense.name}</div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className="text-sm font-bold text-teal-600">{ils(expense.amount)}/{expense.frequency === "monthly" ? "חודש" : "שנה"}</span>
          <button className="icon-btn w-8 h-8 rounded-md bg-gray-100 hover:bg-teal-50 text-gray-400 hover:text-teal-600 flex items-center justify-center text-xs opacity-100 transition-opacity" onClick={() => setEditingExpense(expense.id)}>✏️</button>
        </div>
      </div>
    );
  };

  /* ════ INCOMES ════ */
  const IncomeLineRow = ({ income }: { income: Income }) => {
    const [form, setForm] = useState({ ...income });
    const isEditing = editingIncomeLine === income.id;

    if (isEditing) {
      return (
        <div className="py-3 px-1 border-b border-gray-50">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-0.5 block">שם / לקוח</label>
              <input className={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} dir="rtl" placeholder="לדוגמה: לקוח א, שכירות..." />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-0.5 block">סכום (₪)</label>
              <input className={inp} type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} dir="rtl" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-0.5 block">סוג</label>
              <select className={inp} value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as "monthly" | "one-time" })}>
                <option value="monthly">חודשי</option>
                <option value="one-time">חד פעמי</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-orange text-xs px-3 py-1.5" onClick={() => { save({ ...data, incomes: (data.incomes ?? []).map(i => i.id === income.id ? { ...form } : i) }); setEditingIncomeLine(null); }}>שמור</button>
            <button className="btn btn-ghost text-xs px-3 py-1.5" onClick={() => setEditingIncomeLine(null)}>ביטול</button>
            <button className="btn btn-red text-xs px-3 py-1.5 mr-auto" onClick={() => { if (!confirm("למחוק הכנסה?")) return; save({ ...data, incomes: (data.incomes ?? []).filter(i => i.id !== income.id) }); setEditingIncomeLine(null); }}>מחק</button>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-3 py-3 px-1 border-b border-gray-50 group hover:bg-gray-50/50 rounded-lg transition-colors">
        <div className="flex-1 text-right">
          <div className="font-semibold text-gray-800 text-sm">{income.name}</div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${income.frequency === "monthly" ? "bg-green-50 text-green-700" : "bg-blue-50 text-blue-600"}`}>
            {income.frequency === "monthly" ? "חודשי" : "חד פעמי"}
          </span>
          <span className="text-sm font-bold text-green-600">{ils(income.amount)}</span>
          <button className="icon-btn w-8 h-8 rounded-md bg-gray-100 hover:bg-green-50 text-gray-400 hover:text-green-600 flex items-center justify-center text-xs opacity-100 transition-opacity" onClick={() => setEditingIncomeLine(income.id)}>✏️</button>
        </div>
      </div>
    );
  };

  /* ════ PROPERTY SUB-ROWS ════ */
  const IncomeRow = ({ income, propId }: { income: PropertyIncome; propId: string }) => {
    const [form, setForm] = useState({ ...income });
    const isEditing = editingIncome === income.id;

    const updateIncome = (updated: PropertyIncome) => save({ ...data, properties: data.properties.map(p => p.id === propId ? { ...p, incomes: p.incomes.map(i => i.id === income.id ? updated : i) } : p) });
    const deleteIncome = () => { if (!confirm("למחוק?")) return; save({ ...data, properties: data.properties.map(p => p.id === propId ? { ...p, incomes: p.incomes.filter(i => i.id !== income.id) } : p) }); setEditingIncome(null); };

    if (isEditing) {
      return (
        <div className="py-2 px-1 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div><label className="text-xs text-gray-400 mb-0.5 block">שם</label><input className={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} dir="rtl" /></div>
            <div><label className="text-xs text-gray-400 mb-0.5 block">סכום (₪)</label><input className={inp} type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} dir="rtl" /></div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-orange text-xs px-3 py-1" onClick={() => { updateIncome(form); setEditingIncome(null); }}>שמור</button>
            <button className="btn btn-ghost text-xs px-3 py-1" onClick={() => setEditingIncome(null)}>ביטול</button>
            <button className="btn btn-red text-xs px-3 py-1 mr-auto" onClick={deleteIncome}>מחק</button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 py-2 px-1 border-b border-gray-100 group">
        <div className="flex-1 text-sm text-gray-700 text-right">{income.name}</div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-green-600">{ils(income.amount)}/חודש</span>
          <button className="w-5 h-5 rounded bg-gray-100 hover:bg-green-50 text-gray-400 hover:text-green-600 flex items-center justify-center text-[10px] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={() => setEditingIncome(income.id)}>✏️</button>
        </div>
      </div>
    );
  };

  const PropExpenseRow = ({ expense, propId }: { expense: FixedExpense; propId: string }) => {
    const [form, setForm] = useState({ ...expense });
    const isEditing = editingPropExpense === expense.id;

    const updateExpense = (updated: FixedExpense) => save({ ...data, properties: data.properties.map(p => p.id === propId ? { ...p, expenses: p.expenses.map(e => e.id === expense.id ? updated : e) } : p) });
    const deleteExpense = () => { if (!confirm("למחוק?")) return; save({ ...data, properties: data.properties.map(p => p.id === propId ? { ...p, expenses: p.expenses.filter(e => e.id !== expense.id) } : p) }); setEditingPropExpense(null); };

    if (isEditing) {
      return (
        <div className="py-2 px-1 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div><label className="text-xs text-gray-400 mb-0.5 block">שם</label><input className={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} dir="rtl" /></div>
            <div><label className="text-xs text-gray-400 mb-0.5 block">סכום (₪)</label><input className={inp} type="number" value={form.amount} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} dir="rtl" /></div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-orange text-xs px-3 py-1" onClick={() => { updateExpense(form); setEditingPropExpense(null); }}>שמור</button>
            <button className="btn btn-ghost text-xs px-3 py-1" onClick={() => setEditingPropExpense(null)}>ביטול</button>
            <button className="btn btn-red text-xs px-3 py-1 mr-auto" onClick={deleteExpense}>מחק</button>
          </div>
        </div>
      );
    }
    return (
      <div className="flex items-center gap-2 py-2 px-1 border-b border-gray-100 group">
        <div className="flex-1 text-sm text-gray-700 text-right">{expense.name}</div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-teal-600">{ils(expense.amount)}/חודש</span>
          <button className="w-5 h-5 rounded bg-gray-100 hover:bg-teal-50 text-gray-400 hover:text-teal-600 flex items-center justify-center text-[10px] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity" onClick={() => setEditingPropExpense(expense.id)}>✏️</button>
        </div>
      </div>
    );
  };

  const LiabilityRow = ({ liability, propId }: { liability: PropertyLiability; propId: string }) => {
    const [form, setForm] = useState({ ...liability });
    const isEditing = editingLiability === liability.id;

    const updateLiability = (updated: PropertyLiability) => save({ ...data, properties: data.properties.map(p => p.id === propId ? { ...p, liabilities: p.liabilities.map(l => l.id === liability.id ? updated : l) } : p) });
    const deleteLiability = () => { if (!confirm("למחוק?")) return; save({ ...data, properties: data.properties.map(p => p.id === propId ? { ...p, liabilities: p.liabilities.filter(l => l.id !== liability.id) } : p) }); setEditingLiability(null); };

    if (isEditing) {
      return (
        <div className="py-2 px-1 border-b border-gray-100">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="col-span-2"><label className="text-xs text-gray-400 mb-0.5 block">שם</label><input className={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} dir="rtl" /></div>
            <div><label className="text-xs text-gray-400 mb-0.5 block">סך חוב (₪)</label><input className={inp} type="number" value={form.totalDebt} onChange={e => setForm({ ...form, totalDebt: Number(e.target.value) })} dir="rtl" /></div>
            <div><label className="text-xs text-gray-400 mb-0.5 block">תשלום חודשי (₪)</label><input className={inp} type="number" value={form.monthlyPayment} onChange={e => setForm({ ...form, monthlyPayment: Number(e.target.value) })} dir="rtl" /></div>
            <div><label className="text-xs text-gray-400 mb-0.5 block">שולם עד כה (₪)</label><input className={inp} type="number" value={form.paidSoFar} onChange={e => setForm({ ...form, paidSoFar: Number(e.target.value) })} dir="rtl" /></div>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-orange text-xs px-3 py-1" onClick={() => { updateLiability(form); setEditingLiability(null); }}>שמור</button>
            <button className="btn btn-ghost text-xs px-3 py-1" onClick={() => setEditingLiability(null)}>ביטול</button>
            <button className="btn btn-red text-xs px-3 py-1 mr-auto" onClick={deleteLiability}>מחק</button>
          </div>
        </div>
      );
    }
    return (
      <div className="py-2 px-1 border-b border-gray-100 group">
        <div className="flex items-start gap-2">
          <div className="flex-1 text-sm font-semibold text-gray-700 text-right">{liability.name}</div>
          <button className="w-5 h-5 rounded bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center text-[10px] opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" onClick={() => setEditingLiability(liability.id)}>✏️</button>
        </div>
        <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-0.5 text-xs text-gray-500">
          <span className="text-red-600 font-semibold">{ils(liability.totalDebt)} חוב</span>
          {liability.monthlyPayment > 0 && <span>{ils(liability.monthlyPayment)}/חודש</span>}
          {liability.paidSoFar > 0 && <span className="text-green-600">שולם: {ils(liability.paidSoFar)}</span>}
        </div>
      </div>
    );
  };

  /* ════ PROPERTY CARD ════ */
  const PropertyCard = ({ property }: { property: Property }) => {
    const [editingName, setEditingName] = useState(false);
    const [nameForm, setNameForm] = useState({ name: property.name, purchasePrice: property.purchasePrice });

    const totalIncome = property.incomes.reduce((s, i) => s + i.amount, 0);
    const totalExpense = property.expenses.reduce((s, e) => s + (e.frequency === "monthly" ? e.amount : e.amount / 12), 0);
    const totalLiabilityMonthly = property.liabilities.reduce((s, l) => s + l.monthlyPayment, 0);
    const cashFlow = totalIncome - totalExpense - totalLiabilityMonthly;
    const cashFlowColor = cashFlow >= 0 ? "#16a34a" : "#dc2626";

    const addIncome = () => { const n = { id: uid(), name: "הכנסה חדשה", amount: 0 }; save({ ...data, properties: data.properties.map(p => p.id === property.id ? { ...p, incomes: [...p.incomes, n] } : p) }); setEditingIncome(n.id); };
    const addExpense = () => { const n: FixedExpense = { id: uid(), name: "הוצאה חדשה", amount: 0, frequency: "monthly" }; save({ ...data, properties: data.properties.map(p => p.id === property.id ? { ...p, expenses: [...p.expenses, n] } : p) }); setEditingPropExpense(n.id); };
    const addLiability = () => { const n: PropertyLiability = { id: uid(), name: "חוב חדש", totalDebt: 0, monthlyPayment: 0, paidSoFar: 0 }; save({ ...data, properties: data.properties.map(p => p.id === property.id ? { ...p, liabilities: [...p.liabilities, n] } : p) }); setEditingLiability(n.id); };
    const savePropertyName = () => { save({ ...data, properties: data.properties.map(p => p.id === property.id ? { ...p, ...nameForm } : p) }); setEditingName(false); };

    return (
      <div className="bg-gray-50 rounded-xl p-4 mb-3 border border-gray-100">
        {editingName ? (
          <div className="mb-3">
            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="col-span-2"><label className="text-xs text-gray-400 mb-0.5 block">שם נכס</label><input className={inp} value={nameForm.name} onChange={e => setNameForm({ ...nameForm, name: e.target.value })} dir="rtl" /></div>
              <div><label className="text-xs text-gray-400 mb-0.5 block">מחיר רכישה (₪)</label><input className={inp} type="number" value={nameForm.purchasePrice} onChange={e => setNameForm({ ...nameForm, purchasePrice: Number(e.target.value) })} dir="rtl" /></div>
            </div>
            <div className="flex gap-2">
              <button className="btn btn-orange text-xs px-3 py-1" onClick={savePropertyName}>שמור</button>
              <button className="btn btn-ghost text-xs px-3 py-1" onClick={() => setEditingName(false)}>ביטול</button>
              <button className="btn btn-red text-xs px-3 py-1 mr-auto" onClick={() => { if (!confirm("למחוק נכס זה?")) return; save({ ...data, properties: data.properties.filter(p => p.id !== property.id) }); }}>מחק נכס</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between mb-3 gap-2">
            <div className="text-right">
              <div className="font-bold text-gray-900 text-base">{property.name}</div>
              <div className="text-xs text-gray-400 mt-0.5">רכישה: {ils(property.purchasePrice)}</div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-lg font-black text-indigo-600">{ils(property.purchasePrice)}</div>
              <button className="w-7 h-7 rounded-lg bg-white border border-gray-200 hover:bg-teal-50 text-gray-400 hover:text-teal-600 flex items-center justify-center text-xs shadow-sm" onClick={() => setEditingName(true)}>✏️</button>
            </div>
          </div>
        )}

        <div className="mb-3">
          <SubHeader label="הכנסות 💚" color="#16a34a" />
          {property.incomes.map(income => <IncomeRow key={income.id} income={income} propId={property.id} />)}
          {property.incomes.length > 0 && <div className="text-xs text-green-700 font-bold mt-1 text-right px-1">סה"כ: {ils(totalIncome)}/חודש</div>}
          <AddRowBtn label="הוסף הכנסה" onClick={addIncome} />
        </div>

        <div className="mb-3">
          <SubHeader label="הוצאות 🔴" color="#dc2626" />
          {property.expenses.map(expense => <PropExpenseRow key={expense.id} expense={expense} propId={property.id} />)}
          {property.expenses.length > 0 && <div className="text-xs text-teal-700 font-bold mt-1 text-right px-1">סה"כ: {ils(totalExpense)}/חודש</div>}
          <AddRowBtn label="הוסף הוצאה" onClick={addExpense} />
        </div>

        <div className="mb-3">
          <SubHeader label="חובות / תשלומים 🔴" color="#dc2626" />
          {property.liabilities.map(liability => <LiabilityRow key={liability.id} liability={liability} propId={property.id} />)}
          {property.liabilities.length > 0 && <div className="text-xs text-red-700 font-bold mt-1 text-right px-1">סה"כ חודשי: {ils(totalLiabilityMonthly)}/חודש · חוב כולל: {ils(property.liabilities.reduce((s, l) => s + l.totalDebt, 0))}</div>}
          <AddRowBtn label="הוסף חוב" onClick={addLiability} />
        </div>

        <div className="flex items-center justify-between px-3 py-2 rounded-xl mt-2" style={{ background: cashFlowColor + "12", border: `1px solid ${cashFlowColor}30` }}>
          <span className="text-xs font-bold" style={{ color: cashFlowColor }}>תזרים חודשי נטו</span>
          <span className="font-black text-base" style={{ color: cashFlowColor }}>{cashFlow >= 0 ? "+" : ""}{ils(cashFlow)}/חודש</span>
        </div>
      </div>
    );
  };

  /* ════ RENDER ════ */
  const totalLoansMonthly = data.loans.reduce((s, l) => s + l.monthlyPayment, 0);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-3xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between gap-2">
          <button onClick={onBack} className="inline-flex items-center gap-1.5 px-2.5 sm:px-3.5 py-2 rounded-xl bg-white border border-gray-200 shadow-sm text-sm font-semibold text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:shadow-md transition-all duration-150 group flex-shrink-0">
            <span className="text-gray-400 group-hover:text-gray-700 transition-colors text-base leading-none">→</span>
            <span className="hidden sm:inline">המותגים שלי</span>
          </button>
          <h1 className="font-black text-gray-900 text-base sm:text-lg truncate">💰 {brandName ?? "פיננסי אישי"}</h1>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => setShowScanner(true)}
              className="inline-flex items-center gap-1 px-2 sm:px-3 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 font-semibold text-xs hover:bg-teal-100 hover:border-teal-300 transition-all"
              title="ייבוא מדוח אשראי"
            >
              <span>📄</span>
              <span className="hidden sm:inline">ייבוא דוח אשראי</span>
            </button>
            {editingDate ? (
              <input type="date" className="border border-gray-200 rounded-lg px-2 py-1 text-xs text-right bg-white focus:outline-none focus:border-teal-400" value={data.asOfDate ?? new Date().toISOString().slice(0, 10)} onChange={e => { save({ ...data, asOfDate: e.target.value }); setEditingDate(false); }} onBlur={() => setEditingDate(false)} autoFocus />
            ) : (
              <button onClick={() => setEditingDate(true)} className="text-xs text-gray-400 hover:text-gray-700 transition-colors px-1.5 sm:px-2 py-1 rounded-lg hover:bg-gray-50 whitespace-nowrap" title="לחץ לשינוי תאריך">
                <span className="hidden sm:inline">נכון ל: </span>{data.asOfDate ? hebrewMonthYear(data.asOfDate) : "היום"}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI row */}
      <div className="max-w-3xl mx-auto px-4 pt-5 pb-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
          <div className="card px-4 py-3 shadow-sm border border-gray-100">
            <div className="text-xl font-black" style={{ color: "#dc2626" }}>{ils(totalRemaining)}</div>
            <div className="text-xs text-gray-400 mt-1">נותר לשלם</div>
          </div>
          <div className="card px-4 py-3 shadow-sm border border-gray-100">
            <div className="text-xl font-black" style={{ color: "#ea580c" }}>{ils(totalMonthly)}</div>
            <div className="text-xs text-gray-400 mt-1">תשלום חודשי</div>
          </div>
          <div className="card px-4 py-3 shadow-sm border border-gray-100">
            <div className="text-xl font-black" style={{ color: "#16a34a" }}>{ils(totalMonthlyIncome)}</div>
            <div className="text-xs text-gray-400 mt-1">הכנסה חודשית</div>
          </div>
          <div className="card px-4 py-3 shadow-sm border border-gray-100">
            <div className="text-xl font-black" style={{ color: "#6366f1" }}>{ils(totalPropertyValue)}</div>
            <div className="text-xs text-gray-400 mt-1">שווי נכסים</div>
          </div>
        </div>

        {/* Advance all button */}
        <button
          onClick={advanceMonth}
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 hover:shadow-md"
          style={{ background: "linear-gradient(135deg,#0d9488,#0369a1)", color: "white" }}
        >
          ✓ עדכן חודש — הוסף תשלום לכל ההלוואות
        </button>
      </div>

      {/* Accordion sections */}
      <div className="max-w-3xl mx-auto px-4 space-y-3 pb-10 pt-3">

        {/* LOANS */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button onClick={() => toggle("loans")} className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50/50 transition-colors">
            <span className="font-bold text-gray-900">הלוואות 🏦</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 hidden sm:block">{ils(totalRemaining)} נותר · {ils(totalLoansMonthly)}/חודש · {data.loans.length} הלוואות</span>
              <span className="text-gray-400 text-sm">{openSection === "loans" ? "▲" : "▼"}</span>
            </div>
          </button>
          {openSection === "loans" && (
            <div className="px-5 pb-4 border-t border-gray-50">
              <div className="mt-2">{data.loans.map(loan => <LoanRow key={loan.id} loan={loan} />)}</div>
              <AddRowBtn label="הוסף הלוואה" onClick={() => { const n: Loan = { id: uid(), name: "", principal: 0, annualRate: 0, monthlyPayment: 0, manualPayment: false, paidMonths: 0, totalMonths: 12 }; save({ ...data, loans: [...data.loans, n] }); setEditingLoan(n.id); }} />
            </div>
          )}
        </div>

        {/* INCOMES */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button onClick={() => toggle("incomes")} className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50/50 transition-colors">
            <span className="font-bold text-gray-900">הכנסות 💚</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 hidden sm:block">
                {totalMonthlyIncome > 0 && `${ils(totalMonthlyIncome)}/חודש`}
                {totalOnetimeIncome > 0 && ` · ${ils(totalOnetimeIncome)} חד פעמי`}
                {` · ${(data.incomes ?? []).length} הכנסות`}
              </span>
              <span className="text-gray-400 text-sm">{openSection === "incomes" ? "▲" : "▼"}</span>
            </div>
          </button>
          {openSection === "incomes" && (
            <div className="px-5 pb-4 border-t border-gray-50">
              <div className="mt-2">
                {(data.incomes ?? []).length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-4">אין הכנסות מוגדרות עדיין</p>
                )}
                {(data.incomes ?? []).map(income => <IncomeLineRow key={income.id} income={income} />)}
              </div>
              {/* Monthly/one-time totals */}
              {(data.incomes ?? []).length > 0 && (
                <div className="flex gap-3 mt-2 mb-1 px-1">
                  {totalMonthlyIncome > 0 && <span className="text-xs text-green-700 font-bold">חודשי: {ils(totalMonthlyIncome)}/חודש</span>}
                  {totalOnetimeIncome > 0 && <span className="text-xs text-blue-600 font-bold">חד פעמי: {ils(totalOnetimeIncome)}</span>}
                </div>
              )}
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => { const n: Income = { id: uid(), name: "", amount: 0, frequency: "monthly" }; save({ ...data, incomes: [...(data.incomes ?? []), n] }); setEditingIncomeLine(n.id); }}
                  className="flex-1 py-2 rounded-xl border-2 border-dashed border-green-200 text-green-500 text-sm font-semibold hover:border-green-400 hover:text-green-600 transition-all"
                >
                  + הוסף הכנסה חודשית
                </button>
                <button
                  onClick={() => { const n: Income = { id: uid(), name: "", amount: 0, frequency: "one-time" }; save({ ...data, incomes: [...(data.incomes ?? []), n] }); setEditingIncomeLine(n.id); }}
                  className="flex-1 py-2 rounded-xl border-2 border-dashed border-blue-200 text-blue-500 text-sm font-semibold hover:border-blue-400 hover:text-blue-600 transition-all"
                >
                  + הכנסה חד פעמית
                </button>
              </div>
            </div>
          )}
        </div>

        {/* EXPENSES */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button onClick={() => toggle("expenses")} className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50/50 transition-colors">
            <span className="font-bold text-gray-900">הוצאות שוטפות 📊</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 hidden sm:block">{ils(totalExpensesMonthly)}/חודש · {data.expenses.length} הוצאות</span>
              <span className="text-gray-400 text-sm">{openSection === "expenses" ? "▲" : "▼"}</span>
            </div>
          </button>
          {openSection === "expenses" && (
            <div className="px-5 pb-4 border-t border-gray-50">
              <div className="mt-2">{data.expenses.map(expense => <ExpenseRow key={expense.id} expense={expense} />)}</div>
              <AddRowBtn label="הוסף הוצאה" onClick={() => { const n: FixedExpense = { id: uid(), name: "הוצאה חדשה", amount: 0, frequency: "monthly" }; save({ ...data, expenses: [...data.expenses, n] }); setEditingExpense(n.id); }} />
            </div>
          )}
        </div>

        {/* PROPERTIES */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button onClick={() => toggle("properties")} className="w-full flex justify-between items-center px-5 py-4 hover:bg-gray-50/50 transition-colors">
            <span className="font-bold text-gray-900">נכסים 🏘️</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-500 hidden sm:block">{ils(totalPropertyValue)} שווי · {data.properties.length} נכסים</span>
              <span className="text-gray-400 text-sm">{openSection === "properties" ? "▲" : "▼"}</span>
            </div>
          </button>
          {openSection === "properties" && (
            <div className="px-5 pb-4 border-t border-gray-50">
              <div className="mt-3">{data.properties.map(property => <PropertyCard key={property.id} property={property} />)}</div>
              <AddRowBtn label="הוסף נכס" onClick={() => { const n: Property = { id: uid(), name: "נכס חדש", purchasePrice: 0, incomes: [], expenses: [], liabilities: [] }; save({ ...data, properties: [...data.properties, n] }); }} />
            </div>
          )}
        </div>
      </div>

      {/* Credit Report Scanner modal */}
      {showScanner && (
        <CreditReportScanner
          onClose={() => setShowScanner(false)}
          onImport={(importedLoans) => {
            handleScannerImport(importedLoans);
            setShowScanner(false);
          }}
        />
      )}
    </div>
  );
}
