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
import { HebrewMonthInput, HebrewDateInput } from "./HebrewDateInput";

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

/** Back-calculate annual interest rate from known PMT, principal, totalMonths.
 *  Uses bisection search (100 iterations → precision < 0.0001%).
 *  Returns annual rate in % (e.g. 5.25), or 0 if impossible. */
function calcImpliedRate(principal: number, monthlyPayment: number, totalMonths: number): number {
  if (principal <= 0 || monthlyPayment <= 0 || totalMonths <= 0) return 0;
  // If payment < interest-free payment → rate is 0 or debt is forgiven
  const zeroRatePmt = principal / totalMonths;
  if (monthlyPayment <= zeroRatePmt) return 0;
  // Sanity cap: payment can't exceed principal (would be > 100% monthly rate)
  if (monthlyPayment >= principal) return 0;

  let lo = 0;       // monthly rate lower bound
  let hi = 5;       // monthly rate upper bound (500% annual — absurd but safe cap)

  for (let i = 0; i < 200; i++) {
    const r = (lo + hi) / 2;
    const pmt = r === 0
      ? principal / totalMonths
      : (principal * r * Math.pow(1 + r, totalMonths)) / (Math.pow(1 + r, totalMonths) - 1);
    if (pmt < monthlyPayment) lo = r; else hi = r;
  }

  const monthlyRate = (lo + hi) / 2;
  const annualRate  = monthlyRate * 12 * 100; // convert to %
  // Round to 2 decimal places, cap at 40% (beyond is suspicious)
  return annualRate > 40 ? 0 : Math.round(annualRate * 100) / 100;
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
  const [showCashflowBreakdown, setShowCashflowBreakdown] = useState(false);

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
  const totalRemaining          = data.loans.reduce((s, l) => s + loanRemaining(l), 0);
  const totalMonthly            = data.loans.reduce((s, l) => s + (l.paidMonths < l.totalMonths ? l.monthlyPayment : 0), 0);
  const totalPropertyValue      = data.properties.reduce((s, p) => s + p.purchasePrice, 0);
  const totalMonthlyIncome      = (data.incomes ?? []).filter(i => i.frequency === "monthly").reduce((s, i) => s + i.amount, 0);
  const totalOnetimeIncome      = (data.incomes ?? []).filter(i => i.frequency === "one-time").reduce((s, i) => s + i.amount, 0);
  const totalExpensesMonthly    = data.expenses.filter(e => e.frequency === "monthly").reduce((s, e) => s + e.amount, 0);

  /* Extended KPIs */
  const totalPropMonthlyIncome  = data.properties.reduce((s, p) => s + p.incomes.reduce((ps, i) => ps + i.amount, 0), 0);
  const totalLiabilityMonthly   = data.properties.reduce((s, p) => s + p.liabilities.reduce((ls, l) => ls + l.monthlyPayment, 0), 0);
  const totalPropExpMonthly     = data.properties.reduce((s, p) => s + p.expenses.filter(e => e.frequency === "monthly").reduce((es, e) => es + e.amount, 0), 0);
  const totalLiabilityRemaining = data.properties.reduce((s, p) => s + p.liabilities.reduce((ls, l) => {
    const pm = l.paidMonths ?? (l.monthlyPayment > 0 ? Math.round(l.paidSoFar / l.monthlyPayment) : 0);
    return ls + loanRemainingBalance(l.totalDebt, l.annualRate ?? 0, l.monthlyPayment, pm);
  }, 0), 0);

  const allMonthlyIncome  = totalMonthlyIncome + totalPropMonthlyIncome;
  const allMonthlyOut     = totalMonthly + totalExpensesMonthly + totalLiabilityMonthly + totalPropExpMonthly;
  const netMonthlyCash    = allMonthlyIncome - allMonthlyOut;
  const totalDebtAll      = totalRemaining + totalLiabilityRemaining;

  const toggle = (s: "loans" | "expenses" | "incomes" | "properties") =>
    setOpenSection(prev => prev === s ? null : s);

  /* ════ LOANS ════ */
  const LoanRow = ({ loan }: { loan: Loan }) => {
    const initForm = () => ({
      ...loan,
      annualRate: loan.annualRate ?? 0,
      manualPayment: loan.manualPayment ?? false,
      manualDates: loan.manualDates ?? false,
      paymentDayOfMonth: loan.paymentDayOfMonth,
      startDate: loan.startDate ?? "",
      endDate: loan.endDate ?? "",
    });
    const [form, setForm] = useState(initForm);
    const isEditing = editingLoan === loan.id;

    const pct = loan.totalMonths > 0 ? Math.round((loan.paidMonths / loan.totalMonths) * 100) : 0;
    const remaining = loanRemaining(loan);
    const isDone = loan.paidMonths >= loan.totalMonths;

    /* ── date → months helpers ── */
    const monthsBetweenDates = (start: string, end: string) => {
      if (!start || !end) return 0;
      const s = new Date(start + "-01");
      const e = new Date(end + "-01");
      return Math.max(0, (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()));
    };
    const monthsSinceDate = (start: string) => {
      if (!start) return 0;
      const s = new Date(start + "-01");
      const now = new Date();
      return Math.max(0, (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth()));
    };

    // Auto-computed values from dates (when not overridden manually)
    const autoTotalMonths = form.startDate && form.endDate ? monthsBetweenDates(form.startDate, form.endDate) : 0;
    const autoPaidMonths  = form.startDate ? monthsSinceDate(form.startDate) : 0;

    // Effective values (manual override or auto)
    const effectiveTotalMonths = form.manualDates ? form.totalMonths : (autoTotalMonths || form.totalMonths);
    const effectivePaidMonths  = form.manualDates ? form.paidMonths  : Math.min(autoPaidMonths, effectiveTotalMonths);

    /* ── helpers inside edit mode ── */
    const autoPMT = calcPMT(form.principal, form.annualRate, effectiveTotalMonths);
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

    const handleDateField = (field: "startDate" | "endDate", value: string) => {
      setForm(prev => ({ ...prev, [field]: value, manualDates: false }));
    };

    const handleSave = () => {
      const saved: Loan = {
        ...form,
        totalMonths: effectiveTotalMonths,
        paidMonths: Math.min(effectivePaidMonths, effectiveTotalMonths),
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
      const previewRemaining = loanRemainingBalance(form.principal, form.annualRate, effectivePMT, effectivePaidMonths);
      const totalPaid = effectivePMT * effectiveTotalMonths;
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
                <label className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                  ריבית שנתית (%)
                  {/* Show implied rate suggestion when manual payment is set */}
                  {(() => {
                    const implied = form.manualPayment && form.principal > 0 && effectiveTotalMonths > 0 && form.monthlyPayment > 0
                      ? calcImpliedRate(form.principal, form.monthlyPayment, effectiveTotalMonths)
                      : 0;
                    if (implied > 0 && Math.abs(implied - (form.annualRate ?? 0)) > 0.05) {
                      return (
                        <button
                          type="button"
                          onClick={() => handleField("annualRate", implied)}
                          className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors border border-indigo-200"
                          title={`חשב ריבית משוערת מהתשלום החודשי`}
                        >
                          חשב ← {implied}%
                        </button>
                      );
                    }
                    return null;
                  })()}
                </label>
                <input className={inp} type="number" step="0.01" value={form.annualRate || ""} onChange={e => handleField("annualRate", Number(e.target.value))} dir="rtl" placeholder="0" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-0.5 flex items-center gap-1">
                  תקופה (חודשים)
                  {autoTotalMonths > 0 && !form.manualDates && <span className="text-[9px] bg-orange-100 text-orange-600 px-1 rounded-full font-bold">מתאריכים</span>}
                </label>
                <div className="border border-gray-200 rounded-lg px-2 py-1 text-sm font-bold text-right bg-gray-50 text-gray-700">
                  {effectiveTotalMonths || "—"}
                </div>
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

          {/* Dates → auto calc */}
          <div className="rounded-xl bg-orange-50/60 border border-orange-100 p-3 mb-3">
            <div className="text-[11px] font-bold text-orange-600 mb-2.5 flex items-center gap-1.5">📅 תאריכי הלוואה</div>
            <div className="grid grid-cols-1 gap-2 mb-2">
              <div>
                <label className="text-xs text-gray-400 mb-0.5 block">תאריך פתיחה</label>
                <HebrewMonthInput
                  value={form.startDate ?? ""}
                  onChange={v => handleDateField("startDate", v)}
                  placeholder="חודש פתיחה"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-0.5 block">תאריך סיום</label>
                <HebrewMonthInput
                  value={form.endDate ?? ""}
                  onChange={v => handleDateField("endDate", v)}
                  placeholder="חודש סיום"
                />
              </div>
            </div>
            {/* Auto-calculated summary */}
            {(form.startDate || form.endDate) && (
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-orange-100">
                <div className="text-center">
                  <div className="text-[10px] text-gray-400 mb-0.5">סה״כ חודשים</div>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-sm font-black text-gray-800">{effectiveTotalMonths || "—"}</span>
                    {autoTotalMonths > 0 && !form.manualDates && (
                      <span className="text-[9px] bg-orange-100 text-orange-600 px-1 rounded-full font-bold">אוטו</span>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-400 mb-0.5">חודשים ששולמו</div>
                  <div className="flex items-center justify-center gap-1">
                    <span className="text-sm font-black text-gray-800">{effectivePaidMonths}</span>
                    {form.startDate && !form.manualDates && (
                      <span className="text-[9px] bg-orange-100 text-orange-600 px-1 rounded-full font-bold">אוטו</span>
                    )}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-gray-400 mb-0.5">יתרה לתשלום</div>
                  <div className="text-sm font-black" style={{ color: "#dc2626" }}>
                    {ils(loanRemainingBalance(form.principal, form.annualRate, effectivePMT, effectivePaidMonths))}
                  </div>
                </div>
              </div>
            )}
            {/* Manual override toggle */}
            {(autoTotalMonths > 0 || autoPaidMonths > 0) && (
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, manualDates: !prev.manualDates, totalMonths: effectiveTotalMonths, paidMonths: effectivePaidMonths }))}
                className={`mt-2 text-[10px] font-semibold px-2 py-0.5 rounded-full border transition-all ${form.manualDates ? "bg-gray-200 text-gray-600 border-gray-300" : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"}`}
              >
                {form.manualDates ? "✏️ עריכה ידנית פעילה" : "עקוף ידנית"}
              </button>
            )}
          </div>

          {/* Tracking — only show if manual override */}
          {form.manualDates && (
          <div className="rounded-xl bg-gray-50 border border-gray-100 p-3 mb-3">
            <div className="text-[11px] font-bold text-gray-500 mb-2.5 flex items-center gap-1.5">📊 מעקב ידני</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-gray-400 mb-0.5 block">חודשים ששולמו</label>
                <input className={inp} type="number" value={form.paidMonths || 0} onChange={e => setForm({ ...form, paidMonths: Math.min(Number(e.target.value), form.totalMonths) })} dir="rtl" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-0.5 block">סה״כ חודשים</label>
                <input className={inp} type="number" value={form.totalMonths || 0} onChange={e => handleField("totalMonths", Number(e.target.value))} dir="rtl" />
              </div>
            </div>
          </div>
          )}

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
            {(loan.startDate || loan.endDate) && (
              <div className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1.5">
                {loan.startDate && <span>📅 {loan.startDate.slice(0, 7)}</span>}
                {loan.startDate && loan.endDate && <span>→</span>}
                {loan.endDate && <span>{loan.endDate.slice(0, 7)}</span>}
              </div>
            )}
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
            <div>
              <label className="text-xs text-gray-400 mb-0.5 block">תדירות</label>
              <select className={inp} value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as "monthly" | "yearly" })}>
                <option value="monthly">חודשי</option>
                <option value="yearly">שנתי</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-0.5 block">סוג</label>
              <div className="flex gap-1 mt-1">
                {([{ v: "personal", label: "👤 אישי" }, { v: "business", label: "🏢 עסקי" }] as { v: "personal"|"business"; label: string }[]).map(opt => (
                  <button key={opt.v} type="button"
                    onClick={() => setForm({ ...form, category: opt.v })}
                    className={`flex-1 text-xs font-semibold py-1 px-2 rounded-lg border transition-all ${(form.category ?? "personal") === opt.v ? opt.v === "personal" ? "bg-purple-100 border-purple-400 text-purple-700" : "bg-blue-100 border-blue-400 text-blue-700" : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"}`}
                  >{opt.label}</button>
                ))}
              </div>
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
          {expense.category && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${expense.category === "business" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
              {expense.category === "business" ? "🏢 עסקי" : "👤 אישי"}
            </span>
          )}
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
              <label className="text-xs text-gray-400 mb-0.5 block">תדירות</label>
              <select className={inp} value={form.frequency} onChange={e => setForm({ ...form, frequency: e.target.value as "monthly" | "one-time" })}>
                <option value="monthly">חודשי</option>
                <option value="one-time">חד פעמי</option>
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-400 mb-0.5 block">סוג</label>
              <div className="flex gap-1 mt-1">
                {([{ v: "personal", label: "👤 אישי" }, { v: "business", label: "🏢 עסקי" }] as { v: "personal"|"business"; label: string }[]).map(opt => (
                  <button key={opt.v} type="button"
                    onClick={() => setForm({ ...form, category: opt.v })}
                    className={`flex-1 text-xs font-semibold py-1 px-2 rounded-lg border transition-all ${(form.category ?? "personal") === opt.v ? opt.v === "personal" ? "bg-purple-100 border-purple-400 text-purple-700" : "bg-blue-100 border-blue-400 text-blue-700" : "bg-white border-gray-200 text-gray-400 hover:border-gray-300"}`}
                  >{opt.label}</button>
                ))}
              </div>
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
          {income.category && (
            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${income.category === "business" ? "bg-blue-50 text-blue-600" : "bg-purple-50 text-purple-600"}`}>
              {income.category === "business" ? "🏢 עסקי" : "👤 אישי"}
            </span>
          )}
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

    // Derived display values
    const paidMonths = liability.paidMonths ?? (liability.monthlyPayment > 0 ? Math.round(liability.paidSoFar / liability.monthlyPayment) : 0);
    const totalPayments = liability.monthlyPayment > 0 ? Math.ceil(liability.totalDebt / liability.monthlyPayment) : 0;
    const remaining = liability.annualRate
      ? loanRemainingBalance(liability.totalDebt, liability.annualRate, liability.monthlyPayment, paidMonths)
      : Math.max(0, liability.totalDebt - paidMonths * liability.monthlyPayment);
    const progress = totalPayments > 0 ? Math.min(100, (paidMonths / totalPayments) * 100) : 0;

    // Form derived values
    const formPaidMonths = form.paidMonths ?? (form.monthlyPayment > 0 ? Math.round(form.paidSoFar / form.monthlyPayment) : 0);
    const formTotalPayments = form.monthlyPayment > 0 ? Math.ceil(form.totalDebt / form.monthlyPayment) : 0;
    const formRemaining = form.annualRate
      ? loanRemainingBalance(form.totalDebt, form.annualRate, form.monthlyPayment, formPaidMonths)
      : Math.max(0, form.totalDebt - formPaidMonths * form.monthlyPayment);

    if (isEditing) {
      return (
        <div className="py-3 px-2 border-b border-gray-100 bg-orange-50/30 rounded-lg mb-1">
          <div className="grid grid-cols-2 gap-2 mb-2">
            <div className="col-span-2"><label className="text-xs text-gray-400 mb-0.5 block">שם</label><input className={inp} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} dir="rtl" /></div>
            <div>
              <label className="text-xs text-gray-400 mb-0.5 block">סה״כ חוב (₪)</label>
              <input className={inp} type="number" value={form.totalDebt} onChange={e => setForm({ ...form, totalDebt: Number(e.target.value) })} dir="rtl" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-0.5 block">החזר חודשי (₪)</label>
              <input className={inp} type="number" value={form.monthlyPayment} onChange={e => setForm({ ...form, monthlyPayment: Number(e.target.value) })} dir="rtl" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-0.5 block">ריבית שנתית (%)</label>
              <input className={inp} type="number" step="0.1" value={form.annualRate ?? ""} placeholder="0 = ללא ריבית" onChange={e => setForm({ ...form, annualRate: e.target.value ? Number(e.target.value) : undefined })} dir="rtl" />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-0.5 block">תשלומים ששולמו</label>
              <div className="flex items-center gap-1">
                <button className="w-7 h-8 rounded border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 text-sm font-bold" onClick={() => setForm(f => ({ ...f, paidMonths: Math.max(0, (f.paidMonths ?? 0) - 1) }))}>−</button>
                <input className={`${inp} text-center flex-1`} type="number" value={form.paidMonths ?? 0} onChange={e => setForm({ ...form, paidMonths: Number(e.target.value) })} dir="ltr" />
                <button className="w-7 h-8 rounded border border-gray-200 bg-white text-gray-600 hover:bg-orange-50 text-sm font-bold" onClick={() => setForm(f => ({ ...f, paidMonths: (f.paidMonths ?? 0) + 1 }))}>+</button>
              </div>
            </div>
          </div>
          {/* Auto-calculated summary */}
          {formTotalPayments > 0 && (
            <div className="bg-white rounded-lg p-2 mb-2 border border-gray-100 text-xs text-gray-500 flex flex-wrap gap-x-4 gap-y-1 text-right" dir="rtl">
              <span>סה״כ תשלומים: <strong className="text-gray-700">{formTotalPayments}</strong></span>
              <span>שולמו: <strong className="text-orange-600">{formPaidMonths}</strong></span>
              <span>יתרה לתשלום: <strong className="text-red-600">{ils(formRemaining)}</strong></span>
            </div>
          )}
          <div className="flex gap-2">
            <button className="btn btn-orange text-xs px-3 py-1" onClick={() => { updateLiability({ ...form, paidSoFar: (form.paidMonths ?? 0) * form.monthlyPayment }); setEditingLiability(null); }}>שמור</button>
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
          <span className="text-red-600 font-semibold">יתרה: {ils(remaining)}</span>
          {liability.monthlyPayment > 0 && <span>{ils(liability.monthlyPayment)}/חודש</span>}
          {totalPayments > 0 && <span className="text-gray-400">{paidMonths}/{totalPayments} תשלומים</span>}
        </div>
        {totalPayments > 0 && (
          <div className="mt-1.5 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-400 to-orange-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}
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
    const addLiability = () => { const n: PropertyLiability = { id: uid(), name: "חוב חדש", totalDebt: 0, monthlyPayment: 0, paidSoFar: 0, paidMonths: 0 }; save({ ...data, properties: data.properties.map(p => p.id === property.id ? { ...p, liabilities: [...p.liabilities, n] } : p) }); setEditingLiability(n.id); };
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
              <div className="flex items-center gap-1">
                <HebrewDateInput
                  value={data.asOfDate ?? new Date().toISOString().slice(0, 10)}
                  onChange={v => { save({ ...data, asOfDate: v }); setEditingDate(false); }}
                  className="text-xs"
                />
                <button onClick={() => setEditingDate(false)} className="text-gray-400 text-xs px-1 hover:text-gray-600">✕</button>
              </div>
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
          {/* Income */}
          <div className="card px-4 py-3 shadow-sm border border-green-100 bg-green-50/40">
            <div className="text-xl font-black" style={{ color: "#16a34a" }}>{ils(allMonthlyIncome)}</div>
            <div className="text-xs text-gray-500 mt-1 font-medium">הכנסה חודשית</div>
            {totalPropMonthlyIncome > 0 && (
              <div className="text-[10px] text-gray-400 mt-0.5">כולל ₪{Math.round(totalPropMonthlyIncome).toLocaleString("he-IL")} מנכסים</div>
            )}
          </div>
          {/* All outflows */}
          <div className="card px-4 py-3 shadow-sm border border-orange-100 bg-orange-50/40">
            <div className="text-xl font-black" style={{ color: "#ea580c" }}>{ils(allMonthlyOut)}</div>
            <div className="text-xs text-gray-500 mt-1 font-medium">החזר חודשי כולל</div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              {totalMonthly > 0 && `הלוואות ₪${Math.round(totalMonthly).toLocaleString("he-IL")}`}
              {totalExpensesMonthly > 0 && ` · הוצ׳ ₪${Math.round(totalExpensesMonthly).toLocaleString("he-IL")}`}
            </div>
          </div>
          {/* Net cash — clickable for breakdown */}
          <button
            onClick={() => setShowCashflowBreakdown(true)}
            className={`card px-4 py-3 shadow-sm border text-right transition-all hover:shadow-md active:scale-95 ${netMonthlyCash >= 0 ? "border-teal-100 bg-teal-50/40 hover:border-teal-300" : "border-red-100 bg-red-50/40 hover:border-red-300"}`}
          >
            <div className="text-xl font-black" style={{ color: netMonthlyCash >= 0 ? "#0d9488" : "#dc2626" }}>
              {netMonthlyCash >= 0 ? "+" : ""}{ils(netMonthlyCash)}
            </div>
            <div className="text-xs text-gray-500 mt-1 font-medium">תזרים נטו</div>
            <div className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: netMonthlyCash >= 0 ? "#0d9488" : "#dc2626" }}>
              {netMonthlyCash >= 0 ? "✓ חיובי" : "⚠ גירעון"}
              <span className="text-gray-300 mr-1">· לחץ לפירוט</span>
            </div>
          </button>
          {/* Total debt */}
          <div className="card px-4 py-3 shadow-sm border border-gray-100">
            <div className="text-xl font-black" style={{ color: "#6366f1" }}>{ils(totalDebtAll)}</div>
            <div className="text-xs text-gray-500 mt-1 font-medium">יתרת חוב</div>
            {totalLiabilityRemaining > 0 && (
              <div className="text-[10px] text-gray-400 mt-0.5">כולל ₪{Math.round(totalLiabilityRemaining).toLocaleString("he-IL")} נכסים</div>
            )}
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

      {/* ── Cashflow Breakdown Modal ── */}
      {showCashflowBreakdown && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" dir="rtl"
          style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
          onClick={() => setShowCashflowBreakdown(false)}
        >
          <div
            className="w-full sm:max-w-md bg-white sm:rounded-2xl rounded-t-3xl shadow-2xl overflow-hidden"
            style={{ maxHeight: "88vh", display: "flex", flexDirection: "column" }}
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="text-right">
                <h2 className="font-black text-gray-900 text-base">פירוט תזרים חודשי</h2>
                <p className="text-xs text-gray-400 mt-0.5">מאיפה מגיע הכסף ולאן הוא הולך</p>
              </div>
              <button onClick={() => setShowCashflowBreakdown(false)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg transition-colors">×</button>
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">

              {/* ── INCOME ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-black text-green-700">+{ils(allMonthlyIncome)}</span>
                  <span className="text-xs font-bold text-gray-500 flex items-center gap-1">💚 הכנסות חודשיות</span>
                </div>
                <div className="space-y-1.5 pr-2">
                  {(data.incomes ?? []).filter(i => i.frequency === "monthly").map(i => (
                    <div key={i.id} className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-green-50 border border-green-100">
                      <span className="text-sm font-bold text-green-700">+{ils(i.amount)}</span>
                      <span className="text-sm text-gray-700">{i.name}</span>
                    </div>
                  ))}
                  {data.properties.map(p => {
                    const propInc = p.incomes.reduce((s, i) => s + i.amount, 0);
                    if (propInc === 0) return null;
                    return (
                      <div key={p.id} className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-green-50 border border-green-100">
                        <span className="text-sm font-bold text-green-700">+{ils(propInc)}</span>
                        <span className="text-sm text-gray-700">🏠 {p.name}</span>
                      </div>
                    );
                  })}
                  {allMonthlyIncome === 0 && (
                    <div className="text-xs text-gray-400 text-right px-1">אין הכנסות מוגדרות</div>
                  )}
                </div>
              </div>

              <div className="h-px bg-gray-100" />

              {/* ── OUTFLOWS ── */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-black text-red-600">-{ils(allMonthlyOut)}</span>
                  <span className="text-xs font-bold text-gray-500 flex items-center gap-1">🔴 הוצאות חודשיות</span>
                </div>
                <div className="space-y-1.5 pr-2">

                  {/* Loans */}
                  {data.loans.filter(l => l.paidMonths < l.totalMonths).length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-1">🏦 הלוואות</div>
                      {data.loans.filter(l => l.paidMonths < l.totalMonths).map(l => {
                        const remaining = l.totalMonths - l.paidMonths;
                        return (
                          <div key={l.id} className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-orange-50 border border-orange-100">
                            <div className="text-right">
                              <span className="text-sm font-bold text-red-600">-{ils(l.monthlyPayment)}</span>
                            </div>
                            <div className="text-right min-w-0">
                              <div className="text-sm text-gray-700 truncate">{l.name}</div>
                              <div className="text-[10px] text-gray-400">{remaining} תשלומים נותרו</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Fixed expenses */}
                  {data.expenses.filter(e => e.frequency === "monthly").length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-1 mt-2">📋 הוצאות קבועות</div>
                      {data.expenses.filter(e => e.frequency === "monthly").map(e => (
                        <div key={e.id} className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-red-50 border border-red-100">
                          <span className="text-sm font-bold text-red-600">-{ils(e.amount)}</span>
                          <span className="text-sm text-gray-700">{e.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Property liabilities */}
                  {data.properties.some(p => p.liabilities.length > 0) && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-1 mt-2">🏠 חובות נכסים</div>
                      {data.properties.flatMap(p => p.liabilities.map(l => ({
                        key: l.id, name: `${p.name} — ${l.name}`, amount: l.monthlyPayment,
                      }))).map(row => (
                        <div key={row.key} className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-red-50 border border-red-100">
                          <span className="text-sm font-bold text-red-600">-{ils(row.amount)}</span>
                          <span className="text-sm text-gray-700 truncate">{row.name}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Property expenses */}
                  {data.properties.some(p => p.expenses.some(e => e.frequency === "monthly")) && (
                    <div className="space-y-1">
                      <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider px-1 mb-1 mt-2">🏠 הוצאות נכסים</div>
                      {data.properties.flatMap(p => p.expenses.filter(e => e.frequency === "monthly").map(e => ({
                        key: e.id, name: `${p.name} — ${e.name}`, amount: e.amount,
                      }))).map(row => (
                        <div key={row.key} className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-red-50 border border-red-100">
                          <span className="text-sm font-bold text-red-600">-{ils(row.amount)}</span>
                          <span className="text-sm text-gray-700 truncate">{row.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── NET TOTAL ── */}
              <div className="h-px bg-gray-100" />
              <div className={`flex items-center justify-between px-4 py-4 rounded-2xl ${netMonthlyCash >= 0 ? "bg-teal-50 border border-teal-200" : "bg-red-50 border border-red-200"}`}>
                <div className="text-left">
                  <div className="text-2xl font-black" style={{ color: netMonthlyCash >= 0 ? "#0d9488" : "#dc2626" }}>
                    {netMonthlyCash >= 0 ? "+" : ""}{ils(netMonthlyCash)}
                  </div>
                  <div className="text-xs font-bold mt-0.5" style={{ color: netMonthlyCash >= 0 ? "#0d9488" : "#dc2626" }}>
                    {netMonthlyCash >= 0 ? "✓ תזרים חיובי" : "⚠ גירעון חודשי"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-gray-700">תזרים נטו</div>
                  <div className="text-xs text-gray-400 mt-0.5">
                    +{ils(allMonthlyIncome)} הכנסות<br/>
                    -{ils(allMonthlyOut)} הוצאות
                  </div>
                </div>
              </div>

              {netMonthlyCash < 0 && (
                <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-xs font-bold text-amber-700 mb-1">💡 מה אפשר לעשות?</div>
                  <div className="text-xs text-amber-600 leading-relaxed">
                    כדי לאזן את התזרים צריך להגדיל הכנסות ב-{ils(Math.abs(netMonthlyCash))}/חודש
                    או להפחית הוצאות באותו סכום.
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}
