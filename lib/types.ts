export type StageStatus = "todo" | "active" | "done" | "blocked";

export interface StageExpense {
  id: string;
  name: string;
  amount: number;
  date?: string;
}

export interface Stage {
  id: string;
  name: string;
  step: string;
  goal: string;
  status: StageStatus;
  notes: string;
  nextAction: string;
  order: number;
  expenses?: StageExpense[];
}

export interface Channel {
  id: string;
  name: string;
  emoji: string;
  description: string;
  stages: Stage[];
  order: number;
  expenses?: StageExpense[];
  incomes?: StageExpense[];
}

export interface SubProject {
  id: string;
  name: string;
  emoji: string;
  description: string;
  stages: Stage[];
  channels: Channel[];
  order: number;
  expenses?: StageExpense[];
  incomes?: StageExpense[];
}

export interface Project {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  subProjects: SubProject[];
  order: number;
}

export interface Brand {
  id: string;
  name: string;
  emoji: string;
  color: string;
  description: string;
  logo?: string;
  projects: Project[];
  createdAt: string;
}

export interface Loan {
  id: string;
  name: string;
  principal: number;
  monthlyPayment: number;
  paidMonths: number;
  totalMonths: number;
  notes?: string;
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'yearly';
}

export interface PropertyIncome {
  id: string;
  name: string;
  amount: number;
}

export interface PropertyLiability {
  id: string;
  name: string;
  totalDebt: number;
  monthlyPayment: number;
  paidSoFar: number;
}

export interface Property {
  id: string;
  name: string;
  purchasePrice: number;
  incomes: PropertyIncome[];
  expenses: FixedExpense[];
  liabilities: PropertyLiability[];
}

export interface Income {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'one-time';
}

export interface FinancialData {
  loans: Loan[];
  expenses: FixedExpense[];
  incomes: Income[];
  properties: Property[];
  asOfDate?: string;
}
