import { Brand, Project, SubProject, Stage, FinancialData } from "./types";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "./supabase";

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
    if (!raw) return [];
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
  (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_data").upsert(
      { user_id: user.id, brands, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  })();
}

export async function loadBrandsFromCloud(): Promise<Brand[] | null> {
  try {
    const { data, error } = await supabase.from("user_data").select("brands").single();
    if (error || !data) return null;
    return data.brands as Brand[];
  } catch { return null; }
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
  return { loans: [], expenses: [], incomes: [], properties: [] };
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

export function saveFinancialData(financial: FinancialData): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FIN_KEY, JSON.stringify(financial));
  (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("user_data").upsert(
      { user_id: user.id, financial, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  })();
}

export async function loadFinancialFromCloud(): Promise<FinancialData | null> {
  try {
    const { data, error } = await supabase.from("user_data").select("financial").single();
    if (error || !data || !data.financial) return null;
    const parsed = data.financial as FinancialData;
    return { ...parsed, incomes: parsed.incomes ?? [] };
  } catch { return null; }
}
