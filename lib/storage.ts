import { Brand, Project, SubProject, Stage, FinancialData, Income } from "./types";
import { v4 as uuidv4 } from "uuid";

const KEY = "vaachalta_brands_v1";

const makeStage = (name: string, order: number): Stage => ({
  id: uuidv4(), name, step: "", goal: "", status: "todo",
  notes: "", nextAction: "", order,
});

const makeSubProject = (name: string, emoji: string, stageNames: string[], order: number): SubProject => ({
  id: uuidv4(), name, emoji, description: "",
  stages: stageNames.map((n, i) => makeStage(n, i)),
  channels: [],
  order,
});

const makeProject = (name: string, emoji: string, color: string, subs: SubProject[], order: number): Project => ({
  id: uuidv4(), name, emoji, color, description: "", subProjects: subs, order,
});

function buildSampleBrand(): Brand {
  return {
    id: uuidv4(),
    name: "ואכלת",
    emoji: "🍽️",
    color: "#f97316",
    description: "אפליקציית מסעדות כשרות",
    createdAt: new Date().toISOString(),
    projects: [
      makeProject("מסלול ל-100,000 משתמשים", "🚀", "#f97316", [
        makeSubProject("דאטה",  "🗄️", ["איסוף מסעדות", "ניקוי נתונים", "העלאה למערכת", "אימות איכות"], 0),
        makeSubProject("מוצר",  "📱", ["iOS live", "Android live", "חיפוש", "דפי מסעדות"], 1),
        makeSubProject("שיווק", "📢", ["בניית תוכן", "קמפיין ראשון", "אופטימיזציה", "סקייל"], 2),
      ], 0),
    ],
  };
}

export function loadBrands(): Brand[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      const initial = [buildSampleBrand()];
      localStorage.setItem(KEY, JSON.stringify(initial));
      return initial;
    }
    const parsed = JSON.parse(raw) as Brand[];
    return parsed.map(b => ({
      ...b,
      projects: (b.projects ?? []).map((p, pi) => ({
        ...p,
        color: p.color ?? "#f97316",
        order: p.order ?? pi,
        subProjects: (p.subProjects ?? []).map((sp, si) => ({
          ...sp,
          order: sp.order ?? si,
          stages: sp.stages ?? [],
          channels: (sp.channels ?? []).map((ch, ci) => ({
            ...ch,
            order: ch.order ?? ci,
            stages: ch.stages ?? [],
          })),
        })),
      })),
    }));
  } catch {
    return [];
  }
}

export function saveBrands(brands: Brand[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(brands));
}

export function createStage(order: number): Stage {
  return { id: uuidv4(), name: "", step: "", goal: "", status: "todo", notes: "", nextAction: "", order };
}

export function createSubProject(order: number): SubProject {
  return { id: uuidv4(), name: "", emoji: "📁", description: "", stages: [], channels: [], order };
}

export function createChannel(order: number): import("./types").Channel {
  return { id: uuidv4(), name: "", emoji: "📣", description: "", stages: [], order };
}

export function createProject(order: number): Project {
  return { id: uuidv4(), name: "", emoji: "🚀", color: "#f97316", description: "", subProjects: [], order };
}

/* ─── Financial Data ──────────────────────────────────── */

const FIN_KEY = "beseder_financial_v1";

