"use client";

import { useState, useEffect, useRef } from "react";
import { Brand, BrandGoal, Project, SubProject, Channel, Stage, StageStatus, FinancialData, DailyTask, MonthlySnapshot } from "@/lib/types";
import { loadBrands, saveBrands, createStage, loadBrandsFromCloud, saveFinancialData, saveDailyTasks, loadDailyTasksFromCloud, saveMonthlySnapshot, loadMonthlySnapshot, loadAllMonthlySnapshots, loadMonthlySnapshotsFromCloud } from "@/lib/storage";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import ProjectPipeline from "@/components/ProjectPipeline";
import StageEditDrawer from "@/components/StageEditDrawer";
import BrandWizard from "@/components/BrandWizard";
import NewProjectModal from "@/components/NewProjectModal";
import SubProjectModal from "@/components/SubProjectModal";
import ChannelModal from "@/components/ChannelModal";
import FinancialDashboard from "@/components/FinancialDashboard";
import BrandFinancialSummary from "@/components/BrandFinancialSummary";
import { HebrewDateInput } from "@/components/HebrewDateInput";
import WhiteboardBuilder from "@/components/WhiteboardBuilder";

/* ─── Brand health ────────────────────────────────────── */
interface BrandHealth {
  level: "critical" | "attention" | "good" | "empty";
  blockedCount: number;
  activeCount: number;
  noNextActionCount: number;
  topNextAction: string | null;
  topNextActionStage: string | null;
}

function getBrandHealth(brand: Brand): BrandHealth {
  // Collect all stages with context
  const allStages: { stage: Stage; stageName: string }[] = [];
  for (const project of brand.projects) {
    for (const sub of project.subProjects) {
      for (const stage of sub.stages) {
        allStages.push({ stage, stageName: stage.name });
      }
      for (const channel of sub.channels) {
        for (const stage of channel.stages) {
          allStages.push({ stage, stageName: stage.name });
        }
      }
    }
  }

  if (allStages.length === 0) {
    return { level: "empty", blockedCount: 0, activeCount: 0, noNextActionCount: 0, topNextAction: null, topNextActionStage: null };
  }

  const blockedCount = allStages.filter(({ stage }) => stage.status === "blocked").length;
  const activeCount  = allStages.filter(({ stage }) => stage.status === "active").length;
  const nonDone      = allStages.filter(({ stage }) => stage.status !== "done");
  const noNextActionCount = nonDone.filter(({ stage }) => !stage.nextAction?.trim()).length;

  let level: BrandHealth["level"] = "good";
  if (blockedCount > 0) level = "critical";
  else if (noNextActionCount > 2) level = "attention";

  // topNextAction: blocked with nextAction first, then active, then any non-done
  const findTop = (items: typeof allStages) => items.find(({ stage }) => stage.nextAction?.trim());
  const blocked = allStages.filter(({ stage }) => stage.status === "blocked");
  const active  = allStages.filter(({ stage }) => stage.status === "active");
  const top = findTop(blocked) ?? findTop(active) ?? findTop(nonDone) ?? null;

  return {
    level,
    blockedCount,
    activeCount,
    noNextActionCount,
    topNextAction: top?.stage.nextAction?.trim() ?? null,
    topNextActionStage: top?.stageName ?? null,
  };
}

const HEALTH_COLORS: Record<BrandHealth["level"], string> = {
  critical:  "#dc2626",
  attention: "#d97706",
  good:      "#16a34a",
  empty:     "#9ca3af",
};

/* ─── Background themes (like Gmail) ─────────────────── */
const BG_THEME_KEY = "beseder_bg_theme_v1";

interface BgTheme {
  id: string;
  label: string;
  preview: string; // CSS value for the swatch
  bgColor: string; // body backgroundColor
  bgImage?: string;
  bgSize?: string;
}

const BG_THEMES: BgTheme[] = [
  // ── בסיסי ──
  { id: "default",        label: "ברירת מחדל",   preview: "#f8fafc",  bgColor: "#f8fafc" },
  { id: "warm",           label: "קרם",           preview: "#fef9f0",  bgColor: "#fef9f0" },
  { id: "mint",           label: "מנטה",          preview: "#f0fdf4",  bgColor: "#f0fdf4" },
  { id: "lavender",       label: "לבנדר",         preview: "#faf5ff",  bgColor: "#faf5ff" },
  { id: "sky",            label: "שמיים",         preview: "#f0f9ff",  bgColor: "#f0f9ff" },
  { id: "rose",           label: "ורוד",          preview: "#fff1f2",  bgColor: "#fff1f2" },
  { id: "peach",          label: "אפרסק",         preview: "#fff7ed",  bgColor: "#fff7ed" },
  { id: "slate",          label: "אבן",           preview: "#f1f5f9",  bgColor: "#f1f5f9" },
  // ── כהה ──
  { id: "charcoal",       label: "פחם",           preview: "#1e2130",  bgColor: "#1e2130" },
  { id: "dark-navy",      label: "לילה",          preview: "#0f172a",  bgColor: "#0f172a" },
  { id: "dark-green",     label: "יער לילי",      preview: "#052e16",  bgColor: "#052e16" },
  { id: "dark-wine",      label: "יין",           preview: "#3b0764",  bgColor: "#3b0764" },
  // ── גרדיאנטים ──
  { id: "sunrise",        label: "זריחה",         preview: "linear-gradient(135deg,#fff7ed,#fef3c7)", bgColor: "#fff7ed", bgImage: "linear-gradient(135deg,#fff7ed 0%,#fef3c7 60%,#fefce8 100%)" },
  { id: "ocean-light",    label: "אוקיינוס",      preview: "linear-gradient(135deg,#f0f9ff,#e0f2fe)", bgColor: "#f0f9ff", bgImage: "linear-gradient(160deg,#f0f9ff 0%,#e0f2fe 45%,#ecfdf5 100%)" },
  { id: "dusk",           label: "שקיעה",         preview: "linear-gradient(135deg,#312e81,#4c1d95)", bgColor: "#1e1b4b", bgImage: "linear-gradient(160deg,#1e1b4b 0%,#312e81 50%,#4c1d95 100%)" },
  { id: "cherry",         label: "פריחה",         preview: "linear-gradient(135deg,#fce4ec,#f48fb1)", bgColor: "#fce4ec", bgImage: "linear-gradient(135deg,#fce4ec 0%,#f8bbd0 45%,#f48fb1 100%)" },
  // ── נוף / טבע ──
  { id: "deep-sea",       label: "עמק הים",       preview: "linear-gradient(180deg,#006064,#00acc1)", bgColor: "#004d40", bgImage: "radial-gradient(ellipse at 50% -10%,#00acc1 0%,#00838f 35%,#006064 65%,#004d40 100%)" },
  { id: "sunset-coast",   label: "שקיעת חוף",    preview: "linear-gradient(180deg,#ff8f00,#ad1457)", bgColor: "#1a237e", bgImage: "linear-gradient(180deg,#ff8f00 0%,#e64a19 25%,#ad1457 55%,#4a148c 80%,#1a237e 100%)" },
  { id: "northern-lights",label: "זוהר צפוני",   preview: "linear-gradient(135deg,#004d40,#283593)", bgColor: "#004d40", bgImage: "linear-gradient(135deg,#004d40 0%,#00695c 28%,#1565c0 55%,#4527a0 80%,#004d40 100%)" },
  { id: "mountain-dawn",  label: "הרי שחר",      preview: "linear-gradient(180deg,#1a237e,#c5cae9)", bgColor: "#1a237e", bgImage: "linear-gradient(180deg,#1a237e 0%,#283593 20%,#5c6bc0 55%,#c5cae9 82%,#eceff1 100%)" },
  { id: "desert-dusk",    label: "מדבר שקיעה",   preview: "linear-gradient(180deg,#bf360c,#ffd54f)", bgColor: "#bf360c", bgImage: "linear-gradient(180deg,#bf360c 0%,#e65100 28%,#f57c00 58%,#ffd54f 85%,#fff8e1 100%)" },
  { id: "rainy-city",     label: "עיר גשומה",    preview: "linear-gradient(180deg,#263238,#546e7a)", bgColor: "#1c2833", bgImage: "linear-gradient(180deg,#1c2833 0%,#263238 40%,#37474f 70%,#546e7a 100%)" },
  { id: "galaxy",         label: "גלקסיה",       preview: "linear-gradient(135deg,#0a0a2e,#7c4dff40)", bgColor: "#0a0a2e", bgImage: "radial-gradient(ellipse at 20% 30%,#3f51b540 0%,transparent 50%),radial-gradient(ellipse at 80% 70%,#7c4dff30 0%,transparent 50%),linear-gradient(135deg,#0a0a2e 0%,#16213e 100%)" },
  // ── דוגמאות ──
  { id: "dots",           label: "נקודות",       preview: "#f1f5f9",  bgColor: "#f1f5f9", bgImage: "radial-gradient(circle,rgba(0,0,0,0.07) 1px,transparent 1px)", bgSize: "24px 24px" },
  { id: "grid",           label: "גריד",         preview: "#f8fafc",  bgColor: "#f8fafc", bgImage: "linear-gradient(rgba(0,0,0,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.055) 1px,transparent 1px)", bgSize: "22px 22px" },
  { id: "dots-dark",      label: "נקודות כהות",  preview: "#1e2130",  bgColor: "#1e2130", bgImage: "radial-gradient(circle,rgba(255,255,255,0.07) 1px,transparent 1px)", bgSize: "24px 24px" },
];

function applyBgTheme(theme: BgTheme) {
  if (typeof document === "undefined") return;
  document.body.style.backgroundColor  = theme.bgColor;
  document.body.style.backgroundImage  = theme.bgImage ?? "";
  document.body.style.backgroundSize   = theme.bgSize ?? "";
  document.body.style.backgroundAttachment = "fixed";
  document.body.style.minHeight = "100vh";
}

/* ─── Morning Panel ───────────────────────────────────── */
const DAILY_GOAL_KEY = "beseder_daily_goal_v1";

