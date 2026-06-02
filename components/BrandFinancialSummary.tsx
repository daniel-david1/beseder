"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Brand,
  Project,
  SubProject,
  Channel,
  Stage,
  StageExpense,
  FinancialData,
  Loan,
  PaymentCommitment,
  Income,
  FixedExpense,
} from "@/lib/types";
import { loadFinancialData, loadFinancialFromCloud } from "@/lib/storage";

/* ─────────────────── helpers ─────────────────────────────── */
const ils = (n: number) =>
  "₪" + Math.round(Math.abs(n)).toLocaleString("he-IL");

function loanRemainingBalance(
  principal: number,
  annualRate: number,
  monthlyPayment: number,
  paidMonths: number
): number {
  if (paidMonths <= 0) return principal;
  if (monthlyPayment <= 0) return principal;
  if (annualRate === 0)
    return Math.max(0, principal - monthlyPayment * paidMonths);
  const r = annualRate / 100 / 12;
  const balance =
    principal * Math.pow(1 + r, paidMonths) -
    monthlyPayment * ((Math.pow(1 + r, paidMonths) - 1) / r);
  return Math.max(0, balance);
}

function commitmentMonthlyCost(c: PaymentCommitment): number {
  const allPaid = c.payments.every((p) => p.paid);
  if (allPaid) return 0;
  if (c.frequency === "monthly") return c.amountPerPayment;
  if (c.frequency === "weekly") return c.amountPerPayment * 4;
  return 0;
}

/* ─────────────────── aggregation ─────────────────────────── */
interface ExpenseItem {
  source: string;
  name: string;
  amount: number;
}

interface SubBreakdown {
  id: string;
  name: string;
  emoji: string;
  income: number;
  expense: number;
  incomeItems: ExpenseItem[];
  expenseItems: ExpenseItem[];
}

interface ProjectBreakdown {
  id: string;
  name: string;
  emoji: string;
  color: string;
  income: number;
  expense: number;
  subs: SubBreakdown[];
}

interface AggregatedData {
  projectBreakdowns: ProjectBreakdown[];
  totalOperationalIncome: number;
  totalOperationalExpense: number;
  totalLoanMonthly: number;
  totalLoanBalance: number;
  totalFixedExpenses: number;
  totalPersonalIncome: number;
  netCashFlow: number;
}

function aggregateBrand(brand: Brand, finData: FinancialData): AggregatedData {
  const projectBreakdowns: ProjectBreakdown[] = brand.projects.map((proj) => {
    const subs: SubBreakdown[] = proj.subProjects.map((sub) => {
      const incomeItems: ExpenseItem[] = [];
      const expenseItems: ExpenseItem[] = [];

      // sub-project direct incomes
      (sub.incomes ?? [])
        .filter((i) => i.frequency === "monthly")
        .forEach((i) =>
          incomeItems.push({ source: sub.name, name: i.name, amount: i.amount })
        );

      // sub-project direct expenses
      (sub.expenses ?? [])
        .filter((e) => e.frequency === "monthly")
        .forEach((e) =>
          expenseItems.push({ source: sub.name, name: e.name, amount: e.amount })
        );

      // sub-project commitments
      (sub.commitments ?? []).forEach((c) => {
        const cost = commitmentMonthlyCost(c);
        if (cost > 0)
          expenseItems.push({ source: sub.name, name: c.name, amount: cost });
      });

      // channels
      sub.channels.forEach((ch) => {
        (ch.incomes ?? [])
          .filter((i) => i.frequency === "monthly")
          .forEach((i) =>
            incomeItems.push({ source: ch.name, name: i.name, amount: i.amount })
          );

        (ch.expenses ?? [])
          .filter((e) => e.frequency === "monthly")
          .forEach((e) =>
            expenseItems.push({ source: ch.name, name: e.name, amount: e.amount })
          );

        // stage expenses inside channels
        ch.stages.forEach((st) => {
          (st.expenses ?? [])
            .filter((e) => e.frequency === "monthly")
            .forEach((e) =>
              expenseItems.push({
                source: `${ch.name} › ${st.name}`,
                name: e.name,
                amount: e.amount,
              })
            );
        });
      });

      const income = incomeItems.reduce((s, i) => s + i.amount, 0);
      const expense = expenseItems.reduce((s, e) => s + e.amount, 0);

      return {
        id: sub.id,
        name: sub.name,
        emoji: sub.emoji,
        income,
        expense,
        incomeItems,
        expenseItems,
      };
    });

    const income = subs.reduce((s, sub) => s + sub.income, 0);
    const expense = subs.reduce((s, sub) => s + sub.expense, 0);

    return { id: proj.id, name: proj.name, emoji: proj.emoji, color: proj.color, income, expense, subs };
  });

  const totalOperationalIncome = projectBreakdowns.reduce((s, p) => s + p.income, 0);
  const totalOperationalExpense = projectBreakdowns.reduce((s, p) => s + p.expense, 0);

  const activeLoans = finData.loans.filter(
    (l) => l.paidMonths < l.totalMonths
  );
  const totalLoanMonthly = activeLoans.reduce((s, l) => s + l.monthlyPayment, 0);
  const totalLoanBalance = activeLoans.reduce(
    (s, l) =>
      s +
      loanRemainingBalance(
        l.principal,
        l.annualRate ?? 0,
        l.monthlyPayment,
        l.paidMonths
      ),
    0
  );

  const totalFixedExpenses = finData.expenses
    .filter((e) => e.frequency === "monthly")
    .reduce((s, e) => s + e.amount, 0);

  const totalPersonalIncome = finData.incomes
    .filter((i) => i.frequency === "monthly")
    .reduce((s, i) => s + i.amount, 0);

  const netCashFlow =
    totalOperationalIncome +
    totalPersonalIncome -
    totalOperationalExpense -
    totalLoanMonthly -
    totalFixedExpenses;

  return {
    projectBreakdowns,
    totalOperationalIncome,
    totalOperationalExpense,
    totalLoanMonthly,
    totalLoanBalance,
    totalFixedExpenses,
    totalPersonalIncome,
    netCashFlow,
  };
}