function defaultFinancialData(): FinancialData {
  const uid = () => Math.random().toString(36).slice(2);
  return {
    loans: [
      { id: uid(), name: "רכב",             principal: 46600,  monthlyPayment: 1361.33, paidMonths: 3,  totalMonths: 36  },
      { id: uid(), name: "כאל מזרחי מורשה", principal: 50000,  monthlyPayment: 2272.78, paidMonths: 1,  totalMonths: 24  },
      { id: uid(), name: "מזרחי פרטי",      principal: 38000,  monthlyPayment: 820.66,  paidMonths: 4,  totalMonths: 60  },
      { id: uid(), name: "מזרחי עסקי",      principal: 115313, monthlyPayment: 2520.22, paidMonths: 3,  totalMonths: 60  },
      { id: uid(), name: "בנק פועלים",      principal: 110000, monthlyPayment: 1250.61, paidMonths: 15, totalMonths: 120 },
      { id: uid(), name: "כאל",             principal: 17500,  monthlyPayment: 1587.79, paidMonths: 0,  totalMonths: 12  },
      { id: uid(), name: "איתי מתכנת",      principal: 48020,  monthlyPayment: 1000,    paidMonths: 1,  totalMonths: 50  },
    ],
    expenses: [
      { id: uid(), name: "ביטוח מקף",      amount: 1547, frequency: "monthly" },
      { id: uid(), name: "שכירות",          amount: 5500, frequency: "monthly" },
      { id: uid(), name: "כרטיסי אשראי",   amount: 6000, frequency: "monthly" },
      { id: uid(), name: "שונות",           amount: 2000, frequency: "monthly" },
    ],
    incomes: [],
    properties: [
      {
        id: uid(),
        name: "דב יוסף 11, באר שבע",
        purchasePrice: 1000000,
        incomes: [
          { id: uid(), name: "מאשה (יחידה אמצעית)", amount: 2600 },
          { id: uid(), name: "הגר (יחידה תחתית)",   amount: 2500 },
          { id: uid(), name: "אגם (יחידה תחתית)",   amount: 2300 },
        ],
        expenses: [
          { id: uid(), name: "ארנונה", amount: 385,  frequency: "monthly" },
          { id: uid(), name: "חשמל",   amount: 335,  frequency: "monthly" },
        ],
        liabilities: [],
      },
      {
        id: uid(),
        name: "VIE קומה 12 (1125)",
        purchasePrice: 1357000,
        incomes: [],
        expenses: [],
        liabilities: [
          { id: uid(), name: "שרון - עורך דין",    totalDebt: 5900,    monthlyPayment: 2950, paidSoFar: 14160 },
          { id: uid(), name: "ישראל - משכנתא",    totalDebt: 1180,    monthlyPayment: 1180, paidSoFar: 1180  },
          { id: uid(), name: "בנימין סבג - תיווך", totalDebt: 50740,   monthlyPayment: 0,    paidSoFar: 0     },
          { id: uid(), name: "שלום גבאי - יזם",   totalDebt: 784700,  monthlyPayment: 0,    paidSoFar: 0     },
          { id: uid(), name: "בלדי - קבלן",        totalDebt: 469000,  monthlyPayment: 3300, paidSoFar: 35400 },
          { id: uid(), name: "מס רכישה",           totalDebt: 27303,   monthlyPayment: 0,    paidSoFar: 0     },
        ],
      },
      {
        id: uid(),
        name: "VIE קומה 11 (1222)",
        purchasePrice: 1062000,
        incomes: [],
        expenses: [],
        liabilities: [
          { id: uid(), name: "שלום גבאי - יזם", totalDebt: 445000, monthlyPayment: 0,    paidSoFar: 0     },
          { id: uid(), name: "בלדי - קבלן",      totalDebt: 549100, monthlyPayment: 3300, paidSoFar: 67900 },
          { id: uid(), name: "מס רכישה",         totalDebt: 27303,  monthlyPayment: 0,    paidSoFar: 0     },
        ],
      },
    ],
  };
}

export function loadFinancialData(): FinancialData {
  if (typeof window === "undefined") return defaultFinancialData();
  try {
    const raw = localStorage.getItem(FIN_KEY);
    if (!raw) {
      const d = defaultFinancialData();
      localStorage.setItem(FIN_KEY, JSON.stringify(d));
      return d;
    }
    const parsed = JSON.parse(raw) as FinancialData;
    return { ...parsed, incomes: parsed.incomes ?? [] };
  } catch { return defaultFinancialData(); }
}

export function saveFinancialData(data: FinancialData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FIN_KEY, JSON.stringify(data));
}
