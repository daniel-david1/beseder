export type StageStatus = "todo" | "active" | "done" | "blocked";

export interface StageExpense {
  id: string;
  name: string;
  amount: number;
  date?: string;
  frequency?: 'monthly' | 'yearly' | 'one-time';
  category?: 'personal' | 'business';
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

export interface CommitmentPayment {
  id: string;
  dueDate?: string;
  paid: boolean;
  invoiceDataUrl?: string;
  invoiceName?: string;
}

export interface PaymentCommitment {
  id: string;
  name: string;
  amountPerPayment: number;
  totalPayments: number;
  frequency: 'monthly' | 'weekly' | 'milestone';
  startDate?: string;
  notes?: string;
  payments: CommitmentPayment[];
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
  commitments?: PaymentCommitment[];
}

export interface BrandGoal {
  id: string;
  text: string;
  emoji: string;
  status: 'on-track' | 'at-risk' | 'done';
  deadline?: string;
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
  goals?: BrandGoal[];
  createdAt: string;
  hidden?: boolean;
}

export interface Loan {
  id: string;
  name: string;
  principal: number;
  annualRate?: number;      // annual interest rate in %, e.g. 4.5 means 4.5%
  monthlyPayment: number;
  manualPayment?: boolean;  // true = user manually set the payment (not auto-calculated)
  paidMonths: number;
  totalMonths: number;
  startDate?: string;       // YYYY-MM-DD (first payment / loan start)
  endDate?: string;         // YYYY-MM-DD (last payment / loan end)
  manualDates?: boolean;    // true = user overrode the auto-calculated months
  notes?: string;
  paymentDayOfMonth?: number; // day of month for recurring payment (1-31)
}

export interface FixedExpense {
  id: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'yearly';
  category?: 'personal' | 'business';
}

export interface PropertyIncome {
  id: string;
  name: string;
  amount: number;
}

export interface PropertyLiability {
  id: string;
  name: string;
  totalDebt: number;        // original principal / total debt
  monthlyPayment: number;
  paidSoFar: number;        // legacy: total ₪ paid (kept for backward compat)
  paidMonths?: number;      // number of payments made (replaces paidSoFar as primary)
  annualRate?: number;      // interest rate % (optional, for mortgage accuracy)
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
  category?: 'personal' | 'business';
}

export interface FinancialData {
  loans: Loan[];
  expenses: FixedExpense[];
  incomes: Income[];
  properties: Property[];
  asOfDate?: string;
}

export interface DailyTask {
  id: string;
  text: string;
  status: 'todo' | 'in-progress' | 'done';
  createdDate: string;
}

export interface MonthlySnapshot {
  id: string;
  yearMonth: string;           // "2025-12"
  savedAt: string;             // ISO timestamp
  // Auto-captured
  tasksTotal: number;
  tasksDone: number;
  stagesCompleted: number;     // across all brands
  stagesTotal: number;
  brandData: {
    brandId: string;
    brandName: string;
    brandEmoji: string;
    stagesCompleted: number;
    stagesTotal: number;
  }[];
  // Manual financial fields
  revenue: number;
  expenses: number;
  // Manual reflection
  highlights: string;          // מה עבד הכי טוב
  challenges: string;          // מה היה קשה
  mainAchievement: string;     // ההישג הגדול
  nextMonthFocus: string;      // פוקוס לחודש הבא
  mood: 1 | 2 | 3 | 4 | 5;
}