/* ─────────────────── props ───────────────────────────────── */
interface Props {
  brand: Brand;
  onBack: () => void;
  onOpenLoansManager: () => void;
}

/* ─────────────────── sub-components ─────────────────────── */

function KpiCard({
  emoji,
  label,
  amount,
  colorClass,
  bgClass,
}: {
  emoji: string;
  label: string;
  amount: number;
  colorClass: string;
  bgClass: string;
}) {
  return (
    <div className={`rounded-2xl p-4 flex flex-col gap-1 shadow-sm border border-gray-100 ${bgClass}`}>
      <div className="text-xl">{emoji}</div>
      <div className="text-xs text-gray-500 font-medium">{label}</div>
      <div className={`text-lg font-bold ${colorClass}`}>{ils(amount)}</div>
    </div>
  );
}

function AccordionRow({
  emoji,
  name,
  color,
  badge,
  badgeColor,
  children,
}: {
  emoji: string;
  name: string;
  color: string;
  badge: string;
  badgeColor: string;
  children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden mb-2">
      <button
        className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
        onClick={() => setOpen((v) => !v)}
        style={{ direction: "rtl" }}
      >
        <span className="text-lg">{emoji}</span>
        <span
          className="text-sm font-semibold flex-1 text-right"
          style={{ color: color || "#374151" }}
        >
          {name}
        </span>
        <span
          className={`text-xs font-bold px-2 py-0.5 rounded-full ${badgeColor}`}
        >
          {badge}
        </span>
        <span
          className="text-gray-400 text-xs transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ‹
        </span>
      </button>
      {open && (
        <div className="px-4 pb-3 pt-1 bg-gray-50 border-t border-gray-100">
          {children}
        </div>
      )}
    </div>
  );
}