function MorningPanel({ brands, userEmail, onBrandClick }: {
  brands: Brand[];
  userEmail: string;
  onBrandClick: (brand: Brand) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [tasks, setTasks]         = useState<DailyTask[]>([]);
  const [newTaskInput, setNewTaskInput] = useState("");
  const firstName = userEmail.split("@")[0] ?? "שלום";
  const todayStr  = new Date().toISOString().slice(0, 10);
  const hebrewDate = new Date().toLocaleDateString("he-IL", { weekday: "long", day: "numeric", month: "long" });

  // Load tasks: localStorage first (instant), then cloud (sync across devices)
  useEffect(() => {
    // Step 1: load from localStorage immediately
    try {
      const raw = localStorage.getItem(`DAILY_TASKS_${todayStr}`);
      if (raw) {
        const parsed = JSON.parse(raw) as DailyTask[];
        setTasks(Array.isArray(parsed) ? parsed : []);
      } else {
        setTasks([]);
      }
    } catch {
      setTasks([]);
    }
    // Step 2: load from cloud and prefer it if more up-to-date
    loadDailyTasksFromCloud(todayStr).then(cloudTasks => {
      if (!cloudTasks) return;
      // Cloud has data — write to localStorage and use it
      localStorage.setItem(`DAILY_TASKS_${todayStr}`, JSON.stringify(cloudTasks));
      setTasks(cloudTasks);
    }).catch(() => { /* silent */ });
  }, [todayStr]);

  // Save tasks to localStorage + cloud
  const saveTasks = (updatedTasks: DailyTask[]) => {
    setTasks(updatedTasks);
    saveDailyTasks(todayStr, updatedTasks);
  };

  const handleAddTask = () => {
    const trimmed = newTaskInput.trim();
    if (!trimmed) return;
    const newTask: DailyTask = {
      id: Math.random().toString(36).slice(2, 11),
      text: trimmed,
      status: 'todo',
      createdDate: todayStr,
    };
    saveTasks([...tasks, newTask]);
    setNewTaskInput("");
  };

  const handleToggleStatus = (taskId: string) => {
    const updated = tasks.map(t => {
      if (t.id !== taskId) return t;
      const statuses: DailyTask['status'][] = ['todo', 'in-progress', 'done'];
      const currentIndex = statuses.indexOf(t.status);
      const nextStatus = statuses[(currentIndex + 1) % statuses.length];
      return { ...t, status: nextStatus };
    });
    saveTasks(updated);
  };

  const handleDeleteTask = (taskId: string) => {
    if (!confirm("למחוק את המשימה?")) return;
    saveTasks(tasks.filter(t => t.id !== taskId));
  };

  // Filter out financial dashboards (emoji 💰), sort by urgency
  const levelOrder: Record<BrandHealth["level"], number> = { critical: 0, attention: 1, good: 2, empty: 3 };
  const priorityBrands = brands
    .filter(b => b.emoji !== "💰")
    .map(b => ({ brand: b, health: getBrandHealth(b) }))
    .sort((a, b) => levelOrder[a.health.level] - levelOrder[b.health.level])
    .slice(0, 3);

  return (
    <div className="card rounded-2xl shadow-sm mb-6 overflow-hidden">
      {/* Header */}
      <div
        className="flex items-center justify-between px-5 py-4 cursor-pointer select-none"
        style={{ background: "linear-gradient(135deg, #f5fbfc 0%, #f0f7fa 100%)", borderBottom: collapsed ? "none" : "1px solid #eef2f6" }}
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">☀️</span>
          <div>
            <h2 className="font-bold text-gray-900 text-base leading-tight">בוקר טוב, {firstName}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{hebrewDate}</p>
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-700 transition-colors text-lg px-2" aria-label="collapse">
          {collapsed ? "▼" : "▲"}
        </button>
      </div>

      {!collapsed && (
        <div className="px-5 py-4 space-y-5">
          {/* Daily Tasks */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-3">📋 משימות היום</p>

            {/* Task list */}
            {tasks.length > 0 && (
              <div className="space-y-2 mb-3">
                {tasks.map(task => {
                  const statusColors = {
                    'todo': { bg: '#fef3c7', border: '#fcd34d', text: '#92400e', icon: '○' },
                    'in-progress': { bg: '#dbeafe', border: '#93c5fd', text: '#1d4ed8', icon: '◐' },
                    'done': { bg: '#f0fdf4', border: '#86efac', text: '#166534', icon: '✓' },
                  };
                  const color = statusColors[task.status];
                  return (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 p-3 rounded-xl transition-all"
                      style={{ background: color.bg, border: `1.5px solid ${color.border}` }}
                    >
                      {/* Status toggle — large touch target */}
                      <button
                        onClick={() => handleToggleStatus(task.id)}
                        className="icon-btn w-9 h-9 rounded-xl shrink-0 transition-transform active:scale-95 text-base font-bold"
                        style={{ color: color.text, background: color.border + "80" }}
                        title={`סטטוס: ${task.status}`}
                      >
                        {color.icon}
                      </button>
                      <p className={`flex-1 text-sm font-medium leading-snug ${
                        task.status === 'done' ? 'line-through text-gray-400' : ''
                      }`} style={{ color: task.status === 'done' ? '#9ca3af' : color.text }}>
                        {task.text}
                      </p>
                      {/* Delete — always visible on mobile */}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        className="icon-btn w-9 h-9 rounded-xl font-bold text-base shrink-0 transition-all hover:opacity-80 active:scale-95"
                        style={{ background: color.border, color: color.text }}
                        aria-label="מחק משימה"
                      >
                        ×
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add task input */}
            <div className="flex gap-2">
              <input
                className="input flex-1 text-sm"
                placeholder="הוסף משימה חדשה..."
                value={newTaskInput}
                onChange={e => setNewTaskInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === "Enter") handleAddTask();
                }}
              />
              <button
                onClick={handleAddTask}
                disabled={!newTaskInput.trim()}
                className="btn btn-orange text-sm px-4 shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                + הוסף
              </button>
            </div>

            {/* Summary */}
            {tasks.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 text-xs text-gray-500">
                <span className="font-semibold">סה״כ:</span>
                {' '}
                <span className="text-yellow-700">● {tasks.filter(t => t.status === 'todo').length} חדשות</span>
                {' · '}
                <span className="text-blue-700">◐ {tasks.filter(t => t.status === 'in-progress').length} בתהליך</span>
                {' · '}
                <span className="text-green-700">✓ {tasks.filter(t => t.status === 'done').length} בוצע</span>
              </div>
            )}
          </div>

          {/* Priority brands */}
          {priorityBrands.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">פוקוס מומלץ</p>
              <div className="space-y-2">
                {priorityBrands.map(({ brand, health }) => (
                  <button
                    key={brand.id}
                    onClick={() => onBrandClick(brand)}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-right group"
                  >
                    {/* Colored dot */}
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: HEALTH_COLORS[health.level] }} />

                    {/* Brand name */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-800 text-sm">{brand.emoji} {brand.name}</span>
                        {health.blockedCount > 0 && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#fee2e2", color: "#dc2626" }}>
                            {health.blockedCount} תקוע
                          </span>
                        )}
                        {health.activeCount > 0 && (
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                            {health.activeCount} בתהליך
                          </span>
                        )}
                      </div>
                      {health.level === "empty" ? (
                        <p className="text-xs text-gray-400 mt-0.5">אין משימות — בוא נקים</p>
                      ) : (
                        <>
                          {health.noNextActionCount > 0 && (
                            <p className="text-xs text-gray-400 mt-0.5">{health.noNextActionCount} משימות ללא פעולה הבאה</p>
                          )}
                          {health.topNextAction && (
                            <p className="text-xs text-gray-500 mt-0.5 truncate">→ {health.topNextAction}</p>
                          )}
                        </>
                      )}
                    </div>

                    {/* Right arrow (RTL: far left visually) */}
                    <span className="text-gray-300 group-hover:text-gray-500 transition-colors shrink-0">←</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Brand Setup Wizard ──────────────────────────────── */
interface SetupStageItem {
  stage: Stage;
  projectName: string;
  subName: string;
  /** Mutate path: projectId → subProjectId → (channelId | null) → stageId */
  path: { projectId: string; subId: string; channelId: string | null };
}

function BrandSetupWizard({ brand, onClose, onSave }: {
  brand: Brand;
  onClose: () => void;
  onSave: (brand: Brand) => void;
}) {
  // Collect all stages without nextAction
  const stageItems: SetupStageItem[] = [];
  for (const project of brand.projects) {
    for (const sub of project.subProjects) {
      for (const stage of sub.stages) {
        if (stage.status !== "done" && !stage.nextAction?.trim()) {
          stageItems.push({ stage, projectName: project.name, subName: sub.name, path: { projectId: project.id, subId: sub.id, channelId: null } });
        }
      }
      for (const channel of sub.channels) {
        for (const stage of channel.stages) {
          if (stage.status !== "done" && !stage.nextAction?.trim()) {
            stageItems.push({ stage, projectName: `${project.name} / ${channel.name}`, subName: sub.name, path: { projectId: project.id, subId: sub.id, channelId: channel.id } });
          }
        }
      }
    }
  }

  const [currentIdx, setCurrentIdx] = useState(0);
  const [nextActions, setNextActions] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {};
    for (const item of stageItems) m[item.stage.id] = item.stage.nextAction ?? "";
    return m;
  });
  const [done, setDone] = useState(false);
  const [filledCount, setFilledCount] = useState(0);

  if (stageItems.length === 0) {
    return (
      <div className="modal-bg" onClick={onClose}>
        <div className="modal p-5 sm:p-7" onClick={e => e.stopPropagation()}>
          <div className="text-center py-10">
            <div className="text-4xl mb-3">🎉</div>
            <h2 className="font-black text-gray-900 text-xl mb-2">כל המשימות מוגדרות!</h2>
            <p className="text-gray-400 mb-5">אין משימות ללא פעולה הבאה</p>
            <button onClick={onClose} className="btn btn-orange">סגור</button>
          </div>
        </div>
      </div>
    );
  }

  const current = stageItems[currentIdx];
  const total   = stageItems.length;

  const applyAndMove = (skip: boolean) => {
    if (!skip) {
      const val = nextActions[current.stage.id]?.trim();
      if (val) setFilledCount(c => c + 1);
    }
    if (currentIdx + 1 >= total) {
      // Build updated brand
      const val = nextActions[current.stage.id]?.trim() ?? "";
      const updatedBrand: Brand = JSON.parse(JSON.stringify(brand));
      for (const item of stageItems) {
        const na = nextActions[item.stage.id]?.trim() ?? "";
        if (!na) continue;
        const proj = updatedBrand.projects.find(p => p.id === item.path.projectId);
        if (!proj) continue;
        const sub = proj.subProjects.find(s => s.id === item.path.subId);
        if (!sub) continue;
        if (item.path.channelId) {
          const ch = sub.channels.find(c => c.id === item.path.channelId);
          if (ch) {
            const st = ch.stages.find(s => s.id === item.stage.id);
            if (st) st.nextAction = na;
          }
        } else {
          const st = sub.stages.find(s => s.id === item.stage.id);
          if (st) st.nextAction = na;
        }
      }
      void val; // suppress lint
      onSave(updatedBrand);
      setDone(true);
    } else {
      setCurrentIdx(i => i + 1);
    }
  };

  if (done) {
    return (
      <div className="modal-bg" onClick={onClose}>
        <div className="modal p-5 sm:p-7" onClick={e => e.stopPropagation()}>
          <div className="text-center py-10 px-2">
            <div className="text-5xl mb-4">🎉</div>
            <h2 className="font-black text-gray-900 text-2xl mb-2">הגדרה הושלמה!</h2>
            <p className="text-gray-500 text-sm mb-6">מילאת פעולות הבאה ל-{filledCount} משימות מתוך {total}</p>
            <button onClick={onClose} className="btn btn-orange px-8">סגור</button>
          </div>
        </div>
      </div>
    );
  }

  const STATUS_LABELS: Record<StageStatus, string> = {
    todo: "לא התחיל", active: "בתהליך", done: "הושלם", blocked: "תקוע",
  };
  const STATUS_COLORS: Record<StageStatus, { bg: string; text: string }> = {
    todo:    { bg: "#f3f4f6", text: "#6b7280" },
    active:  { bg: "#dbeafe", text: "#1d4ed8" },
    done:    { bg: "#dcfce7", text: "#15803d" },
    blocked: { bg: "#fee2e2", text: "#dc2626" },
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal p-5 sm:p-7" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-gray-900 text-lg">
            {brand.emoji} השלם הגדרה — {brand.name}
          </h2>
          <button onClick={onClose} className="icon-btn w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-xl font-bold transition-colors">×</button>
        </div>

        {/* Progress */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500 font-semibold">משימה {currentIdx + 1} מתוך {total}</span>
            <span className="text-xs text-gray-400">{Math.round(((currentIdx) / total) * 100)}%</span>
          </div>
          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-teal-500 transition-all duration-300" style={{ width: `${(currentIdx / total) * 100}%` }} />
          </div>
        </div>

        {/* Stage info */}
        <div className="bg-gray-50 rounded-xl p-4 mb-4">
          <p className="text-xs text-gray-400 mb-1">{current.subName} / {current.projectName}</p>
          <h3 className="font-black text-gray-900 text-lg mb-2">{current.stage.name}</h3>
          <span
            className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ background: STATUS_COLORS[current.stage.status].bg, color: STATUS_COLORS[current.stage.status].text }}
          >
            {STATUS_LABELS[current.stage.status]}
          </span>
        </div>

        {/* Next action textarea */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">מה הפעולה הבאה למשימה הזו?</label>
          <textarea
            className="input w-full resize-none"
            rows={3}
            placeholder="לדוגמה: לשלוח הצעת מחיר עד יום ראשון..."
            value={nextActions[current.stage.id] ?? ""}
            onChange={e => setNextActions(prev => ({ ...prev, [current.stage.id]: e.target.value }))}
            autoFocus
          />
        </div>

        {/* Navigation */}
        <div className="flex items-center gap-2 justify-between">
          <button onClick={() => applyAndMove(true)} className="btn btn-ghost">← דלג</button>
          <button
            onClick={() => applyAndMove(false)}
            className="btn btn-orange flex-1"
          >
            {currentIdx + 1 >= total ? "סיום ✓" : "הבא ←"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── helpers ─────────────────────────────────────────── */

const STATUS_META: Record<StageStatus, { label: string; dot: string }> = {
  todo:    { label: "לא התחיל", dot: "#d1d5db" },
  active:  { label: "בתהליך",   dot: "#3b82f6" },
  done:    { label: "הושלם",    dot: "#16a34a" },
  blocked: { label: "תקוע",     dot: "#dc2626" },
};

function pct(stages: Stage[]) {
  if (!stages.length) return 0;
  return Math.round((stages.filter(s => s.status === "done").length / stages.length) * 100);
}

function totalPct(subs: SubProject[]) {
  const all   = subs.reduce((n, sp) => n + sp.stages.length, 0);
  const done  = subs.reduce((n, sp) => n + sp.stages.filter(s => s.status === "done").length, 0);
  return all > 0 ? Math.round((done / all) * 100) : 0;
}

function subMonthlyExpenses(sub: SubProject): number {
  const subDirect   = (sub.expenses ?? []).reduce((s, e) => s + e.amount, 0);
  const stageDirect = sub.stages.reduce((s, st) => s + (st.expenses ?? []).reduce((a, e) => a + e.amount, 0), 0);
  const chExp       = sub.channels.reduce((s, ch) => {
    const chDirect = (ch.expenses ?? []).reduce((a, e) => a + e.amount, 0);
    const chStages = ch.stages.reduce((ss, st) => ss + (st.expenses ?? []).reduce((a, e) => a + e.amount, 0), 0);
    return s + chDirect + chStages;
  }, 0);
  const commitmentCost = (sub.commitments ?? []).reduce((s, c) => {
    const paid = (c.payments ?? []).filter((p: { paid: boolean }) => p.paid).length;
    if (paid >= c.totalPayments && c.totalPayments > 0) return s;
    if (c.frequency === 'monthly') return s + c.amountPerPayment;
    if (c.frequency === 'weekly') return s + c.amountPerPayment * 4;
    return s;
  }, 0);
  return subDirect + stageDirect + chExp + commitmentCost;
}

function subMonthlyIncomes(sub: SubProject): number {
  const subDirect = (sub.incomes ?? []).reduce((s, e) => s + e.amount, 0);
  const chInc     = sub.channels.reduce((s, ch) =>
    s + (ch.incomes ?? []).reduce((a, e) => a + e.amount, 0), 0);
  return subDirect + chInc;
}

/* ─── Breadcrumb sidebar ───────────────────────────────── */
interface BreadcrumbItem { emoji: string; name: string; onClick: () => void; isCurrent: boolean; }

function BreadcrumbSidebar({ items, color }: { items: BreadcrumbItem[]; color: string }) {
  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 z-20 flex pointer-events-none"
      style={{
        maxWidth: "calc(100vw - 24px)",
        bottom: "max(16px, calc(env(safe-area-inset-bottom) + 8px))",
      }}
    >
      <div
        className="rounded-full flex flex-row items-center pointer-events-auto overflow-hidden"
        style={{
          background: "rgba(20,20,22,0.78)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.28), 0 1px 0 rgba(255,255,255,0.06) inset",
          padding: "6px 8px",
          gap: 2,
        }}
      >
        {items.map((item, i) => (
          <button
            key={i}
            onClick={item.onClick}
            title={item.name}
            className="flex flex-row items-center gap-1.5 rounded-full transition-all duration-200"
            style={{
              padding: item.isCurrent ? "7px 14px 7px 10px" : "7px 10px",
              minHeight: 36,
              background: item.isCurrent ? "rgba(255,255,255,0.15)" : "transparent",
              opacity: item.isCurrent ? 1 : 0.5,
            }}
          >
            <span style={{ fontSize: 16, lineHeight: 1, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>{item.emoji}</span>
            {item.isCurrent && (
              <span
                className="font-semibold text-white"
                style={{
                  fontSize: 13,
                  lineHeight: 1,
                  maxWidth: 120,
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                  textShadow: "0 1px 3px rgba(0,0,0,0.4)",
                }}
              >{item.name}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Brand Diagram Canvas ─────────────────────────────── */
const BD_BRAND_W = 300, BD_BRAND_H = 86;
const BD_PROJ_W = 230, BD_PROJ_H = 78;
const BD_SUB_W = 188, BD_SUB_H = 108;
const BD_PROJ_DY = 280, BD_SUB_DY = 240;
const BD_PROJ_GAP = 320, BD_SUB_GAP = 260;

interface BDNode {
  id: string;
  type: "brand" | "project" | "sub";
  projectId?: string; // for subs, which project they belong to
  data: Brand | Project | SubProject;
  project?: Project; // for sub nodes, parent project
  x: number;
  y: number;
}

function layoutBDNodes(brand: Brand, collapsedProjects: Set<string>): BDNode[] {
  const out: BDNode[] = [];

  // Brand node at center
  const brandNode: BDNode = {
    id: "brand",
    type: "brand",
    data: brand,
    x: 0, y: 0,
  };
  out.push(brandNode);

  const projects = brand.projects;
  if (!projects.length) return out;

  // Calculate total width for projects
  let totalProjW = 0;
  for (const proj of projects) {
    const subs = proj.subProjects;
    const isCollapsed = collapsedProjects.has(proj.id);
    if (isCollapsed || subs.length === 0) {
      totalProjW += BD_PROJ_W;
    } else {
      const subSpan = subs.length * BD_SUB_W + (subs.length - 1) * (BD_SUB_GAP - BD_SUB_W);
      totalProjW += Math.max(BD_PROJ_W, subSpan);
    }
  }
  totalProjW += (projects.length - 1) * (BD_PROJ_GAP - BD_PROJ_W);

  let px = -(totalProjW / 2) + BD_PROJ_W / 2;

  for (const proj of projects) {
    const subs = proj.subProjects;
    const isCollapsed = collapsedProjects.has(proj.id);
    const projX = px;

    // Place subs if not collapsed
    if (!isCollapsed && subs.length > 0) {
      const totalSubW = subs.length * BD_SUB_W + (subs.length - 1) * (BD_SUB_GAP - BD_SUB_W);
      let sx = projX - totalSubW / 2 + BD_SUB_W / 2;
      for (const sub of subs) {
        out.push({
          id: `sub-${sub.id}`,
          type: "sub",
          projectId: proj.id,
          data: sub,
          project: proj,
          x: sx, y: BD_PROJ_DY + BD_SUB_DY,
        });
        sx += BD_SUB_GAP;
      }

      // Advance px
      const subSpan = subs.length * BD_SUB_W + (subs.length - 1) * (BD_SUB_GAP - BD_SUB_W);
      px += Math.max(BD_PROJ_GAP, subSpan + 40);
    } else {
      px += BD_PROJ_GAP;
    }

    out.push({
      id: `proj-${proj.id}`,
      type: "project",
      data: proj,
      x: projX, y: BD_PROJ_DY,
    });
  }

  return out;
}

function BrandDiagramCanvas({ brand, isDark, t, onNavigateTo }: {
  brand: Brand;
  isDark: boolean;
  t: {
    bg: string; hdr: string; border: string; nodeBg: string; text: string;
    textSec: string; textMuted: string; taskDotTodo: string; emptyText: string;
    activeBadge: { bg: string; text: string }; blockedBadge: { bg: string; text: string };
    statsDone: { bg: string; text: string; border: string };
    statsActive: { bg: string; text: string; border: string };
    statsBlocked: { bg: string; text: string; border: string };
    btnBg: string; btnBorder: string; btnText: string;
    divider: string;
  };
  onNavigateTo: (project: Project, sub?: SubProject, channel?: Channel) => void;
}) {
  const [collapsedProjects, setCollapsedProjects] = useState<Set<string>>(() => {
    const s = new Set<string>();
    for (const p of brand.projects) s.add(p.id);
    return s;
  });
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const offsetAtStart = useRef({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOffset({ x: window.innerWidth / 2, y: 80 });
    }
  }, []);

  const nodes = layoutBDNodes(brand, collapsedProjects);

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setScale(s => Math.min(3, Math.max(0.25, s * delta)));
  };

  const handleBgMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-bdnode]")) return;
    isPanning.current = true;
    panStart.current = { x: e.clientX, y: e.clientY };
    offsetAtStart.current = { ...offset };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning.current) return;
    setOffset({
      x: offsetAtStart.current.x + (e.clientX - panStart.current.x),
      y: offsetAtStart.current.y + (e.clientY - panStart.current.y),
    });
  };

  const handleMouseUp = () => { isPanning.current = false; };

  const toggleProject = (projId: string) => {
    setCollapsedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projId)) next.delete(projId);
      else next.add(projId);
      return next;
    });
  };

  // SVG bounds
  const xs = nodes.map(n => n.x);
  const ys = nodes.map(n => n.y);
  const minX = Math.min(...xs) - 300;
  const minY = Math.min(...ys) - 120;
  const maxX = Math.max(...xs) + 400;
  const maxY = Math.max(...ys) + 280;
  const svgW = maxX - minX;
  const svgH = maxY - minY;

  // Connections
  function renderBDConnections() {
    const lines: React.ReactElement[] = [];
    const brandNode = nodes.find(n => n.type === "brand");
    if (!brandNode) return lines;

    const projNodes = nodes.filter(n => n.type === "project");
    for (const pn of projNodes) {
      // brand → project
      const x1 = brandNode.x + BD_BRAND_W / 2;
      const y1 = brandNode.y + BD_BRAND_H;
      const x2 = pn.x + BD_PROJ_W / 2;
      const y2 = pn.y;
      const midY1 = (y1 + y2) / 2;
      lines.push(
        <path key={`b-${pn.id}`}
          d={`M ${x1} ${y1} C ${x1} ${midY1}, ${x2} ${midY1}, ${x2} ${y2}`}
          fill="none" stroke={brand.color + (isDark ? "55" : "60")} strokeWidth="2"
        />
      );

      // project → subs
      const projId = (pn.data as Project).id;
      const subNodes = nodes.filter(n => n.type === "sub" && n.projectId === projId);
      for (const sn of subNodes) {
        const sx1 = pn.x + BD_PROJ_W / 2;
        const sy1 = pn.y + BD_PROJ_H;
        const sx2 = sn.x + BD_SUB_W / 2;
        const sy2 = sn.y;
        const smidY = (sy1 + sy2) / 2;
        lines.push(
          <path key={`p-${sn.id}`}
            d={`M ${sx1} ${sy1} C ${sx1} ${smidY}, ${sx2} ${smidY}, ${sx2} ${sy2}`}
            fill="none" stroke={brand.color + (isDark ? "40" : "45")} strokeWidth="1.5"
            strokeDasharray="4 3"
          />
        );
      }
    }
    return lines;
  }

  if (brand.projects.length === 0) {
    return (
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12, background: t.bg }}>
        <div style={{ fontSize: 48, opacity: 0.25 }}>📭</div>
        <p style={{ color: t.emptyText, fontWeight: 600, fontSize: 14 }}>אין מחלקות במותג זה עדיין</p>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, position: "relative", overflow: "hidden", background: t.bg,
      backgroundImage: isDark ? "radial-gradient(circle, rgba(255,255,255,0.028) 1px, transparent 1px)" : "radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)",
      backgroundSize: "28px 28px" }}>

      {/* Ambient glows */}
      <div style={{ position: "absolute", top: 0, right: 0, width: 320, height: 320, background: `radial-gradient(circle at top right, ${brand.color}${isDark ? "0d" : "06"}, transparent 70%)`, pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, width: 260, height: 260, background: `radial-gradient(circle at bottom left, ${isDark ? "rgba(99,102,241,0.07)" : "rgba(99,102,241,0.03)"}, transparent 70%)`, pointerEvents: "none" }} />

      {/* Pan/zoom canvas */}
      <div
        style={{ position: "absolute", inset: 0, cursor: isPanning.current ? "grabbing" : "grab" }}
        onWheel={handleWheel}
        onMouseDown={handleBgMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`, transformOrigin: "0 0", position: "absolute", top: 0, left: 0 }}>
          {/* SVG connections */}
          <svg style={{ position: "absolute", left: minX, top: minY, pointerEvents: "none", overflow: "visible" }}
            width={svgW} height={svgH} viewBox={`${minX} ${minY} ${svgW} ${svgH}`}>
            {renderBDConnections()}
          </svg>

          {/* Nodes */}
          {nodes.map(node => {
            const isHov = hoveredId === node.id;

            if (node.type === "brand") {
              const b = node.data as Brand;
              const totalTasks = b.projects.reduce((s, p) => s + p.subProjects.reduce((ss, sp) => ss + sp.stages.length + sp.channels.reduce((cs, c) => cs + c.stages.length, 0), 0), 0);
              const doneTasks = b.projects.reduce((s, p) => s + p.subProjects.reduce((ss, sp) => ss + sp.stages.filter(st => st.status === "done").length + sp.channels.reduce((cs, c) => cs + c.stages.filter(st => st.status === "done").length, 0), 0), 0);
              const activeN = b.projects.reduce((s, p) => s + p.subProjects.reduce((ss, sp) => ss + sp.stages.filter(st => st.status === "active").length + sp.channels.reduce((cs, c) => cs + c.stages.filter(st => st.status === "active").length, 0), 0), 0);
              const blockedN = b.projects.reduce((s, p) => s + p.subProjects.reduce((ss, sp) => ss + sp.stages.filter(st => st.status === "blocked").length + sp.channels.reduce((cs, c) => cs + c.stages.filter(st => st.status === "blocked").length, 0), 0), 0);

              return (
                <div key={node.id} data-bdnode="true"
                  style={{
                    position: "absolute", left: node.x, top: node.y,
                    width: BD_BRAND_W, minHeight: BD_BRAND_H,
                    borderRadius: 20, padding: "12px 18px",
                    background: isDark ? `linear-gradient(135deg, ${brand.color}1a 0%, #13161f 100%)` : `linear-gradient(135deg, ${brand.color}10 0%, #ffffff 100%)`,
                    border: `1.5px solid ${brand.color}55`,
                    boxShadow: isDark ? `0 0 56px ${brand.color}20, 0 12px 48px rgba(0,0,0,0.7)` : `0 0 28px ${brand.color}15, 0 6px 28px rgba(0,0,0,0.1)`,
                    display: "flex", alignItems: "center", gap: 12, direction: "rtl",
                  }}>
                  <div style={{ width: 50, height: 50, borderRadius: 14, background: brand.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, flexShrink: 0, boxShadow: `0 4px 20px ${brand.color}65` }}>{b.emoji}</div>
                  <div style={{ flex: 1, textAlign: "right" }}>
                    <div style={{ color: t.text, fontWeight: 900, fontSize: 17, lineHeight: 1.15 }}>{b.name}</div>
                    <div style={{ color: t.textMuted, fontSize: 11, marginTop: 3 }}>{b.projects.length} מחלקות · {totalTasks} משימות</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    {doneTasks > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 8, background: t.statsDone.bg, color: t.statsDone.text, border: `1px solid ${t.statsDone.border}` }}>✓ {doneTasks}</span>}
                    {activeN > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 8, background: t.statsActive.bg, color: t.statsActive.text, border: `1px solid ${t.statsActive.border}` }}>● {activeN}</span>}
                    {blockedN > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 8, background: t.statsBlocked.bg, color: t.statsBlocked.text, border: `1px solid ${t.statsBlocked.border}` }}>⚠ {blockedN}</span>}
                  </div>
                </div>
              );
            }

            if (node.type === "project") {
              const proj = node.data as Project;
              const isCol = collapsedProjects.has(proj.id);
              return (
                <div key={node.id} data-bdnode="true"
                  style={{ position: "absolute", left: node.x, top: node.y, width: BD_PROJ_W, minHeight: BD_PROJ_H }}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}>
                  {/* Collapse toggle */}
                  {proj.subProjects.length > 0 && (
                    <button data-bdnode="true"
                      onClick={e => { e.stopPropagation(); toggleProject(proj.id); }}
                      style={{
                        position: "absolute", top: -10, right: -10, zIndex: 10,
                        width: 24, height: 24, borderRadius: "50%",
                        background: isCol ? brand.color : (isDark ? "#1e2130" : "#f3f4f6"),
                        color: isCol ? "white" : brand.color,
                        fontSize: 11, fontWeight: 700,
                        border: `2px solid ${brand.color}66`,
                        cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "background 0.15s",
                      }}
                      title={isCol ? "הרחב" : "כווץ"}
                    >{isCol ? "▶" : "▼"}</button>
                  )}
                  <button data-bdnode="true"
                    onClick={() => onNavigateTo(proj)}
                    style={{
                      width: "100%", minHeight: BD_PROJ_H, borderRadius: 16, padding: "12px 16px",
                      background: isDark ? `linear-gradient(135deg, ${brand.color}1a 0%, #13161f 100%)` : `linear-gradient(135deg, ${brand.color}09 0%, #ffffff 100%)`,
                      border: `1.5px solid ${brand.color}50`,
                      boxShadow: isHov
                        ? isDark ? `0 0 36px ${brand.color}30, 0 8px 40px rgba(0,0,0,0.65)` : `0 0 24px ${brand.color}18, 0 4px 18px rgba(0,0,0,0.12)`
                        : isDark ? `0 0 20px ${brand.color}14, 0 4px 16px rgba(0,0,0,0.45)` : `0 0 12px ${brand.color}0a, 0 2px 10px rgba(0,0,0,0.07)`,
                      display: "flex", alignItems: "center", gap: 12,
                      cursor: "pointer", direction: "rtl",
                      transition: "transform 0.15s, box-shadow 0.15s",
                      transform: isHov ? "scale(1.03)" : "scale(1)",
                      textAlign: "right",
                    }}>
                    <div style={{ width: 44, height: 44, borderRadius: 12, background: brand.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0, boxShadow: `0 4px 16px ${brand.color}55` }}>{proj.emoji}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: t.text, fontWeight: 900, fontSize: 14, lineHeight: 1.2 }}>{proj.name}</div>
                      <div style={{ color: brand.color + "bb", fontSize: 11, marginTop: 2 }}>{proj.subProjects.length} פרויקטים</div>
                    </div>
                    <span style={{ color: brand.color + "70", fontSize: 18 }}>←</span>
                  </button>
                </div>
              );
            }

            if (node.type === "sub") {
              const sub = node.data as SubProject;
              const proj = node.project!;
              const hasChannels = sub.channels.length > 0;
              const subAllS = hasChannels ? sub.channels.reduce((n, c) => n + c.stages.length, 0) : sub.stages.length;
              const doneN = hasChannels ? sub.channels.reduce((n, c) => n + c.stages.filter(s => s.status === "done").length, 0) : sub.stages.filter(s => s.status === "done").length;
              const actN = hasChannels ? sub.channels.reduce((n, c) => n + c.stages.filter(s => s.status === "active").length, 0) : sub.stages.filter(s => s.status === "active").length;
              const blkN = hasChannels ? sub.channels.reduce((n, c) => n + c.stages.filter(s => s.status === "blocked").length, 0) : sub.stages.filter(s => s.status === "blocked").length;

              return (
                <div key={node.id} data-bdnode="true"
                  style={{ position: "absolute", left: node.x, top: node.y, width: BD_SUB_W }}
                  onMouseEnter={() => setHoveredId(node.id)}
                  onMouseLeave={() => setHoveredId(null)}>
                  <button data-bdnode="true"
                    onClick={() => onNavigateTo(proj, sub)}
                    style={{
                      width: "100%", minHeight: BD_SUB_H, borderRadius: 14, padding: "10px 12px",
                      background: isDark ? `linear-gradient(135deg, ${brand.color}12 0%, #13161f 100%)` : `linear-gradient(135deg, ${brand.color}06 0%, #ffffff 100%)`,
                      border: `1px solid ${brand.color}38`,
                      boxShadow: isHov
                        ? isDark ? `0 0 24px ${brand.color}22, 0 4px 20px rgba(0,0,0,0.6)` : `0 0 16px ${brand.color}14, 0 2px 12px rgba(0,0,0,0.1)`
                        : isDark ? `0 2px 14px ${brand.color}10, 0 4px 18px rgba(0,0,0,0.5)` : `0 1px 8px rgba(0,0,0,0.07)`,
                      display: "flex", flexDirection: "column", gap: 7,
                      cursor: "pointer", direction: "rtl", textAlign: "right",
                      transition: "transform 0.15s, box-shadow 0.15s",
                      transform: isHov ? "scale(1.04) translateY(-2px)" : "scale(1)",
                    }}>
                    {/* Header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 9, background: isDark ? brand.color + "28" : brand.color + "16", border: `1px solid ${brand.color}40`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{sub.emoji}</div>
                      <span style={{ color: t.text, fontWeight: 800, fontSize: 12, lineHeight: 1.3, flex: 1 }}>{sub.name}</span>
                    </div>

                    {/* Channel pills */}
                    {hasChannels && sub.channels.length > 0 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                        {sub.channels.slice(0, 3).map(ch => (
                          <button key={ch.id} data-bdnode="true"
                            onClick={e => { e.stopPropagation(); onNavigateTo(proj, sub, ch); }}
                            style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 6px", borderRadius: 7, background: brand.color + "1e", border: `1px solid ${brand.color}30`, color: brand.color, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                            <span>{ch.emoji}</span>
                            <span style={{ maxWidth: 44, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ch.name}</span>
                          </button>
                        ))}
                        {sub.channels.length > 3 && <span style={{ fontSize: 10, color: t.textMuted, alignSelf: "center" }}>+{sub.channels.length - 3}</span>}
                      </div>
                    )}

                    {/* Task dots */}
                    {!hasChannels && sub.stages.length > 0 && (
                      <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                        {sub.stages.slice(0, 10).map(s => (
                          <div key={s.id} style={{ width: 7, height: 7, borderRadius: "50%", background: s.status === "done" ? brand.color : s.status === "active" ? "#3b82f6" : s.status === "blocked" ? "#ef4444" : t.taskDotTodo }} />
                        ))}
                        {sub.stages.length > 10 && <span style={{ fontSize: 9, color: t.emptyText }}>+{sub.stages.length - 10}</span>}
                      </div>
                    )}

                    {/* Status badges */}
                    <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                      {doneN > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "1.5px 5px", borderRadius: 6, background: t.statsDone.bg, color: t.statsDone.text }}>✓ {doneN}</span>}
                      {actN > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "1.5px 5px", borderRadius: 6, background: t.activeBadge.bg, color: t.activeBadge.text }}>● {actN}</span>}
                      {blkN > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "1.5px 5px", borderRadius: 6, background: t.blockedBadge.bg, color: t.blockedBadge.text }}>⚠ {blkN}</span>}
                      {subAllS === 0 && <span style={{ fontSize: 9, color: t.emptyText }}>ריק</span>}
                    </div>
                  </button>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>

      {/* Zoom controls */}
      <div style={{ position: "absolute", bottom: 16, right: 16, zIndex: 20, display: "flex", flexDirection: "column", gap: 5 }}>
        <button onClick={() => setScale(s => Math.min(3, s * 1.15))}
          style={{ width: 34, height: 34, borderRadius: 9, background: t.btnBg, border: `1px solid ${t.btnBorder}`, color: t.btnText, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        <button onClick={() => setScale(1)}
          style={{ width: 34, height: 34, borderRadius: 9, background: t.btnBg, border: `1px solid ${t.btnBorder}`, color: t.btnText, fontSize: 10, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>{Math.round(scale * 100)}%</button>
        <button onClick={() => setScale(s => Math.max(0.25, s * 0.85))}
          style={{ width: 34, height: 34, borderRadius: 9, background: t.btnBg, border: `1px solid ${t.btnBorder}`, color: t.btnText, fontSize: 18, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>−</button>
      </div>

      {/* Expand/collapse all */}
      <div style={{ position: "absolute", bottom: 16, left: "50%", transform: "translateX(-50%)", zIndex: 20, display: "flex", gap: 8 }}>
        <button onClick={() => setCollapsedProjects(new Set())}
          style={{ background: t.btnBg, border: `1px solid ${t.btnBorder}`, color: t.btnText, borderRadius: 10, padding: "7px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>הרחב הכל ▼</button>
        <button onClick={() => setCollapsedProjects(new Set(brand.projects.map(p => p.id)))}
          style={{ background: t.btnBg, border: `1px solid ${t.btnBorder}`, color: t.btnText, borderRadius: 10, padding: "7px 14px", fontSize: 11, fontWeight: 600, cursor: "pointer" }}>כווץ הכל ▶</button>
      </div>
    </div>
  );
}

/* ─── Brand whiteboard ─────────────────────────────────── */
function BrandWhiteboard({ brand, onClose, onNavigateTo }: {
  brand: Brand;
  onClose: () => void;
  onNavigateTo: (project: Project, sub?: SubProject, channel?: Channel) => void;
}) {
  const [viewMode, setViewMode] = useState<'diagram' | 'cards'>('diagram');
  const [isDark,   setIsDark]   = useState(true);

  /* ── diagram theme ── */
  const t = isDark ? {
    bg: "#0a0c12", hdr: "#0d1018", border: "#1e2130",
    nodeBg: "#13161f", text: "#ffffff", textSec: "#9ca3af", textMuted: "#6b7280",
    taskDotTodo: "#2a2d3e", emptyText: "#4b5563", divider: "#1e2130",
    activeBadge: { bg: "#1e3a5f", text: "#60a5fa" },
    blockedBadge: { bg: "#4c0519", text: "#f87171" },
    btnBg: "#1a1d28", btnBorder: "#2a2d3e", btnText: "#9ca3af",
    modeBtnActive: { bg: "#1e2333", border: "#3b4256", text: "#e2e8f0" },
    modeBtnIdle:   { bg: "transparent", border: "#2a2d3e", text: "#6b7280" },
    statsDone:    { bg: "#14532d30", text: "#4ade80", border: "#14532d" },
    statsActive:  { bg: "#1e3a5f30", text: "#60a5fa", border: "#1e3a5f" },
    statsBlocked: { bg: "#4c051930", text: "#f87171", border: "#4c0519" },
  } : {
    bg: "#f8fafc", hdr: "#ffffff", border: "#e5e7eb",
    nodeBg: "#ffffff", text: "#111827", textSec: "#6b7280", textMuted: "#9ca3af",
    taskDotTodo: "#e5e7eb", emptyText: "#9ca3af", divider: "#e5e7eb",
    activeBadge: { bg: "#eff6ff", text: "#2563eb" },
    blockedBadge: { bg: "#fee2e2", text: "#dc2626" },
    btnBg: "#f3f4f6", btnBorder: "#d1d5db", btnText: "#6b7280",
    modeBtnActive: { bg: "#f0f9ff", border: "#bae6fd", text: "#0369a1" },
    modeBtnIdle:   { bg: "transparent", border: "#d1d5db", text: "#9ca3af" },
    statsDone:    { bg: "#dcfce7", text: "#15803d", border: "#86efac" },
    statsActive:  { bg: "#eff6ff", text: "#2563eb", border: "#bfdbfe" },
    statsBlocked: { bg: "#fee2e2", text: "#dc2626", border: "#fca5a5" },
  };

  const totalTasks   = brand.projects.reduce((s, p) => s + p.subProjects.reduce((ss, sp) => ss + sp.stages.length + sp.channels.reduce((cs, c) => cs + c.stages.length, 0), 0), 0);
  const doneTasks    = brand.projects.reduce((s, p) => s + p.subProjects.reduce((ss, sp) => ss + sp.stages.filter(st => st.status === "done").length + sp.channels.reduce((cs, c) => cs + c.stages.filter(st => st.status === "done").length, 0), 0), 0);
  const activeCount  = brand.projects.reduce((s, p) => s + p.subProjects.reduce((ss, sp) => ss + sp.stages.filter(st => st.status === "active").length + sp.channels.reduce((cs, c) => cs + c.stages.filter(st => st.status === "active").length, 0), 0), 0);
  const blockedCount = brand.projects.reduce((s, p) => s + p.subProjects.reduce((ss, sp) => ss + sp.stages.filter(st => st.status === "blocked").length + sp.channels.reduce((cs, c) => cs + c.stages.filter(st => st.status === "blocked").length, 0), 0), 0);

  /* cards-view bg always light */
  const outerBg = viewMode === 'cards' ? "#f8fafc" : t.bg;
  const hdrBg   = viewMode === 'cards' ? "#ffffff"  : t.hdr;
  const hdrBorder = viewMode === 'cards' ? "#e5e7eb" : t.border;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: outerBg, fontFamily: "'Heebo', system-ui, sans-serif", direction: "rtl" }}>

      {/* ── Header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b gap-3" style={{ borderColor: hdrBorder, background: hdrBg }}>

        {/* RIGHT (first in DOM = RTL start): close + view-mode toggle + dark toggle */}
        <div className="flex items-center gap-1.5 shrink-0">
          <button onClick={onClose}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
            style={{ color: viewMode==='cards' ? "#6b7280" : t.btnText, background: viewMode==='cards' ? "#f3f4f6" : t.btnBg, border: `1px solid ${viewMode==='cards' ? "#d1d5db" : t.btnBorder}` }}
          >× סגור</button>

          {/* View mode buttons */}
          <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: viewMode==='cards' ? "#d1d5db" : t.btnBorder }}>
            {([
              { mode: 'diagram' as const, label: '🕸️', labelFull: 'דיאגרמה' },
              { mode: 'cards'   as const, label: '📋', labelFull: 'כרטיסיות' },
            ]).map(({ mode, label, labelFull }) => {
              const isActive = viewMode === mode;
              const activeStyle = viewMode === 'cards'
                ? { bg: "#f97316", border: "transparent", text: "#ffffff" }
                : t.modeBtnActive;
              const idleStyle = viewMode === 'cards'
                ? { bg: "#ffffff", border: "transparent", text: "#9ca3af" }
                : t.modeBtnIdle;
              const s = isActive ? activeStyle : idleStyle;
              return (
                <button key={mode} onClick={() => setViewMode(mode)}
                  className="text-xs font-semibold px-2.5 py-1.5 transition-all flex items-center gap-1"
                  style={{ background: s.bg, color: s.text }}>
                  <span>{label}</span>
                  <span className="hidden sm:inline">{labelFull}</span>
                </button>
              );
            })}
          </div>

          {/* Dark/light toggle — only in diagram mode */}
          {viewMode === 'diagram' && (
            <button onClick={() => setIsDark(!isDark)}
              className="text-xs font-semibold px-2 py-1.5 rounded-lg transition-all"
              style={{ color: t.btnText, background: t.btnBg, border: `1px solid ${t.btnBorder}` }}
            >
              <span>{isDark ? "☀️" : "🌙"}</span>
              <span className="hidden sm:inline">{isDark ? " בהיר" : " כהה"}</span>
            </button>
          )}
        </div>

        {/* LEFT (last in DOM = RTL end): brand info + stats */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-lg shrink-0"
              style={{ background: brand.color + "25", border: `1.5px solid ${brand.color}50` }}>
              {brand.emoji}
            </div>
            <div className="min-w-0">
              <h2 className="font-black text-sm leading-tight truncate" style={{ color: viewMode==='cards' ? "#111827" : t.text }}>{brand.name}</h2>
              <p className="text-[11px]" style={{ color: viewMode==='cards' ? "#9ca3af" : t.textMuted }}>מבט על · {brand.projects.length} מחלקות</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 shrink-0">
            {doneTasks > 0    && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: viewMode==='cards' ? "#dcfce7" : t.statsDone.bg, color: viewMode==='cards' ? "#15803d" : t.statsDone.text }}>✓ {doneTasks}</span>}
            {activeCount > 0  && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: viewMode==='cards' ? "#eff6ff" : t.statsActive.bg, color: viewMode==='cards' ? "#2563eb" : t.statsActive.text }}>● {activeCount}</span>}
            {blockedCount > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: viewMode==='cards' ? "#fee2e2" : t.statsBlocked.bg, color: viewMode==='cards' ? "#dc2626" : t.statsBlocked.text }}>⚠ {blockedCount}</span>}
          </div>
        </div>
      </div>

      {/* ══ CARDS VIEW ══ */}
      {viewMode === 'cards' && (
        <div className="flex-1 overflow-auto p-5 pb-16" style={{ background: "#f8fafc" }}>
          {brand.projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3">
              <div className="text-5xl opacity-30">📭</div>
              <p className="font-semibold text-gray-400">אין מחלקות במותג זה עדיין</p>
            </div>
          ) : (
            <div className="max-w-screen-lg mx-auto space-y-5">
              {brand.projects.map(project => {
                const subDone    = project.subProjects.reduce((n, sp) => n + sp.stages.filter(s => s.status === "done").length, 0);
                const subActive  = project.subProjects.reduce((n, sp) => n + sp.stages.filter(s => s.status === "active").length, 0);
                const subBlocked = project.subProjects.reduce((n, sp) => n + sp.stages.filter(s => s.status === "blocked").length, 0);
                return (
                  <div key={project.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Project header */}
                    <button
                      onClick={() => onNavigateTo(project)}
                      className="w-full flex items-center gap-3 px-5 py-4 text-right hover:opacity-90 transition-opacity"
                      style={{ background: project.color + "0c", borderBottom: `1px solid ${project.color}20` }}
                    >
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                           style={{ background: project.color + "20", border: `1.5px solid ${project.color}40` }}>
                        {project.emoji}
                      </div>
                      <div className="flex-1 text-right">
                        <h3 className="font-black text-gray-900 text-base">{project.name}</h3>
                        <p className="text-xs text-gray-400 mt-0.5">{project.subProjects.length} פרויקטים</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {subDone    > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-700">✓ {subDone}</span>}
                        {subActive  > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">● {subActive}</span>}
                        {subBlocked > 0 && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600">⚠ {subBlocked}</span>}
                        <span className="text-sm font-bold" style={{ color: project.color }}>←</span>
                      </div>
                    </button>

                    {/* SubProjects grid */}
                    {project.subProjects.length > 0 && (
                      <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                        {project.subProjects.map(sub => {
                          const hasChannels = sub.channels.length > 0;
                          const taskCount   = hasChannels ? sub.channels.reduce((n, c) => n + c.stages.length, 0) : sub.stages.length;
                          const doneN       = hasChannels ? sub.channels.reduce((n, c) => n + c.stages.filter(s => s.status === "done").length, 0) : sub.stages.filter(s => s.status === "done").length;
                          const actN        = hasChannels ? sub.channels.reduce((n, c) => n + c.stages.filter(s => s.status === "active").length, 0) : sub.stages.filter(s => s.status === "active").length;
                          const blkN        = hasChannels ? sub.channels.reduce((n, c) => n + c.stages.filter(s => s.status === "blocked").length, 0) : sub.stages.filter(s => s.status === "blocked").length;
                          return (
                            <button
                              key={sub.id}
                              onClick={() => onNavigateTo(project, sub)}
                              className="flex flex-col gap-2 p-3 rounded-xl border text-right hover:shadow-md transition-all hover:-translate-y-0.5 group"
                              style={{ borderColor: project.color + "30", background: project.color + "05" }}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{sub.emoji}</span>
                                <span className="font-bold text-gray-800 text-xs leading-snug flex-1">{sub.name}</span>
                              </div>
                              {hasChannels && sub.channels.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {sub.channels.slice(0, 3).map(ch => (
                                    <button key={ch.id} onClick={e => { e.stopPropagation(); onNavigateTo(project, sub, ch); }}
                                      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold hover:opacity-70"
                                      style={{ background: project.color + "15", color: project.color }}>
                                      <span>{ch.emoji}</span><span className="max-w-[40px] truncate">{ch.name}</span>
                                    </button>
                                  ))}
                                  {sub.channels.length > 3 && <span className="text-[10px] text-gray-400 self-center">+{sub.channels.length - 3}</span>}
                                </div>
                              )}
                              <div className="flex items-center gap-1 flex-wrap">
                                {taskCount > 0 && <span className="text-[10px] text-gray-400">{taskCount} משימות</span>}
                                {actN  > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">● {actN}</span>}
                                {blkN  > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">⚠ {blkN}</span>}
                                {doneN > 0 && <span className="text-[10px] font-semibold text-green-600">✓ {doneN}</span>}
                                {taskCount === 0 && <span className="text-[10px] text-gray-300">ריק</span>}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══ DIAGRAM VIEW ══ */}
      {viewMode === 'diagram' && (
        <BrandDiagramCanvas brand={brand} isDark={isDark} t={t} onNavigateTo={onNavigateTo} />
      )}
    </div>
  );
}

/* ─── Goals panel ─────────────────────────────────────── */
const GOAL_STATUS: Record<BrandGoal["status"], { label: string; bg: string; text: string }> = {
  "on-track": { label: "במסלול ✅", bg: "#dcfce7", text: "#15803d" },
  "at-risk":  { label: "בסיכון ⚠️",  bg: "#fef9c3", text: "#a16207" },
  "done":     { label: "הושלם 🎉",   bg: "#f3e8ff", text: "#7e22ce" },
};

function GoalsPanel({ goals, color, onChange }: {
  goals: BrandGoal[];
  color: string;
  onChange: (goals: BrandGoal[]) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newText, setNewText] = useState("");
  const [newEmoji, setNewEmoji] = useState("🎯");
  const [newDeadline, setNewDeadline] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const addGoal = () => {
    if (!newText.trim()) return;
    const goal: BrandGoal = {
      id: uuidv4(), text: newText.trim(), emoji: newEmoji,
      status: "on-track", deadline: newDeadline || undefined,
    };
    onChange([...goals, goal]);
    setNewText(""); setNewEmoji("🎯"); setNewDeadline(""); setAdding(false);
  };

  const updateGoal = (id: string, patch: Partial<BrandGoal>) => {
    onChange(goals.map(g => g.id === id ? { ...g, ...patch } : g));
  };

  const deleteGoal = (id: string) => {
    onChange(goals.filter(g => g.id !== id));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-gray-800 text-base flex items-center gap-2">
          🎯 המטרות שלי
          <span className="text-xs font-normal text-gray-400">— שמור את הפוקוס</span>
        </h2>
        {!adding && (
          <button
            onClick={() => setAdding(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors"
            style={{ borderColor: color + "40", color, background: color + "10" }}
          >
            + הוסף מטרה
          </button>
        )}
      </div>

      {goals.length === 0 && !adding && (
        <div
          className="rounded-2xl border-2 border-dashed p-6 text-center cursor-pointer hover:opacity-80 transition-opacity"
          style={{ borderColor: color + "30", background: color + "06" }}
          onClick={() => setAdding(true)}
        >
          <div className="text-3xl mb-2">🎯</div>
          <p className="text-sm text-gray-400 font-medium">הוסף מטרה כדי שלא תסטה</p>
        </div>
      )}

      {goals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {goals.map(g => (
            <div
              key={g.id}
              className="rounded-2xl border bg-white p-4 flex flex-col gap-2.5 shadow-sm hover:shadow-md transition-shadow"
              style={{ borderColor: color + "25" }}
            >
              {editingId === g.id ? (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      value={g.emoji}
                      onChange={e => updateGoal(g.id, { emoji: e.target.value })}
                      className="w-12 text-center text-xl border border-gray-200 rounded-lg p-1 focus:outline-none focus:ring-1 focus:ring-teal-400"
                    />
                    <input
                      value={g.text}
                      onChange={e => updateGoal(g.id, { text: e.target.value })}
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-teal-400"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={g.status}
                      onChange={e => updateGoal(g.id, { status: e.target.value as BrandGoal["status"] })}
                      className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-teal-400 flex-1"
                    >
                      <option value="on-track">במסלול ✅</option>
                      <option value="at-risk">בסיכון ⚠️</option>
                      <option value="done">הושלם 🎉</option>
                    </select>
                    <HebrewDateInput
                      value={g.deadline ?? ""}
                      onChange={v => updateGoal(g.id, { deadline: v || undefined })}
                      className="text-xs"
                    />
                    <button onClick={() => setEditingId(null)} className="text-xs font-bold text-teal-600 px-2 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 transition-colors">
                      שמור
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2.5 flex-1">
                      <span className="text-2xl leading-none mt-0.5">{g.emoji}</span>
                      <p className="text-sm font-semibold text-gray-800 leading-snug flex-1">{g.text}</p>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => setEditingId(g.id)} className="icon-btn w-8 h-8 rounded-lg bg-gray-100 hover:bg-teal-50 text-gray-400 hover:text-teal-600 flex items-center justify-center text-xs transition-colors">✏️</button>
                      <button onClick={() => deleteGoal(g.id)} className="icon-btn w-8 h-8 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-400 flex items-center justify-center text-sm font-bold transition-colors">×</button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      onClick={() => {
                        const statuses: BrandGoal["status"][] = ["on-track", "at-risk", "done"];
                        const next = statuses[(statuses.indexOf(g.status) + 1) % statuses.length];
                        updateGoal(g.id, { status: next });
                      }}
                      className="text-xs font-semibold px-2.5 py-1 rounded-full transition-all hover:opacity-80"
                      style={{ background: GOAL_STATUS[g.status].bg, color: GOAL_STATUS[g.status].text }}
                    >
                      {GOAL_STATUS[g.status].label}
                    </button>
                    {g.deadline && (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        📅 {new Date(g.deadline).toLocaleDateString("he-IL")}
                      </span>
                    )}
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {adding && (
        <div className="rounded-2xl border-2 p-4 space-y-3 bg-white shadow-sm" style={{ borderColor: color + "40" }}>
          <div className="flex items-center gap-2">
            <input
              value={newEmoji}
              onChange={e => setNewEmoji(e.target.value)}
              placeholder="🎯"
              className="w-12 text-center text-xl border border-gray-200 rounded-lg p-1 focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
            <input
              value={newText}
              onChange={e => setNewText(e.target.value)}
              placeholder="לדוגמה: 100,000 משתמשים"
              autoFocus
              onKeyDown={e => { if (e.key === "Enter") addGoal(); if (e.key === "Escape") setAdding(false); }}
              className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-teal-400"
            />
          </div>
          <div className="flex items-center gap-2">
            <HebrewDateInput
              value={newDeadline}
              onChange={v => setNewDeadline(v)}
              className="text-xs"
            />
            <span className="text-xs text-gray-400">תאריך יעד (אופציונלי)</span>
          </div>
          <div className="flex gap-2">
            <button onClick={addGoal} className="btn btn-orange text-sm flex-1">הוסף מטרה</button>
            <button onClick={() => { setAdding(false); setNewText(""); setNewEmoji("🎯"); setNewDeadline(""); }} className="btn btn-ghost text-sm">ביטול</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Monthly Memory ─────────────────────────────────── */
function MonthlyMemorySection({ brands }: { brands: Brand[] }) {
  const [snapshots, setSnapshots] = useState<MonthlySnapshot[]>([]);
  const [showModal, setShowModal]   = useState(false);
  const [editingMonth, setEditingMonth] = useState<string | null>(null);
  const [collapsed, setCollapsed]   = useState(true);

  const currentYM = new Date().toISOString().slice(0, 7); // "2025-12"
  const prevYM = (() => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();

  // Load from localStorage first, then cloud
  useEffect(() => {
    setSnapshots(loadAllMonthlySnapshots());
    loadMonthlySnapshotsFromCloud().then(cloud => {
      if (!cloud || cloud.length === 0) return;
      // Merge cloud into localStorage
      cloud.forEach(s => {
        if (!loadMonthlySnapshot(s.yearMonth)) {
          localStorage.setItem(`MONTHLY_SNAPSHOT_${s.yearMonth}`, JSON.stringify(s));
        }
      });
      setSnapshots(loadAllMonthlySnapshots());
    }).catch(() => {});
  }, []);

  const hasPrevMonth = snapshots.some(s => s.yearMonth === prevYM);
  const showNewMonthBanner = !hasPrevMonth;

  const hebrewMonth = (ym: string) => {
    const [y, m] = ym.split("-");
    return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("he-IL", { month: "long", year: "numeric" });
  };

  const moodEmoji = (m: number) => ["😰","😕","😐","😊","🔥"][m - 1];

  const handleSave = (snap: MonthlySnapshot) => {
    saveMonthlySnapshot(snap);
    setSnapshots(loadAllMonthlySnapshots());
    setShowModal(false);
    setEditingMonth(null);
  };

  return (
    <>
      {/* ── New month reminder banner ── */}
      {showNewMonthBanner && snapshots.length === 0 && (
        <div
          className="card px-4 py-3 flex items-center justify-between gap-3 cursor-pointer"
          style={{ background: "linear-gradient(135deg,#fff7ed,#fef3c7)", border: "1.5px solid #fed7aa" }}
          onClick={() => { setEditingMonth(prevYM); setShowModal(true); }}
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl">📅</span>
            <div>
              <p className="font-black text-orange-800 text-sm">סגור את {hebrewMonth(prevYM)}</p>
              <p className="text-xs text-orange-600">שמור סיכום חודשי לפני שתתחיל חודש חדש</p>
            </div>
          </div>
          <button className="btn btn-orange text-xs px-3 py-1.5 flex-shrink-0">סגור חודש ←</button>
        </div>
      )}

      {/* ── Monthly archive card ── */}
      <div className="card overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-3 cursor-pointer select-none"
          onClick={() => setCollapsed(v => !v)}
          style={{ borderBottom: collapsed ? "none" : "1px solid #f3f4f6" }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">📅</span>
            <div>
              <h3 className="font-black text-gray-900 text-sm">זיכרון חודשי</h3>
              <p className="text-[10px] text-gray-400">{snapshots.length} חודשים נשמרו</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={e => { e.stopPropagation(); setEditingMonth(prevYM); setShowModal(true); }}
              className="btn btn-orange text-xs px-3 py-1.5"
            >+ סגור חודש</button>
            <span className="text-gray-400 text-sm">{collapsed ? "▼" : "▲"}</span>
          </div>
        </div>

        {!collapsed && (
          <div className="p-4">
            {snapshots.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-sm text-gray-400">אין חודשים שמורים עדיין</p>
                <button
                  onClick={() => { setEditingMonth(prevYM); setShowModal(true); }}
                  className="btn btn-orange text-sm mt-4"
                >סגור את {hebrewMonth(prevYM)} עכשיו</button>
              </div>
            ) : (
              <div className="space-y-2">
                {snapshots.map(snap => (
                  <button
                    key={snap.yearMonth}
                    onClick={() => { setEditingMonth(snap.yearMonth); setShowModal(true); }}
                    className="w-full text-right p-3 rounded-xl bg-gray-50 hover:bg-orange-50 border border-transparent hover:border-orange-100 transition-all"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-lg">{moodEmoji(snap.mood)}</span>
                        <div className="text-right">
                          <p className="font-bold text-gray-800 text-xs">{hebrewMonth(snap.yearMonth)}</p>
                          <p className="text-[10px] text-gray-400">{snap.tasksDone}/{snap.tasksTotal} משימות · ₪{snap.revenue.toLocaleString("he-IL")} הכנסות</p>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 text-right">
                        {snap.mainAchievement && (
                          <p className="text-xs text-gray-500 truncate">🏆 {snap.mainAchievement}</p>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Monthly snapshot modal ── */}
      {showModal && editingMonth && (
        <MonthlySnapshotModal
          yearMonth={editingMonth}
          brands={brands}
          existing={snapshots.find(s => s.yearMonth === editingMonth) ?? null}
          onSave={handleSave}
          onClose={() => { setShowModal(false); setEditingMonth(null); }}
        />
      )}
    </>
  );
}

function MonthlySnapshotModal({ yearMonth, brands, existing, onSave, onClose }: {
  yearMonth: string;
  brands: Brand[];
  existing: MonthlySnapshot | null;
  onSave: (snap: MonthlySnapshot) => void;
  onClose: () => void;
}) {
  const hebrewMonth = new Date(yearMonth + "-01").toLocaleDateString("he-IL", { month: "long", year: "numeric" });

  // Auto-count tasks from localStorage for the given month
  const autoTaskStats = (() => {
    let total = 0, done = 0;
    if (typeof window !== "undefined") {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith(`DAILY_TASKS_${yearMonth}`)) {
          try {
            const tasks = JSON.parse(localStorage.getItem(key) ?? "[]") as { status: string }[];
            total += tasks.length;
            done += tasks.filter(t => t.status === "done").length;
          } catch { /* skip */ }
        }
      }
    }
    return { total, done };
  })();

  // Auto-count stages per brand
  const brandStats = brands.filter(b => b.emoji !== "💰").map(b => {
    let stagesCompleted = 0, stagesTotal = 0;
    b.projects.forEach(p => p.subProjects.forEach(sp => {
      stagesTotal += sp.stages.length;
      stagesCompleted += sp.stages.filter(s => s.status === "done").length;
    }));
    return { brandId: b.id, brandName: b.name, brandEmoji: b.emoji, stagesCompleted, stagesTotal };
  });

  const [revenue, setRevenue]       = useState(existing?.revenue ?? 0);
  const [expenses, setExpenses]     = useState(existing?.expenses ?? 0);
  const [highlights, setHighlights] = useState(existing?.highlights ?? "");
  const [challenges, setChallenges] = useState(existing?.challenges ?? "");
  const [achievement, setAchievement] = useState(existing?.mainAchievement ?? "");
  const [nextFocus, setNextFocus]   = useState(existing?.nextMonthFocus ?? "");
  const [mood, setMood]             = useState<1|2|3|4|5>(existing?.mood ?? 3);

  const handleSubmit = () => {
    const snap: MonthlySnapshot = {
      id: existing?.id ?? Math.random().toString(36).slice(2),
      yearMonth,
      savedAt: new Date().toISOString(),
      tasksTotal: autoTaskStats.total,
      tasksDone: autoTaskStats.done,
      stagesCompleted: brandStats.reduce((s, b) => s + b.stagesCompleted, 0),
      stagesTotal: brandStats.reduce((s, b) => s + b.stagesTotal, 0),
      brandData: brandStats,
      revenue,
      expenses,
      highlights,
      challenges,
      mainAchievement: achievement,
      nextMonthFocus: nextFocus,
      mood,
    };
    onSave(snap);
  };

  const moodOptions: { v: 1|2|3|4|5; emoji: string; label: string }[] = [
    { v: 1, emoji: "😰", label: "קשה" },
    { v: 2, emoji: "😕", label: "סביר" },
    { v: 3, emoji: "😐", label: "בסדר" },
    { v: 4, emoji: "😊", label: "טוב" },
    { v: 5, emoji: "🔥", label: "מעולה" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative bg-white w-full sm:max-w-lg sm:rounded-3xl rounded-t-3xl flex flex-col"
        style={{ maxHeight: "92vh", zIndex: 51 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <h2 className="font-black text-gray-900 text-base">📅 {hebrewMonth}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 font-bold transition-colors">×</button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">

          {/* Auto stats */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "משימות הושלמו", value: `${autoTaskStats.done}/${autoTaskStats.total}`, icon: "✅" },
              { label: "שלבים הושלמו",  value: `${brandStats.reduce((s,b)=>s+b.stagesCompleted,0)}/${brandStats.reduce((s,b)=>s+b.stagesTotal,0)}`, icon: "📋" },
              { label: "רווח נטו",       value: `₪${(revenue - expenses).toLocaleString("he-IL")}`, icon: revenue >= expenses ? "💚" : "🔴" },
            ].map(stat => (
              <div key={stat.label} className="p-2.5 rounded-xl bg-gray-50 text-center">
                <p className="text-base mb-0.5">{stat.icon}</p>
                <p className="font-black text-gray-900 text-sm">{stat.value}</p>
                <p className="text-[9px] text-gray-400 leading-tight">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Financial */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">💚 הכנסות החודש (₪)</label>
              <input type="number" className="input text-sm" value={revenue || ""} onChange={e => setRevenue(Number(e.target.value))} placeholder="0" />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 block">💸 הוצאות החודש (₪)</label>
              <input type="number" className="input text-sm" value={expenses || ""} onChange={e => setExpenses(Number(e.target.value))} placeholder="0" />
            </div>
          </div>

          {/* Brand breakdown */}
          {brandStats.filter(b => b.stagesTotal > 0).length > 0 && (
            <div>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">התקדמות לפי מותג</p>
              <div className="space-y-1.5">
                {brandStats.filter(b => b.stagesTotal > 0).map(b => (
                  <div key={b.brandId} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                    <span className="text-base">{b.brandEmoji}</span>
                    <span className="text-xs font-semibold text-gray-700 flex-1 truncate">{b.brandName}</span>
                    <span className="text-xs font-bold text-gray-500">{b.stagesCompleted}/{b.stagesTotal}</span>
                    <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                      <div className="h-full rounded-full bg-orange-400" style={{ width: b.stagesTotal > 0 ? `${Math.round(b.stagesCompleted/b.stagesTotal*100)}%` : "0%" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Mood */}
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">איך היה החודש?</p>
            <div className="flex gap-2 justify-between">
              {moodOptions.map(o => (
                <button
                  key={o.v}
                  onClick={() => setMood(o.v)}
                  className="flex-1 flex flex-col items-center gap-1 p-2 rounded-xl transition-all"
                  style={{ background: mood === o.v ? "#fff7ed" : "#f9fafb", border: `2px solid ${mood === o.v ? "#f97316" : "transparent"}` }}
                >
                  <span className="text-xl">{o.emoji}</span>
                  <span className="text-[9px] font-bold text-gray-500">{o.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Text fields */}
          {[
            { label: "🏆 ההישג הגדול של החודש", val: achievement, set: setAchievement, ph: "מה הייתה ההצלחה הכי גדולה?" },
            { label: "✨ מה עבד הכי טוב",        val: highlights,  set: setHighlights,  ph: "מה הניב הכי הרבה תוצאות?" },
            { label: "⚠️ מה היה קשה",            val: challenges,  set: setChallenges,  ph: "מה עיכב אותך?" },
            { label: "🎯 פוקוס לחודש הבא",       val: nextFocus,   set: setNextFocus,   ph: "דבר אחד שאתה מתחייב אליו" },
          ].map(field => (
            <div key={field.label}>
              <label className="text-xs font-bold text-gray-600 mb-1.5 block">{field.label}</label>
              <textarea
                className="input text-sm w-full resize-none"
                rows={2}
                placeholder={field.ph}
                value={field.val}
                onChange={e => field.set(e.target.value)}
              />
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={handleSubmit} className="btn btn-orange w-full py-3 text-sm font-black">
            💾 שמור סיכום {hebrewMonth}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Top Nav ─────────────────────────────────────────── */
function TopNav({ userEmail, onFinance }: { userEmail: string; onFinance?: () => void }) {
  const router = useRouter();
  const [showSettings, setShowSettings] = useState(false);
  const [loggingOut, setLoggingOut]     = useState(false);
  const [bgThemeId, setBgThemeId]       = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem(BG_THEME_KEY) ?? "default";
    return "default";
  });
  const [notifEmail, setNotifEmail]     = useState(true);
  const [notifPush, setNotifPush]       = useState(false);
  const [settingsTab, setSettingsTab]   = useState<"appearance"|"account"|"billing"|"support">("appearance");

  // Apply saved theme on mount
  useEffect(() => {
    const theme = BG_THEMES.find(t => t.id === bgThemeId) ?? BG_THEMES[0];
    applyBgTheme(theme);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (showSettings) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [showSettings]);

  const initials = userEmail ? userEmail.split("@")[0].slice(0, 2).toUpperCase() : "?";
  const firstName = userEmail ? userEmail.split("@")[0] : "משתמש";

  const handleLogout = async () => {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.push("/login");
  };

  const handlePickTheme = (theme: BgTheme) => {
    setBgThemeId(theme.id);
    localStorage.setItem(BG_THEME_KEY, theme.id);
    applyBgTheme(theme);
  };

  const currentTheme = BG_THEMES.find(t => t.id === bgThemeId) ?? BG_THEMES[0];

  const TABS = [
    { id: "appearance", label: "🎨 מראה"   },
    { id: "account",    label: "⚙️ חשבון"  },
    { id: "billing",    label: "💎 פרימיום" },
    { id: "support",    label: "❓ תמיכה"  },
  ] as const;

  return (
    <>
      <nav className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
        <div className="max-w-screen-lg mx-auto px-4 h-14 flex items-center justify-between">

          {/* Avatar → opens settings drawer — right side in RTL */}
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors group"
            title="הגדרות חשבון"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm ring-2 ring-white group-hover:ring-orange-200 transition-all">
              {initials}
            </div>
            <svg className="w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Center: finance button */}
          <div className="flex items-center gap-2">
            {onFinance && (
              <button onClick={onFinance}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-colors"
              >
                <span>💰</span>
                <span className="hidden sm:inline">פיננסי</span>
              </button>
            )}
            {/* Mini theme swatch — just a visual indicator, no action */}
            <div
              className="w-6 h-6 rounded-full border-2 border-white shadow-sm cursor-pointer hover:scale-110 transition-transform"
              style={{ background: currentTheme.preview }}
              title={`רקע: ${currentTheme.label}`}
              onClick={() => { setShowSettings(true); setSettingsTab("appearance"); }}
            />
          </div>

          {/* Logo — left side in RTL */}
          <div dir="ltr">
            <img src="/beseder_primary_2x.png" alt="beseder" className="block" style={{ height: 40, width: "auto", maxWidth: 140 }} />
          </div>
        </div>
      </nav>

      {/* ── Settings Drawer ────────────────────────────────── */}
      {showSettings && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            onClick={() => setShowSettings(false)}
            style={{ animation: "fadeIn 0.2s ease-out" }}
          />

          {/* Drawer panel — slides in from right (RTL = left side visually) */}
          <div
            className="fixed top-0 right-0 h-full bg-white z-50 flex flex-col overflow-hidden"
            style={{
              width: "min(400px, 100vw)",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.12)",
              animation: "slideInRight 0.28s cubic-bezier(0.22,1,0.36,1)",
            }}
          >
            {/* ── Drawer header ── */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <h2 className="font-black text-gray-900 text-base">הגדרות</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors text-lg"
                aria-label="סגור"
              >
                ×
              </button>
            </div>

            {/* ── Profile card ── */}
            <div className="px-5 py-4 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center text-white text-base font-bold shadow-md flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-gray-900 truncate">{firstName}</p>
                  <p className="text-xs text-gray-400 truncate">{userEmail}</p>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-orange-50 text-orange-600 text-[11px] font-bold border border-orange-100 flex-shrink-0">
                  FREE
                </span>
              </div>
            </div>

            {/* ── Tab bar ── */}
            <div className="flex border-b border-gray-100 flex-shrink-0 overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSettingsTab(tab.id)}
                  className="flex-1 min-w-fit px-3 py-3 text-xs font-semibold transition-colors whitespace-nowrap"
                  style={{
                    color: settingsTab === tab.id ? "#f97316" : "#6b7280",
                    borderBottom: settingsTab === tab.id ? "2px solid #f97316" : "2px solid transparent",
                    background: "transparent",
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* ── Tab content ── */}
            <div className="flex-1 overflow-y-auto">

              {/* ── 🎨 Appearance ── */}
              {settingsTab === "appearance" && (
                <div className="p-5 space-y-5">
                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">צבעים אחידים</p>
                    <div className="grid grid-cols-4 gap-2">
                      {BG_THEMES.filter(t => !t.bgImage).map(theme => (
                        <button key={theme.id} onClick={() => handlePickTheme(theme)} title={theme.label}
                          className="flex flex-col items-center gap-1 group">
                          <div className="w-full h-12 rounded-xl transition-all group-hover:scale-105 group-hover:shadow-md"
                            style={{
                              background: theme.preview,
                              border: bgThemeId === theme.id ? "2.5px solid #f97316" : "2px solid rgba(0,0,0,0.08)",
                              boxShadow: bgThemeId === theme.id ? "0 0 0 3px #f9731630" : undefined,
                            }} />
                          <span className="text-[9px] font-semibold text-gray-400 truncate w-full text-center">{theme.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">גרדיאנטים ונוף</p>
                    <div className="grid grid-cols-4 gap-2">
                      {BG_THEMES.filter(t => !!t.bgImage).map(theme => (
                        <button key={theme.id} onClick={() => handlePickTheme(theme)} title={theme.label}
                          className="flex flex-col items-center gap-1 group">
                          <div className="w-full h-12 rounded-xl transition-all group-hover:scale-105 group-hover:shadow-md"
                            style={{
                              background: theme.preview,
                              border: bgThemeId === theme.id ? "2.5px solid #f97316" : "2px solid rgba(0,0,0,0.08)",
                              boxShadow: bgThemeId === theme.id ? "0 0 0 3px #f9731630" : undefined,
                            }} />
                          <span className="text-[9px] font-semibold text-gray-400 truncate w-full text-center">{theme.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-gray-50 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex-shrink-0"
                      style={{ background: currentTheme.preview, border: "1.5px solid rgba(0,0,0,0.08)" }} />
                    <div>
                      <p className="text-xs font-bold text-gray-700">נבחר: {currentTheme.label}</p>
                      <p className="text-[10px] text-gray-400">הרקע נשמר אוטומטית</p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── ⚙️ Account ── */}
              {settingsTab === "account" && (
                <div className="p-5 space-y-4">
                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">כתובת מייל</label>
                    <div className="input text-sm text-gray-500 bg-gray-50 cursor-default select-all">
                      {userEmail}
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">שם תצוגה</label>
                    <input
                      className="input text-sm"
                      placeholder={firstName}
                      defaultValue={firstName}
                      onChange={() => {/* future: save display name */}}
                    />
                    <p className="text-[10px] text-gray-400 mt-1">בקרוב — שמירת שם תצוגה</p>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">התראות</p>
                    <div className="space-y-3">
                      {[
                        { label: "עדכונים במייל",        sub: "סיכום שבועי ותזכורות", val: notifEmail, set: setNotifEmail },
                        { label: "התראות Push",           sub: "על מכשיר זה (בקרוב)",  val: notifPush,  set: setNotifPush  },
                      ].map(item => (
                        <div key={item.label} className="flex items-center justify-between p-3 rounded-xl bg-gray-50">
                          <div>
                            <p className="text-sm font-semibold text-gray-700">{item.label}</p>
                            <p className="text-[11px] text-gray-400">{item.sub}</p>
                          </div>
                          <button
                            onClick={() => item.set(v => !v)}
                            className="relative w-11 h-6 rounded-full transition-colors flex-shrink-0"
                            style={{ background: item.val ? "#f97316" : "#d1d5db" }}
                          >
                            <span
                              className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all"
                              style={{ right: item.val ? "0.125rem" : "auto", left: item.val ? "auto" : "0.125rem" }}
                            />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="border-t border-gray-100 pt-4">
                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">אבטחה</p>
                    <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-right">
                      <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-base shadow-sm flex-shrink-0">🔑</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-700">שנה סיסמה</p>
                        <p className="text-[11px] text-gray-400">לינק ישלח למייל שלך</p>
                      </div>
                      <span className="text-gray-300 text-lg">←</span>
                    </button>
                    <button className="mt-2 w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-right">
                      <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-base shadow-sm flex-shrink-0">📱</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-700">אימות דו-שלבי</p>
                        <p className="text-[11px] text-gray-400">בקרוב</p>
                      </div>
                      <span className="text-[10px] font-bold text-gray-300 bg-gray-200 px-2 py-0.5 rounded-full">Soon</span>
                    </button>
                  </div>

                  <div className="border-t border-red-50 pt-4">
                    <button
                      onClick={handleLogout}
                      disabled={loggingOut}
                      className="w-full flex items-center gap-3 p-3 rounded-xl bg-red-50 hover:bg-red-100 transition-colors text-right disabled:opacity-50"
                    >
                      <span className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-base shadow-sm flex-shrink-0">
                        {loggingOut ? "⏳" : "👋"}
                      </span>
                      <p className="text-sm font-bold text-red-600">{loggingOut ? "מתנתק..." : "התנתק מהחשבון"}</p>
                    </button>
                  </div>
                </div>
              )}

              {/* ── 💎 Billing ── */}
              {settingsTab === "billing" && (
                <div className="p-5 space-y-4">
                  {/* Current plan */}
                  <div className="rounded-2xl border-2 border-gray-200 p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">תוכנית נוכחית</span>
                      <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold">FREE</span>
                    </div>
                    <ul className="space-y-2 text-sm text-gray-600">
                      {["עד 3 מותגים","מעקב שלבים בסיסי","שמירה בענן","גישה מהמובייל"].map(f => (
                        <li key={f} className="flex items-center gap-2"><span className="text-green-500 text-base">✓</span>{f}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Pro plan CTA */}
                  <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg,#1e2130 0%,#312e81 100%)" }}>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">💎</span>
                        <h3 className="font-black text-white text-base">Beseder Pro</h3>
                        <span className="px-2 py-0.5 rounded-full bg-orange-500 text-white text-[10px] font-black">HOT</span>
                      </div>
                      <p className="text-blue-200 text-xs mb-4">כל מה שצריך כדי לצמוח מהר</p>
                      <ul className="space-y-2 mb-5">
                        {[
                          "מותגים ופרויקטים ללא הגבלה",
                          "לוח בקרה פיננסי מלא",
                          "ייצוא CSV ו-PDF",
                          "AI insights — תובנות אוטומטיות",
                          "שיתוף צוות (עד 5 חברים)",
                          "עדיפות בתמיכה",
                        ].map(f => (
                          <li key={f} className="flex items-center gap-2 text-xs text-white/90">
                            <span className="text-orange-400 text-sm">✦</span>{f}
                          </li>
                        ))}
                      </ul>
                      <div className="flex items-baseline gap-1.5 mb-4">
                        <span className="text-3xl font-black text-white">₪79</span>
                        <span className="text-blue-200 text-sm">/ חודש</span>
                      </div>
                      <button
                        className="w-full py-3 rounded-xl font-black text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ background: "linear-gradient(135deg,#f97316,#ea580c)", color: "white", boxShadow: "0 4px 20px rgba(249,115,22,0.4)" }}
                        onClick={() => alert("בקרוב! נשלח לך מייל כשהתוכנית מוכנה 🚀")}
                      >
                        שדרג ל-Pro →
                      </button>
                      <p className="text-center text-[10px] text-blue-200/60 mt-2">ביטול בכל עת · ללא התחייבות</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-orange-50 border border-orange-100 text-center">
                    <p className="text-xs font-semibold text-orange-700">🎁 הטבה לחשבונות מוקדמים</p>
                    <p className="text-[11px] text-orange-500 mt-0.5">נרשמת מוקדם — תקבל 3 חודשים ראשונים במחיר מיוחד</p>
                  </div>
                </div>
              )}

              {/* ── ❓ Support ── */}
              {settingsTab === "support" && (
                <div className="p-5 space-y-3">
                  {[
                    { icon: "📖", title: "מדריך שימוש",       sub: "כיצד להשתמש ב-Beseder",       action: () => window.open("mailto:support@getbeseder.com?subject=מדריך", "_blank") },
                    { icon: "💬", title: "צור קשר",            sub: "support@getbeseder.com",       action: () => window.open("mailto:support@getbeseder.com", "_blank") },
                    { icon: "🐛", title: "דווח על באג",        sub: "עזור לנו להשתפר",             action: () => window.open("mailto:support@getbeseder.com?subject=באג ב-Beseder", "_blank") },
                    { icon: "💡", title: "הצע פיצ'ר",          sub: "יש לך רעיון? נשמח לשמוע",     action: () => window.open("mailto:support@getbeseder.com?subject=פיצ'ר חדש", "_blank") },
                    { icon: "⭐", title: "דרג אותנו",          sub: "עוזר לנו לצמוח",              action: () => alert("תודה! בקרוב נשיק דף ביקורות 🙏") },
                  ].map(item => (
                    <button
                      key={item.title}
                      onClick={item.action}
                      className="w-full flex items-center gap-3 p-3.5 rounded-xl bg-gray-50 hover:bg-gray-100 active:scale-[0.98] transition-all text-right"
                    >
                      <span className="w-9 h-9 rounded-xl bg-white flex items-center justify-center text-lg shadow-sm flex-shrink-0">{item.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                        <p className="text-[11px] text-gray-400 truncate">{item.sub}</p>
                      </div>
                      <span className="text-gray-300 text-base">←</span>
                    </button>
                  ))}

                  <div className="pt-4 text-center">
                    <p className="text-[11px] text-gray-400">גרסה 1.0.0 · Beseder CRM</p>
                    <p className="text-[10px] text-gray-300 mt-0.5">© 2025 Beseder. כל הזכויות שמורות.</p>
                  </div>
                </div>
              )}
            </div>

            {/* ── Drawer footer ── */}
            <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0 bg-gray-50/80">
              <button
                onClick={() => setShowSettings(false)}
                className="w-full py-2.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-200 hover:text-gray-800 transition-colors"
              >
                סגור
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function BackButton({ emoji, label, onClick }: { emoji?: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3.5 rounded-xl bg-white border border-gray-200 shadow-sm text-sm font-semibold text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:shadow-md transition-all duration-150 group active:scale-95"
      style={{ minHeight: 44 }}
    >
      <span className="text-gray-400 group-hover:text-gray-700 transition-colors text-base leading-none">→</span>
      {emoji && <span className="text-base leading-none">{emoji}</span>}
      <span className="max-w-[130px] sm:max-w-none truncate">{label}</span>
    </button>
  );
}

/* ─── Brand card ──────────────────────────────────────── */
function BrandCard({ brand, health, onClick, onEdit, onDelete, onSetup, onHide, onDragStart, onDragOver, onDrop, onDragEnd, isDragOver }: {
  brand: Brand; health: BrandHealth; onClick: () => void; onEdit: () => void; onDelete: () => void; onSetup: () => void; onHide: () => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  isDragOver: boolean;
}) {
  const allSubs   = brand.projects.flatMap(p => p.subProjects);
  const nProjects = brand.projects.length;

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      className="card overflow-hidden flex flex-col hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group cursor-grab active:cursor-grabbing"
      style={{
        outline: isDragOver ? `2px solid ${brand.color}` : "none",
        outlineOffset: 2,
        opacity: isDragOver ? 0.85 : brand.hidden ? 0.45 : 1,
        transform: isDragOver ? "scale(0.98)" : undefined,
        transition: "all 0.15s ease",
      }}
    >
      <div className="h-2 w-full rounded-t-[18px]" style={{ background: brand.color }} />
      <div className="p-3 sm:p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onClick} className="flex items-start gap-3 flex-1 text-right">
            {brand.logo
              ? <img src={brand.logo} alt={brand.name} className="w-10 h-10 rounded-xl object-contain bg-gray-50 border border-gray-100 flex-shrink-0" />
              : <span className="text-3xl mt-0.5 flex-shrink-0">{brand.emoji}</span>
            }
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-black text-gray-900 text-base leading-tight">{brand.name}</h3>
                {/* Health dot */}
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: HEALTH_COLORS[health.level] }}
                  title={health.level === "critical" ? "דחוף" : health.level === "attention" ? "דורש תשומת לב" : health.level === "good" ? "תקין" : "ריק"}
                />
              </div>
              {/* Status badges */}
              <div className="flex gap-1 flex-wrap mt-1">
                {health.blockedCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#fee2e2", color: "#dc2626" }}>
                    {health.blockedCount} תקוע
                  </span>
                )}
                {health.activeCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#dbeafe", color: "#1d4ed8" }}>
                    {health.activeCount} פעיל
                  </span>
                )}
              </div>
              {/* Next action preview */}
              {health.topNextAction && (
                <p className="text-[10px] text-gray-400 mt-0.5 truncate">→ {health.topNextAction}</p>
              )}
            </div>
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <span
              className="w-6 h-6 hidden sm:flex items-center justify-center text-gray-300 group-hover:text-gray-400 transition-colors cursor-grab select-none"
              title="גרור לשינוי סדר"
              style={{ fontSize: 14 }}
            >⠿</span>
            <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
              <button onClick={e => { e.stopPropagation(); onHide(); }}   className="icon-btn w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-gray-100 hover:bg-yellow-50 text-gray-400 hover:text-yellow-600 flex items-center justify-center text-xs" title={brand.hidden ? "הצג" : "הסתר"}>{brand.hidden ? "👁" : "🙈"}</button>
              <button onClick={e => { e.stopPropagation(); onEdit(); }}   className="icon-btn w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-gray-100 hover:bg-teal-50 text-gray-400 hover:text-teal-600 flex items-center justify-center text-xs">✏️</button>
              <button onClick={e => { e.stopPropagation(); onDelete(); }} className="icon-btn w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-gray-100 hover:bg-red-50   text-gray-400 hover:text-red-400   flex items-center justify-center text-sm font-bold">×</button>
            </div>
          </div>
        </div>

        <button onClick={onClick} className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-400">{nProjects} מחלקות</span>
          {health.activeCount > 0 && (
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#eff6ff", color: "#2563eb" }}>
              ▶ {health.activeCount} פעיל
            </span>
          )}
          {health.activeCount === 0 && allSubs.length > 0 && (
            <span className="text-xs text-gray-300">אין משימות פעילות</span>
          )}
        </button>

        {/* Setup CTA — shown when stages lack next actions */}
        {health.noNextActionCount > 0 && health.level !== "empty" && (
          <button
            onClick={e => { e.stopPropagation(); onSetup(); }}
            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl border-2 border-dashed text-xs font-bold transition-all hover:opacity-80"
            style={{ borderColor: "#f59e0b", color: "#b45309", background: "#fffbeb" }}
          >
            <span className="sm:hidden">⚡ {health.noNextActionCount} משימות חסרות</span>
            <span className="hidden sm:inline">⚡ השלם הגדרה ({health.noNextActionCount} משימות)</span>
          </button>
        )}

        <button onClick={onClick} className="btn btn-ghost w-full justify-center text-sm mt-auto" style={{ borderColor: brand.color + "40", color: brand.color }}>
          פתח מותג ←
        </button>
      </div>
    </div>
  );
}

/* ─── Project card ────────────────────────────────────── */
function ProjectCard({ project, onClick, onEdit, onDelete, onDragStart, onDragOver, onDrop, onDragEnd }: {
  project: Project;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart?: () => void;
  onDragOver?: () => void;
  onDrop?: () => void;
  onDragEnd?: () => void;
}) {
  const blocked = project.subProjects.reduce((n, sp) => n + sp.stages.filter(s => s.status === "blocked").length, 0);
  const active  = project.subProjects.reduce((n, sp) => n + sp.stages.filter(s => s.status === "active").length, 0);

  return (
    <div
      className="card overflow-hidden flex flex-col hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group cursor-move h-full"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="h-1 w-full" style={{ background: project.color }} />
      <div className="p-3 flex flex-col gap-2 flex-1">
        {/* Title + actions row */}
        <div className="flex items-start justify-between gap-1">
          <button onClick={onClick} className="flex items-center gap-2 flex-1 text-right min-w-0">
            <span className="text-2xl flex-shrink-0">{project.emoji}</span>
            <h3 className="font-black text-gray-900 text-sm leading-tight">{project.name}</h3>
          </button>
          <div className="flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={e => { e.stopPropagation(); onEdit(); }}   className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-teal-50 text-gray-400 hover:text-teal-600 flex items-center justify-center text-xs">✏️</button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50 text-gray-400 hover:text-red-400 flex items-center justify-center text-sm font-bold">×</button>
          </div>
        </div>
        {/* Stats */}
        <button onClick={onClick} className="flex items-center gap-1.5 flex-wrap mt-auto">
          <span className="text-[11px] text-gray-400">{project.subProjects.length} פרויקטים</span>
          {active  > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">▶ {active}</span>}
          {blocked > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50 text-red-600">⚠ {blocked}</span>}
        </button>
      </div>
    </div>
  );
}

/* ─── Sub-project card ────────────────────────────────── */
function SubProjectCard({ sub, color, onClick, onEdit, onDelete }: {
  sub: SubProject; color: string;
  onClick: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const blocked     = sub.stages.filter(s => s.status === "blocked").length;
  const active      = sub.stages.filter(s => s.status === "active").length;
  const done        = sub.stages.filter(s => s.status === "done").length;
  const monthlyExp  = subMonthlyExpenses(sub);
  const monthlyInc  = subMonthlyIncomes(sub);

  return (
    <div className="card overflow-hidden flex flex-col hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group h-full">
      <div className="h-1 w-full" style={{ background: color, opacity: 0.6 }} />
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-1">
          <button onClick={onClick} className="flex items-center gap-2 flex-1 text-right min-w-0">
            <span className="text-2xl flex-shrink-0">{sub.emoji}</span>
            <h3 className="font-black text-gray-900 text-sm leading-tight">{sub.name}</h3>
          </button>
          <div className="flex gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={onEdit}   className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-teal-50 text-gray-400 hover:text-teal-600 flex items-center justify-center text-xs">✏️</button>
            <button onClick={onDelete} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50   text-gray-400 hover:text-red-400   flex items-center justify-center text-sm font-bold">×</button>
          </div>
        </div>
        <button onClick={onClick} className="flex items-center gap-1.5 flex-wrap mt-auto">
          <span className="text-[11px] text-gray-400">{sub.stages.length} שלבים</span>
          {active  > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-700">▶ {active}</span>}
          {blocked > 0 && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-50  text-red-600">⚠ {blocked}</span>}
          {done    > 0 && <span className="text-[10px] font-semibold text-green-600">✓ {done}</span>}
        </button>
      </div>
    </div>
  );
}

/* ─── Channel card ────────────────────────────────────── */
function ChannelCard({ channel, color, onClick, onEdit, onDelete }: {
  channel: Channel; color: string;
  onClick: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const done       = channel.stages.filter(s => s.status === "done").length;
  const blocked    = channel.stages.filter(s => s.status === "blocked").length;
  const active     = channel.stages.filter(s => s.status === "active").length;
  const monthlyExp = (channel.expenses ?? []).reduce((sum, e) => sum + e.amount, 0) +
    channel.stages.reduce((sum, s) => sum + (s.expenses ?? []).reduce((a, e) => a + e.amount, 0), 0);
  const monthlyInc = (channel.incomes ?? []).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="card overflow-hidden flex flex-col hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
      <div className="h-1 w-full" style={{ background: color, opacity: 0.7 }} />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onClick} className="flex items-center gap-3 flex-1 text-right">
            <span className="text-2xl">{channel.emoji}</span>
            <div>
              <h3 className="font-bold text-gray-900 text-base leading-tight">{channel.name}</h3>
              {channel.description && <p className="text-sm text-gray-400 mt-0.5">{channel.description}</p>}
            </div>
          </button>
          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={onEdit}   className="icon-btn w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-gray-100 hover:bg-teal-50 text-gray-400 hover:text-teal-600 flex items-center justify-center text-xs">✏️</button>
            <button onClick={onDelete} className="icon-btn w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-gray-100 hover:bg-red-50   text-gray-400 hover:text-red-400   flex items-center justify-center text-sm font-bold">×</button>
          </div>
        </div>

        {(monthlyInc > 0 || monthlyExp > 0) && (
          <div className="flex gap-1.5 flex-wrap">
            {monthlyInc > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "#f0fdf4", border: "1px solid #86efac" }}>
                <span className="text-xs">💚</span>
                <span className="text-xs font-bold text-green-700">₪{monthlyInc.toLocaleString("he-IL")}/חודש</span>
              </div>
            )}
            {monthlyExp > 0 && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-lg" style={{ background: "#fef3c7", border: "1px solid #fde68a" }}>
                <span className="text-xs">💸</span>
                <span className="text-xs font-bold text-amber-700">₪{monthlyExp.toLocaleString("he-IL")}/חודש</span>
              </div>
            )}
          </div>
        )}

        {channel.stages.length > 0 ? (
          <button onClick={onClick} className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-400">{channel.stages.length} משימות</span>
            {active > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#eff6ff", color: "#2563eb" }}>
                ▶ {active} פעיל
              </span>
            )}
            {blocked > 0 && (
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#fee2e2", color: "#dc2626" }}>
                ⚠ {blocked} תקוע
              </span>
            )}
            {done > 0 && (
              <span className="text-[11px] font-semibold text-green-600">✓ {done}</span>
            )}
          </button>
        ) : (
          <p className="text-sm text-gray-300">אין משימות עדיין</p>
        )}

        <button onClick={onClick} className="btn btn-ghost w-full justify-center text-sm mt-auto">
          פתח פריט ←
        </button>
      </div>
    </div>
  );
}

/* ─── One-time brand/financial migration (REMOVED) ──────────
 * The original one-time seed for daniel@daniel-social.com contained real
 * personal/financial data and was being shipped to every client in the public
 * bundle. That data has long since synced to Supabase cloud (user_data), so the
 * inline seed was redundant. It has been removed for privacy. A verbatim backup
 * is kept outside the repo at:
 *   ~/Documents/beseder-private-backup/migration-pii-backup-*.ts.txt
 * If a fresh device ever needs re-seeding, restore from that backup locally. */
const PERSONAL_FINANCE_BRAND_ID = "f5645d60-7c07-47d0-b863-59be62f112aa";
/* ─── Main ────────────────────────────────────────────── */
export default function Dashboard() {
  const [brands,           setBrands]          = useState<Brand[]>([]);
  const [activeBrand,      setActiveBrand]     = useState<Brand | null>(null);
  const [activeProject,    setActiveProject]   = useState<Project | null>(null);
  const [activeSubProject, setActiveSubProject]= useState<SubProject | null>(null);
  const [activeChannel,    setActiveChannel]    = useState<Channel | null>(null);
  const [selectedStage,    setSelectedStage]   = useState<Stage | null>(null);
  const [loaded,           setLoaded]          = useState(false);

  // Modals
  const [showBrandModal,   setShowBrandModal]  = useState(false);
  const [editingBrand,     setEditingBrand]    = useState<Brand | null>(null);
  const [showProjectModal, setShowProjectModal]= useState(false);
  const [editingProject,   setEditingProject]  = useState<Project | null>(null);
  const [showSubModal,     setShowSubModal]    = useState(false);
  const [editingSub,       setEditingSub]      = useState<SubProject | null>(null);
  const [showChannelModal, setShowChannelModal]= useState(false);
  const [editingChannel,   setEditingChannel]  = useState<Channel | null>(null);
  const [showWhiteboard,       setShowWhiteboard]       = useState(false);
  const [showBrandFinancial,   setShowBrandFinancial]   = useState(false);
  const [showLoansManager,     setShowLoansManager]     = useState(false);
  const [setupBrand,       setSetupBrand]      = useState<Brand | null>(null);
  const [showWBBuilder,    setShowWBBuilder]   = useState(false);
  const [userEmail,        setUserEmail]       = useState("");

  // Drag-to-reorder brand cards
  const dragBrandId = useRef<string | null>(null);
  const [dragOverBrandId, setDragOverBrandId] = useState<string | null>(null);

  // Drag-to-reorder project cards
  const dragProjectId = useRef<string | null>(null);
  const [dragOverProjectId, setDragOverProjectId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? "");
    });
    const local = loadBrands();
    setBrands(local);
    setLoaded(true);
    loadBrandsFromCloud().then(cloud => {
      const base = (cloud && cloud.length > 0) ? cloud : local;
      if (!cloud && local.length > 0) {
        saveBrands(base);
      }
      setBrands(base);
      if (typeof window !== "undefined") {
        localStorage.setItem("vaachalta_brands_v1", JSON.stringify(base));
      }
      if (base.length === 0) {
        setTimeout(() => setShowBrandModal(true), 400);
      }
    });
  }, []);

  /* ── persist + sync active objects ── */
  const syncAll = (updated: Brand[]) => {
    setBrands(updated);
    saveBrands(updated);
    if (activeBrand) {
      const ab = updated.find(b => b.id === activeBrand.id) ?? null;
      setActiveBrand(ab);
      if (ab && activeProject) {
        const ap = ab.projects.find(p => p.id === activeProject.id) ?? null;
        setActiveProject(ap);
        if (ap && activeSubProject) {
          const asp = ap.subProjects.find(s => s.id === activeSubProject.id) ?? null;
          setActiveSubProject(asp);
          if (asp && activeChannel) {
            setActiveChannel(asp.channels.find(c => c.id === activeChannel.id) ?? null);
          }
        }
      }
    }
  };


  /* ── Drag-to-reorder brands ── */
  const handleBrandDragStart = (e: React.DragEvent, id: string) => {
    dragBrandId.current = id;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleBrandDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragBrandId.current !== id) setDragOverBrandId(id);
  };
  const handleBrandDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const fromId = dragBrandId.current;
    dragBrandId.current = null;
    setDragOverBrandId(null);
    if (!fromId || fromId === targetId) return;
    const from = brands.findIndex(b => b.id === fromId);
    const to   = brands.findIndex(b => b.id === targetId);
    if (from === -1 || to === -1) return;
    const updated = [...brands];
    const [removed] = updated.splice(from, 1);
    updated.splice(to, 0, removed);
    syncAll(updated);
  };
  const handleBrandDragEnd = () => {
    dragBrandId.current = null;
    setDragOverBrandId(null);
  };

  /* ── Drag-to-reorder projects ── */
  const handleProjectDragStart = (e: React.DragEvent, id: string) => {
    dragProjectId.current = id;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleProjectDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragProjectId.current !== id) setDragOverProjectId(id);
  };
  const handleProjectDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    const fromId = dragProjectId.current;
    dragProjectId.current = null;
    setDragOverProjectId(null);
    if (!fromId || fromId === targetId || !activeBrand) return;
    const from = activeBrand.projects.findIndex(p => p.id === fromId);
    const to   = activeBrand.projects.findIndex(p => p.id === targetId);
    if (from === -1 || to === -1) return;
    const updated = [...activeBrand.projects];
    const [removed] = updated.splice(from, 1);
    updated.splice(to, 0, removed);
    syncAll(brands.map(b => b.id === activeBrand.id ? { ...b, projects: updated } : b));
  };
  const handleProjectDragEnd = () => {
    dragProjectId.current = null;
    setDragOverProjectId(null);
  };

  /* ── Brand CRUD ── */
  const handleSaveBrand = (brand: Brand) => {
    const updated = brands.find(b => b.id === brand.id)
      ? brands.map(b => b.id === brand.id ? brand : b)
      : [...brands, brand];
    syncAll(updated);
  };

  const handleDeleteBrand = (id: string) => {
    if (!confirm("למחוק מותג זה וכל המחלקות שלו?")) return;
    const updated = brands.filter(b => b.id !== id);
    setBrands(updated);
    saveBrands(updated);
    if (activeBrand?.id === id) { setActiveBrand(null); setActiveProject(null); setActiveSubProject(null); }
  };

  /* ── Project CRUD ── */
  const handleSaveProject = (project: Project) => {
    if (!activeBrand) return;
    const projs = activeBrand.projects;
    const updated = projs.find(p => p.id === project.id)
      ? projs.map(p => p.id === project.id ? project : p)
      : [...projs, project];
    syncAll(brands.map(b => b.id === activeBrand.id ? { ...b, projects: updated } : b));
  };

  const handleDeleteProject = (id: string) => {
    if (!activeBrand || !confirm("למחוק מחלקה זו?")) return;
    const updated = activeBrand.projects.filter(p => p.id !== id);
    syncAll(brands.map(b => b.id === activeBrand.id ? { ...b, projects: updated } : b));
    if (activeProject?.id === id) { setActiveProject(null); setActiveSubProject(null); }
  };

  /* ── Sub-project CRUD ── */
  const updateProject = (project: Project) => {
    if (!activeBrand) return;
    const projs = activeBrand.projects.map(p => p.id === project.id ? project : p);
    syncAll(brands.map(b => b.id === activeBrand.id ? { ...b, projects: projs } : b));
  };

  const handleSaveSub = (sub: SubProject) => {
    if (!activeProject) return;
    const subs = activeProject.subProjects.find(s => s.id === sub.id)
      ? activeProject.subProjects.map(s => s.id === sub.id ? sub : s)
      : [...activeProject.subProjects, sub];
    updateProject({ ...activeProject, subProjects: subs });
  };

  const handleDeleteSub = (id: string) => {
    if (!activeProject || !confirm("למחוק פרויקט זה?")) return;
    updateProject({ ...activeProject, subProjects: activeProject.subProjects.filter(s => s.id !== id) });
    if (activeSubProject?.id === id) setActiveSubProject(null);
  };

  /* ── Stage CRUD ── */
  const updateSub = (sub: SubProject) => {
    if (!activeProject) return;
    const p = { ...activeProject, subProjects: activeProject.subProjects.map(s => s.id === sub.id ? sub : s) };
    updateProject(p);
    setActiveSubProject(sub);
  };

  /** Called from SubProjectModal when user clicks "פתח ערוץ ←" on an expense row */
  const handleNavigateToChannel = (subProjectId: string, channelId: string) => {
    if (!activeProject) return;
    // Find the updated subProject (after save)
    const sub = activeProject.subProjects.find(s => s.id === subProjectId);
    if (!sub) return;
    const ch = sub.channels.find(c => c.id === channelId);
    if (!ch) return;
    setActiveSubProject(sub);
    setActiveChannel(ch);
  };

  const handleSaveStage = (stage: Stage) => {
    if (!activeSubProject) return;
    updateSub({ ...activeSubProject, stages: activeSubProject.stages.map(s => s.id === stage.id ? stage : s) });
  };

  const handleDeleteStage = (id: string) => {
    if (!activeSubProject) return;
    updateSub({ ...activeSubProject, stages: activeSubProject.stages.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })) });
  };

  const handleAddStageAfter = () => {
    if (!activeSubProject || !selectedStage) return;
    const idx  = activeSubProject.stages.findIndex(s => s.id === selectedStage.id);
    const newS = { ...createStage(idx + 1), id: uuidv4() };
    const stages = [...activeSubProject.stages];
    stages.splice(idx + 1, 0, newS);
    updateSub({ ...activeSubProject, stages: stages.map((s, i) => ({ ...s, order: i })) });
    setTimeout(() => setSelectedStage(newS), 50);
  };

  const handleAddStageEnd = () => {
    if (!activeSubProject) return;
    const newS = { ...createStage(activeSubProject.stages.length), id: uuidv4() };
    updateSub({ ...activeSubProject, stages: [...activeSubProject.stages, newS] });
    setTimeout(() => setSelectedStage(newS), 50);
  };

  /* ── Channel CRUD ── */
  const handleSaveChannel = (ch: Channel) => {
    if (!activeSubProject) return;
    const channels = activeSubProject.channels.find(c => c.id === ch.id)
      ? activeSubProject.channels.map(c => c.id === ch.id ? ch : c)
      : [...activeSubProject.channels, ch];
    updateSub({ ...activeSubProject, channels });
  };

  const handleDeleteChannel = (id: string) => {
    if (!activeSubProject || !confirm("למחוק פרויקט זה?")) return;
    updateSub({ ...activeSubProject, channels: activeSubProject.channels.filter(c => c.id !== id) });
    if (activeChannel?.id === id) setActiveChannel(null);
  };

  /* ── Channel stage CRUD ── */
  const updateChannel = (ch: Channel) => {
    if (!activeSubProject) return;
    const sub = { ...activeSubProject, channels: activeSubProject.channels.map(c => c.id === ch.id ? ch : c) };
    updateSub(sub);
    setActiveChannel(ch);
  };

  const handleSaveChannelStage = (stage: Stage) => {
    if (!activeChannel) return;
    updateChannel({ ...activeChannel, stages: activeChannel.stages.map(s => s.id === stage.id ? stage : s) });
  };

  const handleDeleteChannelStage = (id: string) => {
    if (!activeChannel) return;
    updateChannel({ ...activeChannel, stages: activeChannel.stages.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i })) });
  };

  const handleAddChannelStageAfter = () => {
    if (!activeChannel || !selectedStage) return;
    const idx = activeChannel.stages.findIndex(s => s.id === selectedStage.id);
    const newS = { ...createStage(idx + 1), id: uuidv4() };
    const stages = [...activeChannel.stages];
    stages.splice(idx + 1, 0, newS);
    updateChannel({ ...activeChannel, stages: stages.map((s, i) => ({ ...s, order: i })) });
    setTimeout(() => setSelectedStage(newS), 50);
  };

  const handleAddChannelStageEnd = () => {
    if (!activeChannel) return;
    const newS = { ...createStage(activeChannel.stages.length), id: uuidv4() };
    updateChannel({ ...activeChannel, stages: [...activeChannel.stages, newS] });
    setTimeout(() => setSelectedStage(newS), 50);
  };

  /* ─── Loading ─────────────────────────────────────────── */
  if (!loaded) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center"><div className="text-4xl mb-3">⚡</div><p className="text-gray-400 font-medium">טוען...</p></div>
    </div>
  );

  /* ══ LEVEL 4: Channel → Stages pipeline ══ */
  if (activeChannel && activeSubProject && activeProject && activeBrand) {
    const sorted   = [...activeChannel.stages].sort((a, b) => a.order - b.order);
    const done     = sorted.filter(s => s.status === "done").length;
    const progress = sorted.length > 0 ? Math.round((done / sorted.length) * 100) : 0;

    return (
      <div className="min-h-screen">
        <TopNav userEmail={userEmail} onFinance={() => setShowLoansManager(true)} />
        <BreadcrumbSidebar color={activeProject.color} items={[
          { emoji: activeBrand.emoji,      name: activeBrand.name,      onClick: () => { setActiveProject(null); setActiveSubProject(null); setActiveChannel(null); setSelectedStage(null); }, isCurrent: false },
          { emoji: activeProject.emoji,    name: activeProject.name,    onClick: () => { setActiveSubProject(null); setActiveChannel(null); setSelectedStage(null); },                        isCurrent: false },
          { emoji: activeSubProject.emoji, name: activeSubProject.name, onClick: () => { setActiveChannel(null); setSelectedStage(null); },                                                   isCurrent: false },
          { emoji: activeChannel.emoji,    name: activeChannel.name,    onClick: () => {},                                                                                                    isCurrent: true  },
        ]} />
        {selectedStage && (
          <StageEditDrawer
            stage={selectedStage}
            stageNumber={sorted.findIndex(s => s.id === selectedStage.id) + 1}
            totalStages={sorted.length}
            onClose={() => setSelectedStage(null)}
            onSave={stage => { handleSaveChannelStage(stage); setSelectedStage(null); }}
            onDelete={id => { handleDeleteChannelStage(id); setSelectedStage(null); }}
            onAddAfter={handleAddChannelStageAfter}
          />
        )}

        {/* ── Channel context bar ── */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
          <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => { setActiveChannel(null); setSelectedStage(null); }}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors text-base font-bold"
                aria-label="חזרה"
              >→</button>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-sm"
                style={{ background: activeProject.color + "22", border: `1.5px solid ${activeProject.color}40` }}
              >{activeChannel.emoji}</div>
              <div className="min-w-0">
                <p className="font-black text-gray-900 text-sm leading-tight truncate">{activeChannel.name}</p>
                {activeChannel.description && (
                  <p className="text-[10px] text-gray-400 truncate hidden sm:block">{activeChannel.description}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setEditingChannel(activeChannel)}
                className="flex w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 items-center justify-center text-base transition-colors"
                title="ערוך"
              >✏️</button>
              <button onClick={handleAddChannelStageEnd} className="btn btn-orange text-sm px-3 h-9">+ <span className="hidden sm:inline">משימה</span></button>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-5 space-y-5 animate-in">

          <div className="card px-5 py-4">
            <div className="flex gap-4 flex-wrap">
              {(["todo","active","done","blocked"] as StageStatus[]).map(s => {
                const count = sorted.filter(st => st.status === s).length;
                if (!count) return null;
                return (
                  <div key={s} className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{ background: STATUS_META[s].dot }} />
                    <span className="text-xs text-gray-500">{STATUS_META[s].label}: <strong>{count}</strong></span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-800">משימות</h2>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">לחץ לעריכה</span>
            </div>
            {sorted.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-4xl mb-2">📋</p>
                <p className="font-medium mb-3">אין משימות עדיין</p>
                <button onClick={handleAddChannelStageEnd} className="btn btn-orange text-sm">+ הוסף משימה ראשונה</button>
              </div>
            ) : (
              <ProjectPipeline stages={sorted} onClickStage={setSelectedStage} activeStageId={selectedStage?.id ?? null} />
            )}
          </div>
        </div>

        {editingChannel && (
          <ChannelModal existing={editingChannel} order={activeChannel.order} onClose={() => setEditingChannel(null)} onSave={handleSaveChannel} />
        )}
      </div>
    );
  }

  /* ══ LEVEL 3: Sub-project detail (channels OR stages) ══ */
  if (activeSubProject && activeProject && activeBrand) {
    const hasChannels = activeSubProject.channels.length > 0;
    const hasStages   = activeSubProject.stages.length > 0;
    const sorted      = [...activeSubProject.stages].sort((a, b) => a.order - b.order);
    const stageDone   = sorted.filter(s => s.status === "done").length;
    const stageProgress = sorted.length > 0 ? Math.round((stageDone / sorted.length) * 100) : 0;
    const chProgress  = hasChannels ? pct(activeSubProject.channels.flatMap(c => c.stages)) : 0;

    return (
      <div className="min-h-screen">
        <TopNav userEmail={userEmail} onFinance={() => setShowLoansManager(true)} />
        {selectedStage && !hasChannels && (
          <StageEditDrawer
            stage={selectedStage}
            stageNumber={sorted.findIndex(s => s.id === selectedStage.id) + 1}
            totalStages={sorted.length}
            onClose={() => setSelectedStage(null)}
            onSave={stage => { handleSaveStage(stage); setSelectedStage(null); }}
            onDelete={id => { handleDeleteStage(id); setSelectedStage(null); }}
            onAddAfter={handleAddStageAfter}
          />
        )}
        <BreadcrumbSidebar color={activeProject.color} items={[
          { emoji: activeBrand.emoji,      name: activeBrand.name,      onClick: () => { setActiveProject(null); setActiveSubProject(null); setSelectedStage(null); }, isCurrent: false },
          { emoji: activeProject.emoji,    name: activeProject.name,    onClick: () => { setActiveSubProject(null); setSelectedStage(null); },                        isCurrent: false },
          { emoji: activeSubProject.emoji, name: activeSubProject.name, onClick: () => {},                                                                            isCurrent: true  },
        ]} />
        {showChannelModal && <ChannelModal order={activeSubProject.channels.length} onClose={() => setShowChannelModal(false)} onSave={handleSaveChannel} />}
        {editingChannel   && <ChannelModal existing={editingChannel} order={editingChannel.order} onClose={() => setEditingChannel(null)} onSave={handleSaveChannel} />}
        {editingSub       && <SubProjectModal existing={editingSub} order={activeSubProject.order} onClose={() => setEditingSub(null)} onSave={handleSaveSub} onNavigateToChannel={handleNavigateToChannel} />}

        {/* ── SubProject context bar ── */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
          <div className="max-w-screen-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">

            {/* Right: back + identity */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => { setActiveSubProject(null); setSelectedStage(null); }}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors text-base font-bold"
                aria-label="חזרה"
              >→</button>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-sm"
                style={{ background: activeProject.color + "22", border: `1.5px solid ${activeProject.color}40` }}
              >{activeSubProject.emoji}</div>
              <div className="min-w-0">
                <p className="font-black text-gray-900 text-sm leading-tight truncate">{activeSubProject.name}</p>
                {activeSubProject.description && (
                  <p className="text-[10px] text-gray-400 truncate hidden sm:block">{activeSubProject.description}</p>
                )}
              </div>
            </div>

            {/* Left: actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setEditingSub(activeSubProject)}
                className="flex w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 items-center justify-center text-base transition-colors"
                title="ערוך"
              >✏️</button>
              {hasChannels
                ? <button onClick={() => setShowChannelModal(true)} className="btn btn-orange text-sm px-3 h-9">+ <span className="hidden sm:inline">פריט</span></button>
                : hasStages
                  ? <button onClick={handleAddStageEnd} className="btn btn-orange text-sm px-3 h-9">+ <span className="hidden sm:inline">משימה</span></button>
                  : null
              }
            </div>
          </div>
        </div>

        <div className="max-w-screen-lg mx-auto px-4 py-5 space-y-5 animate-in">

          {/* ── ROSTER MODE (פריטים) ── */}
          {hasChannels && (
            <>
              {/* Income + Expense summary */}
              {(() => {
                const chRows = activeSubProject.channels.map(ch => {
                  const inc = (ch.incomes ?? []).reduce((s, e) => s + e.amount, 0);
                  const exp = (ch.expenses ?? []).reduce((s, e) => s + e.amount, 0)
                    + ch.stages.reduce((s, st) => s + (st.expenses ?? []).reduce((a, e) => a + e.amount, 0), 0);
                  return { ch, inc, exp };
                }).filter(r => r.inc > 0 || r.exp > 0);
                const totalInc = chRows.reduce((s, r) => s + r.inc, 0);
                const totalExp = chRows.reduce((s, r) => s + r.exp, 0);
                const subInc   = (activeSubProject.incomes ?? []).reduce((s, e) => s + e.amount, 0);
                const subExp   = (activeSubProject.expenses ?? []).reduce((s, e) => s + e.amount, 0);
                const grandInc = totalInc + subInc;
                const grandExp = totalExp + subExp;
                if (grandInc === 0 && grandExp === 0) return null;
                const profit = grandInc - grandExp;
                return (
                  <div className="card p-4">
                    {/* Header totals */}
                    <div className="flex items-center gap-3 mb-3 flex-wrap">
                      {grandInc > 0 && (
                        <div className="flex-1 min-w-[120px] px-3 py-2 rounded-xl" style={{ background: "#f0fdf4", border: "1.5px solid #86efac" }}>
                          <p className="text-[11px] text-green-600 font-semibold mb-0.5">💚 סה״כ הכנסות</p>
                          <p className="text-lg font-black text-green-700">₪{grandInc.toLocaleString("he-IL")}<span className="text-xs font-medium">/חודש</span></p>
                        </div>
                      )}
                      {grandExp > 0 && (
                        <div className="flex-1 min-w-[120px] px-3 py-2 rounded-xl" style={{ background: "#fef3c7", border: "1.5px solid #fde68a" }}>
                          <p className="text-[11px] text-amber-600 font-semibold mb-0.5">💸 סה״כ הוצאות</p>
                          <p className="text-lg font-black text-amber-700">₪{grandExp.toLocaleString("he-IL")}<span className="text-xs font-medium">/חודש</span></p>
                        </div>
                      )}
                      {grandInc > 0 && grandExp > 0 && (
                        <div className="flex-1 min-w-[120px] px-3 py-2 rounded-xl" style={{
                          background: profit >= 0 ? "#f0fdf4" : "#fef2f2",
                          border: `1.5px solid ${profit >= 0 ? "#86efac" : "#fca5a5"}`,
                        }}>
                          <p className="text-[11px] font-semibold mb-0.5" style={{ color: profit >= 0 ? "#16a34a" : "#dc2626" }}>
                            {profit >= 0 ? "✨ רווח" : "⚠️ גירעון"}
                          </p>
                          <p className="text-lg font-black" style={{ color: profit >= 0 ? "#15803d" : "#dc2626" }}>
                            ₪{Math.abs(profit).toLocaleString("he-IL")}<span className="text-xs font-medium">/חודש</span>
                          </p>
                        </div>
                      )}
                    </div>
                    {/* Per-channel breakdown */}
                    {chRows.length > 0 && (
                      <div className="space-y-1.5 border-t border-gray-100 pt-3">
                        {chRows.map(({ ch, inc, exp }) => (
                          <div key={ch.id} className="flex items-center gap-2">
                            <span className="text-base shrink-0">{ch.emoji}</span>
                            <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{ch.name}</span>
                            <div className="flex gap-2 shrink-0">
                              {inc > 0 && <span className="text-xs font-bold text-green-700">+₪{inc.toLocaleString("he-IL")}</span>}
                              {exp > 0 && <span className="text-xs font-semibold text-amber-600">-₪{exp.toLocaleString("he-IL")}</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {[...activeSubProject.channels].sort((a, b) => a.order - b.order).map(ch => (
                  <ChannelCard
                    key={ch.id}
                    channel={ch}
                    color={activeProject.color}
                    onClick={() => { setActiveChannel(ch); setSelectedStage(null); }}
                    onEdit={() => setEditingChannel(ch)}
                    onDelete={() => handleDeleteChannel(ch.id)}
                  />
                ))}
                <button
                  onClick={() => setShowChannelModal(true)}
                  className="card flex flex-col items-center justify-center gap-3 py-12 hover:shadow-md transition-all hover:-translate-y-0.5 border-2 border-dashed border-gray-200 bg-transparent"
                >
                  <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-500 flex items-center justify-center text-2xl">+</div>
                  <span className="font-semibold text-gray-400 text-sm">פריט חדש</span>
                </button>
              </div>
            </>
          )}

          {/* ── STAGES MODE ── */}
          {hasStages && !hasChannels && (
            <>
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-800">משימות</h2>
                  <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">לחץ לעריכה</span>
                </div>
                <ProjectPipeline stages={sorted} onClickStage={setSelectedStage} activeStageId={selectedStage?.id ?? null} />
              </div>
            </>
          )}

          {/* ── EMPTY STATE ── */}
          {!hasChannels && !hasStages && (
            <div className="card p-12 text-center">
              <div className="text-4xl mb-3">✨</div>
              <h2 className="font-black text-gray-800 text-lg mb-1">איך תרצה לארגן את הפרויקט?</h2>
              <p className="text-gray-400 text-sm mb-7">בחר מצב אחד — אפשר לשנות בהמשך</p>
              <div className="flex gap-4 justify-center flex-wrap">
                <button
                  onClick={handleAddStageEnd}
                  className="card p-6 flex flex-col items-center gap-2 hover:shadow-md transition-all hover:-translate-y-0.5 w-44 cursor-pointer border-2 hover:border-teal-200"
                >
                  <span className="text-3xl">📋</span>
                  <span className="font-bold text-gray-800">משימות ישירות</span>
                  <span className="text-xs text-gray-400 text-center">רשימת משימות לכל הפרויקט</span>
                </button>
                <button
                  onClick={() => setShowChannelModal(true)}
                  className="card p-6 flex flex-col items-center gap-2 hover:shadow-md transition-all hover:-translate-y-0.5 w-44 cursor-pointer border-2 hover:border-teal-200"
                >
                  <span className="text-3xl">🗂️</span>
                  <span className="font-bold text-gray-800">פריטים (רשימה)</span>
                  <span className="text-xs text-gray-400 text-center">לקוחות / ספקים / פריטים — לכל אחד משימות</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ══ LEVEL 2: Project → Sub-projects ══ */
  if (activeProject && activeBrand) {
    const totalStages = activeProject.subProjects.reduce((n, sp) => n + sp.stages.length, 0);
    const doneStages  = activeProject.subProjects.reduce((n, sp) => n + sp.stages.filter(s => s.status === "done").length, 0);
    const progress    = totalStages > 0 ? Math.round((doneStages / totalStages) * 100) : 0;

    return (
      <div className="min-h-screen">
        <TopNav userEmail={userEmail} onFinance={() => setShowLoansManager(true)} />
        <BreadcrumbSidebar color={activeBrand.color} items={[
          { emoji: activeBrand.emoji,  name: activeBrand.name,  onClick: () => setActiveProject(null), isCurrent: false },
          { emoji: activeProject.emoji, name: activeProject.name, onClick: () => {},                  isCurrent: true  },
        ]} />
        {showSubModal   && <SubProjectModal order={activeProject.subProjects.length} onClose={() => setShowSubModal(false)} onSave={handleSaveSub} onNavigateToChannel={handleNavigateToChannel} />}
        {editingSub     && <SubProjectModal existing={editingSub} order={editingSub.order} onClose={() => setEditingSub(null)} onSave={handleSaveSub} onNavigateToChannel={handleNavigateToChannel} />}
        {editingProject && <NewProjectModal existing={editingProject} order={editingProject.order} onClose={() => setEditingProject(null)} onSave={handleSaveProject} />}

        {/* ── Project context bar ── */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
          <div className="max-w-screen-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">

            {/* Right: back (brand) → project identity */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => setActiveProject(null)}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors text-base font-bold"
                aria-label="חזרה"
              >→</button>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-sm"
                style={{ background: activeProject.color + "22", border: `1.5px solid ${activeProject.color}40` }}
              >{activeProject.emoji}</div>
              <div className="min-w-0">
                <p className="font-black text-gray-900 text-sm leading-tight truncate">{activeProject.name}</p>
                {totalStages > 0 && (
                  <p className="text-[10px] text-gray-400 hidden sm:block">{activeProject.subProjects.length} פרויקטים · {doneStages}/{totalStages} הושלמו</p>
                )}
              </div>
            </div>

            {/* Left: actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setEditingProject(activeProject)}
                className="flex w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 items-center justify-center text-base transition-colors"
                title="ערוך מחלקה"
              >✏️</button>
              <button
                onClick={() => setShowSubModal(true)}
                className="btn btn-orange text-sm px-3 h-9"
              >+ <span className="hidden sm:inline">פרויקט</span></button>
            </div>
          </div>
        </div>

        <div className="max-w-screen-lg mx-auto px-4 py-5 space-y-5 animate-in">

          {/* Financial overview */}
          {(() => {
            const rows = activeProject.subProjects.map(sp => ({
              sp,
              inc: subMonthlyIncomes(sp),
              exp: subMonthlyExpenses(sp),
            })).filter(r => r.inc > 0 || r.exp > 0);
            if (!rows.length) return null;
            const totalInc = rows.reduce((s, r) => s + r.inc, 0);
            const totalExp = rows.reduce((s, r) => s + r.exp, 0);
            const profit   = totalInc - totalExp;
            return (
              <div className="card p-4">
                {/* Totals row */}
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  {totalInc > 0 && (
                    <div className="flex-1 min-w-[120px] px-3 py-2 rounded-xl" style={{ background: "#f0fdf4", border: "1.5px solid #86efac" }}>
                      <p className="text-[11px] text-green-600 font-semibold mb-0.5">💚 סה״כ הכנסות</p>
                      <p className="text-lg font-black text-green-700">₪{totalInc.toLocaleString("he-IL")}<span className="text-xs font-medium">/חודש</span></p>
                    </div>
                  )}
                  {totalExp > 0 && (
                    <div className="flex-1 min-w-[120px] px-3 py-2 rounded-xl" style={{ background: "#fef3c7", border: "1.5px solid #fde68a" }}>
                      <p className="text-[11px] text-amber-600 font-semibold mb-0.5">💸 סה״כ הוצאות</p>
                      <p className="text-lg font-black text-amber-700">₪{totalExp.toLocaleString("he-IL")}<span className="text-xs font-medium">/חודש</span></p>
                    </div>
                  )}
                  {totalInc > 0 && totalExp > 0 && (
                    <div className="flex-1 min-w-[120px] px-3 py-2 rounded-xl" style={{
                      background: profit >= 0 ? "#f0fdf4" : "#fef2f2",
                      border: `1.5px solid ${profit >= 0 ? "#86efac" : "#fca5a5"}`,
                    }}>
                      <p className="text-[11px] font-semibold mb-0.5" style={{ color: profit >= 0 ? "#16a34a" : "#dc2626" }}>
                        {profit >= 0 ? "✨ רווח" : "⚠️ גירעון"}
                      </p>
                      <p className="text-lg font-black" style={{ color: profit >= 0 ? "#15803d" : "#dc2626" }}>
                        ₪{Math.abs(profit).toLocaleString("he-IL")}<span className="text-xs font-medium">/חודש</span>
                      </p>
                    </div>
                  )}
                </div>
                {/* Per-sub breakdown */}
                <div className="space-y-1.5 border-t border-gray-100 pt-3">
                  {rows.map(({ sp, inc, exp }) => (
                    <div key={sp.id} className="flex items-center gap-2">
                      <span className="text-base shrink-0">{sp.emoji}</span>
                      <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{sp.name}</span>
                      <div className="flex gap-2 shrink-0">
                        {inc > 0 && <span className="text-xs font-bold text-green-700">+₪{inc.toLocaleString("he-IL")}</span>}
                        {exp > 0 && <span className="text-xs font-semibold text-amber-600">-₪{exp.toLocaleString("he-IL")}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Sub-projects grid */}
          {activeProject.subProjects.length === 0 ? (
            <div className="card p-16 text-center">
              <div className="text-5xl mb-3">📁</div>
              <h2 className="font-black text-gray-800 text-lg mb-2">אין פרויקטים עדיין</h2>
              <p className="text-gray-400 mb-5 text-sm">כל פרויקט מקבל משימות משלו</p>
              <button onClick={() => setShowSubModal(true)} className="btn btn-orange">+ הוסף פרויקט ראשון</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" style={{ gridAutoRows: "1fr" }}>
              {[...activeProject.subProjects].sort((a, b) => a.order - b.order).map(sub => (
                <SubProjectCard
                  key={sub.id}
                  sub={sub}
                  color={activeProject.color}
                  onClick={() => setActiveSubProject(sub)}
                  onEdit={() => setEditingSub(sub)}
                  onDelete={() => handleDeleteSub(sub.id)}
                />
              ))}
              <button
                onClick={() => setShowSubModal(true)}
                className="card flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all hover:-translate-y-0.5 border-2 border-dashed border-gray-200 bg-transparent h-full"
              >
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-500 flex items-center justify-center text-xl">+</div>
                <span className="font-semibold text-gray-400 text-xs">פרויקט חדש</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ══ BRAND FINANCIAL PANEL ══ */
  if (showBrandFinancial && activeBrand) {
    return (
      <BrandFinancialSummary
        brand={activeBrand}
        onBack={() => setShowBrandFinancial(false)}
        onOpenLoansManager={() => {
          setShowBrandFinancial(false);
          // navigate to the 💰 personal finance brand or open full FinancialDashboard
          setShowLoansManager(true);
        }}
      />
    );
  }

  /* ══ LOANS MANAGER (full FinancialDashboard) ══ */
  if (showLoansManager) {
    // Use fixed UUID for personal finance so mobile syncs correctly even before
    // brands finish loading from Supabase (avoids falling back to "personal" key).
    const financeBrandId   = activeBrand?.id ?? PERSONAL_FINANCE_BRAND_ID;
    const financeBrandName = activeBrand?.name ?? "פיננסי אישי";
    return (
      <FinancialDashboard
        brandId={financeBrandId}
        brandName={financeBrandName}
        onBack={() => {
          setShowLoansManager(false);
          if (activeBrand) setShowBrandFinancial(true);
        }}
      />
    );
  }

  /* ══ WHITEBOARD overlay ══ */
  if (showWhiteboard && activeBrand) {
    return (
      <BrandWhiteboard
        brand={activeBrand}
        onClose={() => setShowWhiteboard(false)}
        onNavigateTo={(project, sub, channel) => {
          setActiveProject(project);
          if (sub) setActiveSubProject(sub);
          if (channel) setActiveChannel(channel);
          setShowWhiteboard(false);
        }}
      />
    );
  }

  /* ══ LEVEL 1: Brand → Projects ══ */
  if (activeBrand) {
    const projects = activeBrand.projects;

    return (
      <div className="min-h-screen">
        <TopNav userEmail={userEmail} onFinance={() => setShowLoansManager(true)} />
        <BreadcrumbSidebar color={activeBrand.color} items={[
          { emoji: activeBrand.emoji, name: activeBrand.name, onClick: () => {}, isCurrent: true },
        ]} />
        {showProjectModal && <NewProjectModal order={projects.length} onClose={() => setShowProjectModal(false)} onSave={handleSaveProject} />}
        {editingProject   && <NewProjectModal existing={editingProject} order={editingProject.order} onClose={() => setEditingProject(null)} onSave={handleSaveProject} />}
        {editingBrand     && <BrandWizard existing={editingBrand} onClose={() => setEditingBrand(null)} onSave={handleSaveBrand} />}

        {/* ── Brand context bar — single unified header ── */}
        <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 shadow-sm">
          <div className="max-w-screen-lg mx-auto px-4 h-14 flex items-center justify-between gap-3">

            {/* Right: back arrow + brand identity */}
            <div className="flex items-center gap-2 min-w-0">
              <button
                onClick={() => { setActiveBrand(null); setShowBrandFinancial(false); }}
                className="flex-shrink-0 w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 transition-colors text-base font-bold"
                aria-label="חזרה"
              >→</button>
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center text-lg flex-shrink-0 shadow-sm overflow-hidden"
                style={{ background: activeBrand.color + "22", border: `1.5px solid ${activeBrand.color}40` }}
              >
                {activeBrand.logo
                  ? <img src={activeBrand.logo} alt={activeBrand.name} className="w-full h-full object-contain" />
                  : activeBrand.emoji
                }
              </div>
              <div className="min-w-0">
                <p className="font-black text-gray-900 text-sm leading-tight truncate">{activeBrand.name}</p>
                {activeBrand.description && (
                  <p className="text-[10px] text-gray-400 truncate hidden sm:block">{activeBrand.description}</p>
                )}
              </div>
            </div>

            {/* Left: actions */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => setShowWhiteboard(true)}
                className="hidden sm:flex w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 items-center justify-center text-base transition-colors"
                title="מפת מותג"
              >🗺️</button>
              <button
                onClick={() => setShowBrandFinancial(true)}
                className="flex w-9 h-9 rounded-xl bg-gray-100 hover:bg-emerald-50 hover:text-emerald-700 items-center justify-center text-base transition-colors"
                title="פיננסי"
              >💰</button>
              <button
                onClick={() => setEditingBrand(activeBrand)}
                className="flex w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 items-center justify-center text-base transition-colors"
                title="ערוך מותג"
              >✏️</button>
              <button
                onClick={() => setShowProjectModal(true)}
                className="btn btn-orange text-sm px-3 h-9"
              >+ <span className="hidden sm:inline">מחלקה</span></button>
            </div>
          </div>
        </div>

        <div className="max-w-screen-lg mx-auto px-4 py-5 space-y-5 animate-in">

          {/* Brand financial summary */}
          {(() => {
            const projRows = projects.map(p => ({
              p,
              inc: p.subProjects.reduce((s, sp) => s + subMonthlyIncomes(sp), 0),
              exp: p.subProjects.reduce((s, sp) => s + subMonthlyExpenses(sp), 0),
            })).filter(r => r.inc > 0 || r.exp > 0);
            if (!projRows.length) return null;
            const totalInc = projRows.reduce((s, r) => s + r.inc, 0);
            const totalExp = projRows.reduce((s, r) => s + r.exp, 0);
            const profit   = totalInc - totalExp;
            return (
              <div className="card p-4">
                {/* Totals */}
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  {totalInc > 0 && (
                    <div className="flex-1 min-w-[120px] px-3 py-2 rounded-xl" style={{ background: "#f0fdf4", border: "1.5px solid #86efac" }}>
                      <p className="text-[11px] text-green-600 font-semibold mb-0.5">💚 סה״כ הכנסות</p>
                      <p className="text-lg font-black text-green-700">₪{totalInc.toLocaleString("he-IL")}<span className="text-xs font-medium">/חודש</span></p>
                    </div>
                  )}
                  {totalExp > 0 && (
                    <div className="flex-1 min-w-[120px] px-3 py-2 rounded-xl" style={{ background: "#fef3c7", border: "1.5px solid #fde68a" }}>
                      <p className="text-[11px] text-amber-600 font-semibold mb-0.5">💸 סה״כ הוצאות</p>
                      <p className="text-lg font-black text-amber-700">₪{totalExp.toLocaleString("he-IL")}<span className="text-xs font-medium">/חודש</span></p>
                    </div>
                  )}
                  {totalInc > 0 && totalExp > 0 && (
                    <div className="flex-1 min-w-[120px] px-3 py-2 rounded-xl" style={{
                      background: profit >= 0 ? "#f0fdf4" : "#fef2f2",
                      border: `1.5px solid ${profit >= 0 ? "#86efac" : "#fca5a5"}`,
                    }}>
                      <p className="text-[11px] font-semibold mb-0.5" style={{ color: profit >= 0 ? "#16a34a" : "#dc2626" }}>
                        {profit >= 0 ? "✨ רווח" : "⚠️ גירעון"}
                      </p>
                      <p className="text-lg font-black" style={{ color: profit >= 0 ? "#15803d" : "#dc2626" }}>
                        ₪{Math.abs(profit).toLocaleString("he-IL")}<span className="text-xs font-medium">/חודש</span>
                      </p>
                    </div>
                  )}
                </div>
                {/* Per-project breakdown */}
                <div className="space-y-1.5 border-t border-gray-100 pt-3">
                  {projRows.map(({ p, inc, exp }) => (
                    <div key={p.id} className="flex items-center gap-2">
                      <span className="text-base shrink-0">{p.emoji}</span>
                      <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{p.name}</span>
                      <div className="flex gap-2 shrink-0">
                        {inc > 0 && <span className="text-xs font-bold text-green-700">+₪{inc.toLocaleString("he-IL")}</span>}
                        {exp > 0 && <span className="text-xs font-semibold text-amber-600">-₪{exp.toLocaleString("he-IL")}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Goals panel */}
          <GoalsPanel
            goals={activeBrand.goals ?? []}
            color={activeBrand.color}
            onChange={goals => syncAll(brands.map(b => b.id === activeBrand.id ? { ...b, goals } : b))}
          />

          {/* Projects grid */}
          {projects.length === 0 ? (
            <div className="card p-16 text-center">
              <div className="text-5xl mb-3">🚀</div>
              <h2 className="font-black text-gray-800 text-xl mb-2">אין מחלקות עדיין</h2>
              <p className="text-gray-400 mb-5 text-sm max-w-xs mx-auto">כל מחלקה מחולקת לתת-מחלקות ומשימות</p>
              <button onClick={() => setShowProjectModal(true)} className="btn btn-orange">+ צור מחלקה ראשונה</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4" style={{ gridAutoRows: "1fr" }}>
              {[...projects].sort((a, b) => a.order - b.order).map(p => (
                <div
                  key={p.id}
                  className={`h-full${dragOverProjectId === p.id ? " opacity-50" : ""}`}
                  onDragOver={(e) => handleProjectDragOver(e, p.id)}
                  onDrop={(e) => handleProjectDrop(e, p.id)}
                >
                  <ProjectCard
                    project={p}
                    onClick={() => setActiveProject(p)}
                    onEdit={() => setEditingProject(p)}
                    onDelete={() => handleDeleteProject(p.id)}
                    onDragStart={() => handleProjectDragStart({} as React.DragEvent, p.id)}
                    onDragOver={() => handleProjectDragOver({} as React.DragEvent, p.id)}
                    onDrop={() => handleProjectDrop({} as React.DragEvent, p.id)}
                    onDragEnd={handleProjectDragEnd}
                  />
                </div>
              ))}
              {/* Financial card */}
              <button
                onClick={() => setShowBrandFinancial(true)}
                className="card overflow-hidden flex flex-col hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 h-full"
                style={{ border: "1.5px solid #d1fae5" }}
              >
                <div className="h-1 w-full" style={{ background: "#10b981" }} />
                <div className="p-3 flex flex-col gap-2 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl flex-shrink-0">💰</span>
                    <h3 className="font-black text-gray-900 text-sm leading-tight">ניהול פיננסי</h3>
                  </div>
                  <span className="text-[11px] text-gray-400 mt-auto">הלוואות, הוצאות, הכנסות</span>
                </div>
              </button>

              <button
                onClick={() => setShowProjectModal(true)}
                className="card flex flex-col items-center justify-center gap-2 hover:shadow-md transition-all hover:-translate-y-0.5 border-2 border-dashed border-gray-200 bg-transparent h-full"
              >
                <div className="w-10 h-10 rounded-2xl bg-teal-50 text-teal-500 flex items-center justify-center text-xl">+</div>
                <span className="font-semibold text-gray-400 text-xs">מחלקה חדשה</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ══ LEVEL 0: Brands home ══ */
  return (
    <div className="min-h-screen">
      <TopNav userEmail={userEmail} onFinance={() => setShowLoansManager(true)} />
      {showBrandModal && (
        <BrandWizard
          onClose={() => setShowBrandModal(false)}
          onSave={handleSaveBrand}
          onEnter={brand => { setActiveBrand(brand); }}
        />
      )}
      {editingBrand && (
        <BrandWizard
          existing={editingBrand}
          onClose={() => setEditingBrand(null)}
          onSave={handleSaveBrand}
        />
      )}

      {/* Brand Setup Wizard — opens when user clicks "השלם הגדרה" on a brand card */}
      {setupBrand && (
        <BrandSetupWizard
          brand={setupBrand}
          onClose={() => setSetupBrand(null)}
          onSave={updatedBrand => {
            handleSaveBrand(updatedBrand);
            setSetupBrand(null);
          }}
        />
      )}
      {showWBBuilder && (
        <WhiteboardBuilder
          brands={brands}
          onSave={(updated) => { syncAll(updated); setShowWBBuilder(false); }}
          onClose={() => setShowWBBuilder(false)}
          onBrandUpdate={(updatedBrand) => handleSaveBrand(updatedBrand)}
        />
      )}

      <div className="max-w-screen-lg mx-auto px-4 py-5 sm:py-8 space-y-6 animate-in">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-gray-900">המותגים שלי</h1>
            {(() => {
              const visibleBrands = brands.filter(b => b.emoji !== "💰");
              return (
                <p className="text-sm text-gray-400 mt-0.5">
                  {visibleBrands.length === 0 ? "צור מותג ראשון" : `${visibleBrands.length} מותג${visibleBrands.length !== 1 ? "ים" : ""}`}
                </p>
              );
            })()}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowWBBuilder(true)} className="btn btn-ghost text-sm flex items-center gap-2">🗺️ בנה מפה</button>
            <button onClick={() => setShowBrandModal(true)} className="btn btn-orange">+ מותג חדש</button>
          </div>
        </div>

        {brands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center max-w-lg mx-auto">
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center text-4xl mb-6 shadow-lg shadow-teal-200">🏢</div>
            <h2 className="font-black text-gray-900 text-2xl mb-3">ברוך הבא ל-beseder</h2>
            <p className="text-gray-400 text-base leading-relaxed mb-8 max-w-sm">
              הכל מתחיל ממותג. תן שם לעסק שלך, הגדר מטרה — ה-AI ייצור לך מחלקות ומשימות מוכנות.
            </p>
            <button
              onClick={() => setShowBrandModal(true)}
              className="btn btn-orange text-base px-10 py-3.5 shadow-lg shadow-orange-200"
            >
              ✨ צור מותג ראשון
            </button>
            <div className="mt-10 grid grid-cols-3 gap-4 w-full">
              {[
                { emoji: "🎯", title: "מטרות ברורות", desc: "הגדר KPIs לכל משימה" },
                { emoji: "🤖", title: "AI wizard", desc: "קבל מבנה מוכן תוך שניות" },
                { emoji: "💸", title: "ניהול פיננסי", desc: "הוצאות, הכנסות, הלוואות" },
              ].map(f => (
                <div key={f.title} className="card p-4 text-center">
                  <div className="text-2xl mb-2">{f.emoji}</div>
                  <div className="font-bold text-gray-800 text-xs mb-1">{f.title}</div>
                  <div className="text-gray-400 text-xs leading-relaxed">{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* Morning panel — priority focus */}
            <MorningPanel
              brands={brands}
              userEmail={userEmail}
              onBrandClick={b => setActiveBrand(b)}
            />

            <MonthlyMemorySection brands={brands} />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
              {brands.filter(b => b.emoji !== "💰").map(b => {
                const health = getBrandHealth(b);
                return (
                  <BrandCard
                    key={b.id}
                    brand={b}
                    health={health}
                    onClick={() => setActiveBrand(b)}
                    onEdit={() => setEditingBrand(b)}
                    onDelete={() => handleDeleteBrand(b.id)}
                    onHide={() => {
                      const updated = brands.map(br => br.id === b.id ? { ...br, hidden: !br.hidden } : br);
                      syncAll(updated);
                    }}
                    onSetup={() => setSetupBrand(b)}
                    onDragStart={e => handleBrandDragStart(e, b.id)}
                    onDragOver={e => handleBrandDragOver(e, b.id)}
                    onDrop={e => handleBrandDrop(e, b.id)}
                    onDragEnd={handleBrandDragEnd}
                    isDragOver={dragOverBrandId === b.id}
                  />
                );
              })}
              <button
                onClick={() => setShowBrandModal(true)}
                className="card flex flex-col items-center justify-center gap-3 py-12 hover:shadow-md transition-all hover:-translate-y-0.5 border-2 border-dashed border-gray-200 bg-transparent"
              >
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-500 flex items-center justify-center text-2xl">+</div>
                <span className="font-semibold text-gray-400 text-sm">מותג חדש</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
