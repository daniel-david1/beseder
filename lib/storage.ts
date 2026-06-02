import { Brand, Project, SubProject, Stage, FinancialData, DailyTask } from "./types";
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

const FIN_KEY_LEGACY = "beseder_financial_v1";

function finKey(brandId: string) { return `beseder_financial_${brandId}`; }

function defaultFinancialData(): FinancialData {
  return { loans: [], expenses: [], incomes: [], properties: [] };
}

export function loadFinancialData(brandId: string): FinancialData {
  if (typeof window === "undefined") return defaultFinancialData();
  try {
    const brandRaw = localStorage.getItem(finKey(brandId));
    if (brandRaw) {
      const parsed = JSON.parse(brandRaw) as FinancialData;
      return { ...parsed, incomes: parsed.incomes ?? [] };
    }
    // First time for this brand — migrate from legacy global key once, then remove it
    // so subsequent new brands don't inherit the data
    const legacyRaw = localStorage.getItem(FIN_KEY_LEGACY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw) as FinancialData;
      const d = { ...parsed, incomes: parsed.incomes ?? [] };
      localStorage.setItem(finKey(brandId), JSON.stringify(d));
      localStorage.removeItem(FIN_KEY_LEGACY);
      return d;
    }
    return defaultFinancialData();
  } catch { return defaultFinancialData(); }
}

export function saveFinancialData(financial: FinancialData, brandId?: string): void {
  if (typeof window === "undefined") return;
  const key = brandId ? finKey(brandId) : FIN_KEY_LEGACY;
  localStorage.setItem(key, JSON.stringify(financial));
  (async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    // Store per-brand in a financial_brands map inside the financial column
    const { data: existing } = await supabase.from("user_data").select("financial").eq("user_id", user.id).single();
    const existingFin = (existing?.financial as Record<string, unknown>) ?? {};
    const currentMap: Record<string, FinancialData> = (existingFin.brands as Record<string, FinancialData>) ?? {};
    const brandKey = brandId ?? "legacy";
    const updatedMap = { ...currentMap, [brandKey]: financial };
    // Spread existing keys (e.g. daily_tasks) so they're not overwritten
    await supabase.from("user_data").upsert(
      { user_id: user.id, financial: { ...existingFin, brands: updatedMap }, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
  })();
}

/** Fixed UUID of the personal-finance brand — same constant as in dashboard/page.tsx */
const PERSONAL_FINANCE_BRAND_ID = "f5645d60-7c07-47d0-b863-59be62f112aa";

export async function loadFinancialFromCloud(brandId?: string): Promise<FinancialData | null> {
  try {
    const { data, error } = await supabase.from("user_data").select("financial").single();
    if (error || !data || !data.financial) return null;
    const fin = data.financial as Record<string, unknown>;
    // New per-brand format
    if (fin.brands && brandId) {
      const map = fin.brands as Record<string, FinancialData>;
      // Try exact brandId, then the fixed personal-finance UUID as fallback,
      // then "legacy" — this ensures mobile syncs even if brands haven't loaded yet.
      const parsed = map[brandId] ?? map[PERSONAL_FINANCE_BRAND_ID] ?? map["legacy"];
      if (!parsed) return null;
      return { ...parsed, incomes: parsed.incomes ?? [] };
    }
    // Legacy flat format (old single-brand data)
    if ("loans" in fin) {
      const parsed = fin as unknown as FinancialData;
      return { ...parsed, incomes: parsed.incomes ?? [] };
    }
    return null;
  } catch { return null; }
}

/* ─── Daily Tasks ─────────────────────────────────────── */

export function saveDailyTasks(dateStr: string, tasks: DailyTask[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(`DAILY_TASKS_${dateStr}`, JSON.stringify(tasks));
  (async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      // Load current financial blob, merge daily_tasks into it
      const { data: existing } = await supabase
        .from("user_data")
        .select("financial")
        .eq("user_id", user.id)
        .single();
      const currentFin = (existing?.financial as Record<string, unknown>) ?? {};
      const currentDailyTasks = (currentFin.daily_tasks as Record<string, DailyTask[]>) ?? {};
      const updatedDailyTasks = { ...currentDailyTasks, [dateStr]: tasks };
      const updatedFin = { ...currentFin, daily_tasks: updatedDailyTasks };
      await supabase.from("user_data").upsert(
        { user_id: user.id, financial: updatedFin, updated_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    } catch { /* silent */ }
  })();
}

export async function loadDailyTasksFromCloud(dateStr: string): Promise<DailyTask[] | null> {
  try {
    const { data, error } = await supabase.from("user_data").select("financial").single();
    if (error || !data || !data.financial) return null;
    const fin = data.financial as Record<string, unknown>;
    const dailyTasks = fin.daily_tasks as Record<string, DailyTask[]> | undefined;
    if (!dailyTasks || !dailyTasks[dateStr]) return null;
    return dailyTasks[dateStr];
  } catch { return null; }
}