function SubRow({
  sub,
  mode,
}: {
  sub: SubBreakdown;
  mode: "income" | "expense";
}) {
  const [open, setOpen] = useState(false);
  const items = mode === "income" ? sub.incomeItems : sub.expenseItems;
  const total = mode === "income" ? sub.income : sub.expense;
  if (total === 0 && items.length === 0) return null;

  return (
    <div className="mb-2">
      <button
        className="w-full flex items-center gap-2 py-1.5 text-right"
        onClick={() => setOpen((v) => !v)}
        style={{ direction: "rtl" }}
      >
        <span className="text-base">{sub.emoji}</span>
        <span className="text-sm text-gray-700 flex-1">{sub.name}</span>
        <span
          className={`text-xs font-bold ${mode === "income" ? "text-emerald-600" : "text-rose-600"}`}
        >
          {ils(total)}
        </span>
        {items.length > 0 && (
          <span
            className="text-gray-400 text-xs transition-transform"
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
          >
            ‹
          </span>
        )}
      </button>
      {open && items.length > 0 && (
        <div className="mr-6 mt-1 space-y-1">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 text-xs text-gray-500"
              style={{ direction: "rtl" }}
            >
              <span className="flex-1 truncate">{item.name}</span>
              <span className="text-gray-400 text-[10px]">{item.source}</span>
              <span
                className={`font-semibold ${mode === "income" ? "text-emerald-500" : "text-rose-500"}`}
              >
                {ils(item.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function LoanRow({
  loan,
}: {
  loan: Loan;
}) {
  const progress =
    loan.totalMonths > 0
      ? Math.min(100, (loan.paidMonths / loan.totalMonths) * 100)
      : 0;
  const remaining = loanRemainingBalance(
    loan.principal,
    loan.annualRate ?? 0,
    loan.monthlyPayment,
    loan.paidMonths
  );
  const isActive = loan.paidMonths < loan.totalMonths;

  return (
    <div
      className="bg-white rounded-xl border border-gray-100 p-3 mb-2"
      style={{ direction: "rtl" }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-semibold text-gray-800 flex-1">
          {loan.name}
        </span>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isActive ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"}`}>
          {isActive ? `${ils(loan.monthlyPayment)}/חודש` : "שולם"}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
        <span>יתרה: <span className="font-semibold text-orange-600">{ils(remaining)}</span></span>
        <span>{loan.paidMonths}/{loan.totalMonths} חודשים</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5">
        <div
          className="bg-orange-400 h-1.5 rounded-full transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/* ─────────────────── main component ─────────────────────── */
export default function BrandFinancialSummary({
  brand,
  onBack,
  onOpenLoansManager,
}: Props) {
  const [financialData, setFinancialData] = useState<FinancialData>(
    () => loadFinancialData(brand.id)
  );

  useEffect(() => {
    loadFinancialFromCloud(brand.id).then(cloud => {
      if (cloud) setFinancialData(cloud);
    });
  }, [brand.id]);

  const data = useMemo(
    () => aggregateBrand(brand, financialData),
    [brand, financialData]
  );

  const totalIncome = data.totalOperationalIncome + data.totalPersonalIncome;
  const totalExpense =
    data.totalOperationalExpense +
    data.totalLoanMonthly +
    data.totalFixedExpenses;

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gray-50"
      style={{ fontFamily: "'Heebo', system-ui, sans-serif" }}
    >
      {/* sticky header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-2xl mx-auto flex items-center gap-3 px-4 py-3">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors bg-gray-100 hover:bg-gray-200 rounded-lg px-3 py-1.5"
          >
            <span>→</span>
            <span>חזרה</span>
          </button>
          <div className="flex-1 flex items-center gap-2">
            <span className="text-2xl">{brand.emoji}</span>
            <div>
              <div className="font-bold text-gray-900 text-sm leading-tight">
                {brand.name}
              </div>
              <div className="text-xs text-gray-500">סיכום פיננסי</div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-5 space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 gap-3">
          <KpiCard
            emoji="💚"
            label="הכנסות"
            amount={totalIncome}
            colorClass="text-emerald-600"
            bgClass="bg-emerald-50"
          />
          <KpiCard
            emoji="💸"
            label="הוצאות"
            amount={totalExpense}
            colorClass="text-rose-600"
            bgClass="bg-rose-50"
          />
          <KpiCard
            emoji="✨"
            label="תזרים נטו"
            amount={data.netCashFlow}
            colorClass={data.netCashFlow >= 0 ? "text-emerald-600" : "text-rose-600"}
            bgClass={data.netCashFlow >= 0 ? "bg-emerald-50" : "bg-rose-50"}
          />
          <KpiCard
            emoji="🔴"
            label="חוב כולל"
            amount={data.totalLoanBalance}
            colorClass="text-orange-600"
            bgClass="bg-orange-50"
          />
        </div>

        {/* Section 1: Incomes by project */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💚</span>
            <h2 className="text-base font-bold text-gray-800">הכנסות לפי מחלקה</h2>
            <span className="text-xs bg-emerald-100 text-emerald-600 font-bold px-2 py-0.5 rounded-full">
              {ils(data.totalOperationalIncome)}
            </span>
          </div>
          <div>
            {data.projectBreakdowns.map((proj) => (
              <AccordionRow
                key={proj.id}
                emoji={proj.emoji}
                name={proj.name}
                color={proj.color}
                badge={proj.income > 0 ? ils(proj.income) : "אין הכנסות"}
                badgeColor={
                  proj.income > 0
                    ? "bg-emerald-100 text-emerald-600"
                    : "bg-gray-100 text-gray-400"
                }
              >
                {proj.subs.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">אין תת-פרויקטים</p>
                ) : (
                  proj.subs.map((sub) => (
                    <SubRow key={sub.id} sub={sub} mode="income" />
                  ))
                )}
                {proj.income === 0 && (
                  <p className="text-xs text-gray-400 pt-1">אין הכנסות חודשיות</p>
                )}
              </AccordionRow>
            ))}
          </div>
        </section>

        {/* Section 2: Expenses by project */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">💸</span>
            <h2 className="text-base font-bold text-gray-800">הוצאות לפי מחלקה</h2>
            <span className="text-xs bg-rose-100 text-rose-600 font-bold px-2 py-0.5 rounded-full">
              {ils(data.totalOperationalExpense)}
            </span>
          </div>
          <div>
            {data.projectBreakdowns.map((proj) => (
              <AccordionRow
                key={proj.id}
                emoji={proj.emoji}
                name={proj.name}
                color={proj.color}
                badge={proj.expense > 0 ? ils(proj.expense) : "אין הוצאות"}
                badgeColor={
                  proj.expense > 0
                    ? "bg-rose-100 text-rose-600"
                    : "bg-gray-100 text-gray-400"
                }
              >
                {proj.subs.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">אין תת-פרויקטים</p>
                ) : (
                  proj.subs.map((sub) => (
                    <SubRow key={sub.id} sub={sub} mode="expense" />
                  ))
                )}
                {proj.expense === 0 && (
                  <p className="text-xs text-gray-400 pt-1">אין הוצאות חודשיות</p>
                )}
              </AccordionRow>
            ))}
          </div>
        </section>

        {/* Section 3: Loans */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">🏦</span>
              <h2 className="text-base font-bold text-gray-800">הלוואות ותשלומים</h2>
              {data.totalLoanMonthly > 0 && (
                <span className="text-xs bg-orange-100 text-orange-600 font-bold px-2 py-0.5 rounded-full">
                  {ils(data.totalLoanMonthly)}/חודש
                </span>
              )}
            </div>
            <button
              onClick={onOpenLoansManager}
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              ניהול הלוואות ←
            </button>
          </div>
          {financialData.loans.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center text-gray-400 text-sm">
              אין הלוואות רשומות
            </div>
          ) : (
            financialData.loans.map((loan) => (
              <LoanRow key={loan.id} loan={loan} />
            ))
          )}
          {data.totalLoanBalance > 0 && (
            <div
              className="flex items-center justify-between text-xs text-gray-500 mt-1 px-1"
              style={{ direction: "rtl" }}
            >
              <span>סה"כ יתרה</span>
              <span className="font-bold text-orange-600">
                {ils(data.totalLoanBalance)}
              </span>
            </div>
          )}
        </section>

        {/* Section 4: Fixed expenses */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">📋</span>
            <h2 className="text-base font-bold text-gray-800">הוצאות קבועות</h2>
            {data.totalFixedExpenses > 0 && (
              <span className="text-xs bg-purple-100 text-purple-600 font-bold px-2 py-0.5 rounded-full">
                {ils(data.totalFixedExpenses)}/חודש
              </span>
            )}
          </div>
          {financialData.expenses.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-100 p-4 text-center text-gray-400 text-sm">
              אין הוצאות קבועות רשומות
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {/* Monthly */}
              {financialData.expenses.filter((e) => e.frequency === "monthly")
                .length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-purple-50 border-b border-gray-100">
                    <span className="text-xs font-bold text-purple-600">
                      חודשי
                    </span>
                  </div>
                  {financialData.expenses
                    .filter((e) => e.frequency === "monthly")
                    .map((exp) => (
                      <div
                        key={exp.id}
                        className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0"
                        style={{ direction: "rtl" }}
                      >
                        <span className="text-sm text-gray-700 flex-1">
                          {exp.name}
                        </span>
                        <span className="text-sm font-semibold text-rose-600">
                          {ils(exp.amount)}
                        </span>
                      </div>
                    ))}
                </div>
              )}
              {/* Yearly */}
              {financialData.expenses.filter((e) => e.frequency === "yearly")
                .length > 0 && (
                <div>
                  <div className="px-4 py-2 bg-blue-50 border-b border-gray-100">
                    <span className="text-xs font-bold text-blue-500">שנתי</span>
                  </div>
                  {financialData.expenses
                    .filter((e) => e.frequency === "yearly")
                    .map((exp) => (
                      <div
                        key={exp.id}
                        className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0"
                        style={{ direction: "rtl" }}
                      >
                        <span className="text-sm text-gray-700 flex-1">
                          {exp.name}
                        </span>
                        <span className="text-sm font-semibold text-blue-500">
                          {ils(exp.amount)}/שנה
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Personal incomes summary */}
        {financialData.incomes.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-lg">👤</span>
              <h2 className="text-base font-bold text-gray-800">הכנסות אישיות</h2>
              {data.totalPersonalIncome > 0 && (
                <span className="text-xs bg-emerald-100 text-emerald-600 font-bold px-2 py-0.5 rounded-full">
                  {ils(data.totalPersonalIncome)}/חודש
                </span>
              )}
            </div>
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              {financialData.incomes.map((inc) => (
                <div
                  key={inc.id}
                  className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-50 last:border-0"
                  style={{ direction: "rtl" }}
                >
                  <span className="text-sm text-gray-700 flex-1">{inc.name}</span>
                  <span className="text-xs text-gray-400">
                    {inc.frequency === "monthly" ? "חודשי" : "חד-פעמי"}
                  </span>
                  <span className="text-sm font-semibold text-emerald-600">
                    {ils(inc.amount)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* bottom spacer */}
        <div className="h-8" />
      </div>
    </div>
  );
}
