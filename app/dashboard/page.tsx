"use client";

import { useState, useEffect, useRef } from "react";
import { Brand, BrandGoal, Project, SubProject, Channel, Stage, StageStatus, FinancialData, DailyTask } from "@/lib/types";
import { loadBrands, saveBrands, createStage, loadBrandsFromCloud, saveFinancialData, saveDailyTasks, loadDailyTasksFromCloud } from "@/lib/storage";
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
  { id: "default",   label: "ברירת מחדל",  preview: "#f8fafc",  bgColor: "#f8fafc" },
  { id: "warm",      label: "קרם",          preview: "#fef9f0",  bgColor: "#fef9f0" },
  { id: "mint",      label: "מנטה",         preview: "#f0fdf4",  bgColor: "#f0fdf4" },
  { id: "lavender",  label: "לבנדר",        preview: "#faf5ff",  bgColor: "#faf5ff" },
  { id: "sky",       label: "שמיים",        preview: "#f0f9ff",  bgColor: "#f0f9ff" },
  { id: "rose",      label: "ורוד",         preview: "#fff1f2",  bgColor: "#fff1f2" },
  { id: "peach",     label: "אפרסק",        preview: "#fff7ed",  bgColor: "#fff7ed" },
  { id: "slate",     label: "אפור כחלחל",   preview: "#f1f5f9",  bgColor: "#f1f5f9" },
  { id: "charcoal",  label: "פחם",          preview: "#1e2130",  bgColor: "#1e2130" },
  { id: "dark-navy", label: "כחול לילה",    preview: "#0f172a",  bgColor: "#0f172a" },
  { id: "dark-green",label: "ירוק כהה",     preview: "#052e16",  bgColor: "#052e16" },
  { id: "dark-wine", label: "יין",          preview: "#3b0764",  bgColor: "#3b0764" },
  { id: "sunrise",   label: "זריחה",        preview: "linear-gradient(135deg,#fff7ed,#fef3c7)",         bgColor: "#fff7ed", bgImage: "linear-gradient(135deg,#fff7ed 0%,#fef3c7 60%,#fefce8 100%)" },
  { id: "ocean",     label: "אוקיינוס",     preview: "linear-gradient(135deg,#f0f9ff,#e0f2fe)",         bgColor: "#f0f9ff", bgImage: "linear-gradient(160deg,#f0f9ff 0%,#e0f2fe 45%,#ecfdf5 100%)" },
  { id: "dusk",      label: "שקיעה",        preview: "linear-gradient(135deg,#312e81,#4c1d95)",         bgColor: "#1e1b4b", bgImage: "linear-gradient(160deg,#1e1b4b 0%,#312e81 50%,#4c1d95 100%)" },
  { id: "forest",    label: "יער",          preview: "linear-gradient(135deg,#14532d,#166534)",         bgColor: "#052e16", bgImage: "linear-gradient(160deg,#052e16 0%,#14532d 60%,#166534 100%)" },
  { id: "dots",      label: "נקודות",       preview: "#f1f5f9",  bgColor: "#f1f5f9", bgImage: "radial-gradient(circle,rgba(0,0,0,0.07) 1px,transparent 1px)", bgSize: "24px 24px" },
  { id: "grid",      label: "גריד",         preview: "#f8fafc",  bgColor: "#f8fafc", bgImage: "linear-gradient(rgba(0,0,0,0.055) 1px,transparent 1px),linear-gradient(90deg,rgba(0,0,0,0.055) 1px,transparent 1px)", bgSize: "22px 22px" },
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
        style={{ background: "linear-gradient(135deg, #f0f9ff 0%, #fefce8 100%)", borderBottom: collapsed ? "none" : "1px solid #f3f4f6" }}
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">☀️</span>
          <div>
            <h2 className="font-black text-gray-900 text-base leading-tight">בוקר טוב, {firstName}</h2>
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
              { mode: 'diagram' as const, label: '🕸️ דיאגרמה' },
              { mode: 'cards'   as const, label: '📋 כרטיסיות' },
            ]).map(({ mode, label }) => {
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
                  className="text-xs font-semibold px-3 py-1.5 transition-all"
                  style={{ background: s.bg, color: s.text }}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Dark/light toggle — only visible in diagram mode */}
          {viewMode === 'diagram' && (
            <button onClick={() => setIsDark(!isDark)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
              style={{ color: t.btnText, background: t.btnBg, border: `1px solid ${t.btnBorder}` }}
            >{isDark ? "☀️ בהיר" : "🌙 כהה"}</button>
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
        <div className="flex-1 overflow-auto" style={{
          background: t.bg,
          backgroundImage: isDark
            ? "radial-gradient(circle, rgba(255,255,255,0.028) 1px, transparent 1px)"
            : "radial-gradient(circle, rgba(0,0,0,0.055) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          position: "relative",
        }}>
          {/* Ambient corner glows */}
          <div style={{ position: "absolute", top: 0, right: 0, width: 320, height: 320, background: `radial-gradient(circle at top right, ${brand.color}${isDark ? "0d" : "06"}, transparent 70%)`, pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: 0, left: 0, width: 260, height: 260, background: `radial-gradient(circle at bottom left, ${isDark ? "rgba(99,102,241,0.07)" : "rgba(99,102,241,0.03)"}, transparent 70%)`, pointerEvents: "none" }} />

          {/* Section label */}
          <div style={{ textAlign: "center", paddingTop: 20, paddingBottom: 6 }}>
            <span style={{ letterSpacing: "0.18em", fontSize: 10, fontWeight: 700, color: t.textMuted, opacity: 0.65 }}>מבנה המותג · BRAND STRUCTURE</span>
          </div>
          {/* Accent line */}
          <div style={{ height: 1, background: `linear-gradient(to left, transparent, ${brand.color}35, transparent)`, maxWidth: 380, margin: "0 auto 0" }} />

          {brand.projects.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 280, gap: 12 }}>
              <div style={{ fontSize: 48, opacity: 0.25 }}>📭</div>
              <p style={{ color: t.emptyText, fontWeight: 600, fontSize: 14 }}>אין מחלקות במותג זה עדיין</p>
            </div>
          ) : (
            <div style={{ maxWidth: 1100, margin: "0 auto", padding: "16px 24px 80px", display: "flex", flexDirection: "column", alignItems: "center" }}>

              {/* ── Brand root node ── */}
              <div style={{
                background: isDark
                  ? `linear-gradient(135deg, ${brand.color}1a 0%, #13161f 100%)`
                  : `linear-gradient(135deg, ${brand.color}10 0%, #ffffff 100%)`,
                border: `1.5px solid ${brand.color}55`,
                boxShadow: isDark
                  ? `0 0 56px ${brand.color}20, 0 12px 48px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)`
                  : `0 0 28px ${brand.color}15, 0 6px 28px rgba(0,0,0,0.1)`,
                borderRadius: 20,
                padding: "14px 24px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                minWidth: 280,
              }}>
                <div style={{
                  width: 50, height: 50, borderRadius: 14,
                  background: brand.color,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 24, flexShrink: 0,
                  boxShadow: `0 4px 20px ${brand.color}65`,
                }}>{brand.emoji}</div>
                <div style={{ textAlign: "right", flex: 1 }}>
                  <div style={{ color: t.text, fontWeight: 900, fontSize: 17, lineHeight: 1.15 }}>{brand.name}</div>
                  <div style={{ color: t.textMuted, fontSize: 11, marginTop: 3 }}>
                    {brand.projects.length} מחלקות · {totalTasks} משימות
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  {doneTasks   > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 8, background: t.statsDone.bg,    color: t.statsDone.text,    border: `1px solid ${t.statsDone.border}` }}>✓ {doneTasks}</span>}
                  {activeCount > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 8, background: t.statsActive.bg,  color: t.statsActive.text,  border: `1px solid ${t.statsActive.border}` }}>● {activeCount}</span>}
                  {blockedCount> 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 6px", borderRadius: 8, background: t.statsBlocked.bg, color: t.statsBlocked.text, border: `1px solid ${t.statsBlocked.border}` }}>⚠ {blockedCount}</span>}
                </div>
              </div>

              {/* Connector brand → first project */}
              <div style={{ width: 2, height: 36, background: isDark ? `linear-gradient(to bottom, ${brand.color}55, ${brand.color}18)` : `linear-gradient(to bottom, ${brand.color}40, ${brand.color}10)` }} />

              {/* ── Projects ── */}
              {brand.projects.map((project, pi) => {
                const nSubs = project.subProjects.length;
                return (
                  <div key={project.id} style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center" }}>

                    {/* Project node */}
                    <button
                      onClick={() => onNavigateTo(project)}
                      style={{
                        background: isDark
                          ? `linear-gradient(135deg, ${project.color}1a 0%, #13161f 100%)`
                          : `linear-gradient(135deg, ${project.color}09 0%, #ffffff 100%)`,
                        border: `1.5px solid ${project.color}50`,
                        boxShadow: isDark
                          ? `0 0 36px ${project.color}22, 0 8px 40px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.05)`
                          : `0 0 18px ${project.color}12, 0 4px 18px rgba(0,0,0,0.08)`,
                        borderRadius: 16,
                        padding: "12px 20px",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                        cursor: "pointer",
                        transition: "transform 0.15s ease, box-shadow 0.15s ease",
                        minWidth: 240,
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.04)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
                    >
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: project.color,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 20, flexShrink: 0,
                        boxShadow: `0 4px 16px ${project.color}55`,
                      }}>{project.emoji}</div>
                      <div style={{ textAlign: "right", flex: 1 }}>
                        <div style={{ color: t.text, fontWeight: 900, fontSize: 15, lineHeight: 1.2 }}>{project.name}</div>
                        <div style={{ color: project.color + "bb", fontSize: 11, marginTop: 2 }}>{nSubs} פרויקטים</div>
                      </div>
                      <span style={{ color: project.color + "70", fontSize: 18 }}>←</span>
                    </button>

                    {/* ── SubProjects ── */}
                    {nSubs > 0 && (
                      <>
                        {/* Vertical drop */}
                        <div style={{ width: 2, height: 22, background: `linear-gradient(to bottom, ${project.color}50, ${project.color}22)` }} />

                        {/* Horizontal connector bar (spanning sub-row) */}
                        {nSubs > 1 && (
                          <div style={{
                            height: 2,
                            width: `min(${nSubs * 188}px, 92%)`,
                            background: `linear-gradient(to left, transparent, ${project.color}35, transparent)`,
                            borderRadius: 2,
                            marginBottom: 0,
                          }} />
                        )}

                        {/* Sub-row */}
                        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", paddingTop: nSubs > 1 ? 0 : 0, width: "100%" }}>
                          {project.subProjects.map(sub => {
                            const hasChannels = sub.channels.length > 0;
                            const subAllS  = hasChannels ? sub.channels.reduce((n, c) => n + c.stages.length, 0) : sub.stages.length;
                            const blockedN = hasChannels ? sub.channels.reduce((n, c) => n + c.stages.filter(s => s.status === "blocked").length, 0) : sub.stages.filter(s => s.status === "blocked").length;
                            const activeN  = hasChannels ? sub.channels.reduce((n, c) => n + c.stages.filter(s => s.status === "active").length, 0) : sub.stages.filter(s => s.status === "active").length;
                            const doneN    = hasChannels ? sub.channels.reduce((n, c) => n + c.stages.filter(s => s.status === "done").length, 0) : sub.stages.filter(s => s.status === "done").length;
                            return (
                              <div key={sub.id} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                                {/* tick from horizontal bar */}
                                <div style={{ width: 2, height: 16, background: `${project.color}30` }} />
                                {/* Arrowhead */}
                                <div style={{ width: 0, height: 0, borderLeft: "4px solid transparent", borderRight: "4px solid transparent", borderTop: `5px solid ${project.color}40`, marginBottom: 2 }} />
                                <button
                                  onClick={() => onNavigateTo(project, sub)}
                                  style={{
                                    background: isDark
                                      ? `linear-gradient(135deg, ${project.color}12 0%, #13161f 100%)`
                                      : `linear-gradient(135deg, ${project.color}06 0%, #ffffff 100%)`,
                                    border: `1px solid ${project.color}38`,
                                    boxShadow: isDark
                                      ? `0 2px 18px ${project.color}14, 0 4px 24px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.03)`
                                      : `0 2px 10px ${project.color}0e, 0 2px 12px rgba(0,0,0,0.07)`,
                                    borderRadius: 14,
                                    padding: "10px 12px",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 8,
                                    cursor: "pointer",
                                    transition: "transform 0.15s ease",
                                    width: 172,
                                    textAlign: "right",
                                  }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.05) translateY(-2px)"; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1) translateY(0)"; }}
                                >
                                  {/* Sub header */}
                                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                    <div style={{
                                      width: 32, height: 32, borderRadius: 9,
                                      background: isDark ? project.color + "28" : project.color + "16",
                                      border: `1px solid ${project.color}40`,
                                      display: "flex", alignItems: "center", justifyContent: "center",
                                      fontSize: 16, flexShrink: 0,
                                    }}>{sub.emoji}</div>
                                    <span style={{ color: t.text, fontWeight: 800, fontSize: 12, lineHeight: 1.3 }}>{sub.name}</span>
                                  </div>

                                  {/* Channels */}
                                  {hasChannels && sub.channels.length > 0 && (
                                    <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                                      {sub.channels.slice(0, 3).map(ch => (
                                        <button key={ch.id}
                                          onClick={e => { e.stopPropagation(); onNavigateTo(project, sub, ch); }}
                                          style={{
                                            display: "flex", alignItems: "center", gap: 3,
                                            padding: "2px 6px", borderRadius: 7,
                                            background: project.color + "1e",
                                            border: `1px solid ${project.color}30`,
                                            color: project.color,
                                            fontSize: 10, fontWeight: 600,
                                          }}>
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
                                      {sub.stages.slice(0, 12).map(s => (
                                        <div key={s.id} style={{
                                          width: 7, height: 7, borderRadius: "50%",
                                          background: s.status === "done" ? project.color : s.status === "active" ? "#3b82f6" : s.status === "blocked" ? "#ef4444" : t.taskDotTodo,
                                        }} />
                                      ))}
                                      {sub.stages.length > 12 && <span style={{ fontSize: 9, color: t.emptyText }}>+{sub.stages.length - 12}</span>}
                                    </div>
                                  )}

                                  {/* Status badges */}
                                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                                    {doneN    > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "1.5px 5px", borderRadius: 6, background: t.statsDone.bg,    color: t.statsDone.text }}>✓ {doneN}</span>}
                                    {activeN  > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "1.5px 5px", borderRadius: 6, background: t.activeBadge.bg,  color: t.activeBadge.text }}>● {activeN}</span>}
                                    {blockedN > 0 && <span style={{ fontSize: 9, fontWeight: 700, padding: "1.5px 5px", borderRadius: 6, background: t.blockedBadge.bg, color: t.blockedBadge.text }}>⚠ {blockedN}</span>}
                                    {subAllS === 0 && <span style={{ fontSize: 9, color: t.emptyText }}>ריק</span>}
                                  </div>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}

                    {/* Separator between projects */}
                    {pi < brand.projects.length - 1 && (
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 0, width: "100%", margin: "28px 0 0" }}>
                        <div style={{ width: 2, height: 18, background: isDark ? `${brand.color}22` : `${brand.color}18` }} />
                        <div style={{ width: "45%", height: 1, background: isDark ? "rgba(255,255,255,0.045)" : "rgba(0,0,0,0.065)", borderRadius: 1 }} />
                        <div style={{ width: 2, height: 18, background: isDark ? `${brand.color}22` : `${brand.color}18` }} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
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

/* ─── Top Nav ─────────────────────────────────────────── */
function TopNav({ userEmail, onFinance }: { userEmail: string; onFinance?: () => void }) {
  const router = useRouter();
  const [open, setOpen]               = useState(false);
  const [loggingOut, setLoggingOut]   = useState(false);
  const [showBgPicker, setShowBgPicker] = useState(false);
  const [bgThemeId, setBgThemeId]     = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem(BG_THEME_KEY) ?? "default";
    return "default";
  });
  const ref    = useRef<HTMLDivElement>(null);
  const bgRef  = useRef<HTMLDivElement>(null);

  // Apply saved theme on mount
  useEffect(() => {
    const theme = BG_THEMES.find(t => t.id === bgThemeId) ?? BG_THEMES[0];
    applyBgTheme(theme);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Close user dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close bg picker on outside click
  useEffect(() => {
    if (!showBgPicker) return;
    const handler = (e: MouseEvent) => {
      if (bgRef.current && !bgRef.current.contains(e.target as Node)) setShowBgPicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showBgPicker]);

  const initials = userEmail ? userEmail.split("@")[0].slice(0, 2).toUpperCase() : "?";

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

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/80 backdrop-blur-md">
      <div className="max-w-screen-lg mx-auto px-4 h-14 flex items-center justify-between">

        {/* User menu — right side in RTL */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl hover:bg-gray-100 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {initials}
            </div>
            <svg
              className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white border border-gray-100 shadow-xl shadow-gray-200/60 overflow-hidden"
              style={{ animation: "fadeSlideDown 0.15s ease-out" }}
            >
              <div className="px-4 py-3.5 border-b border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-blue-600 flex items-center justify-center text-white text-sm font-bold shadow-sm flex-shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{userEmail}</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">חשבון אישי</p>
                  </div>
                </div>
              </div>
              <div className="p-1.5">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                >
                  <span className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-base flex-shrink-0">
                    {loggingOut ? "⏳" : "👋"}
                  </span>
                  {loggingOut ? "מתנתק..." : "התנתק"}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Center: finance + bg-picker buttons */}
        <div className="flex items-center gap-2">
          {onFinance && (
            <button onClick={onFinance}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-colors"
            >
              <span>💰</span>
              <span className="hidden sm:inline">פיננסי</span>
            </button>
          )}

          {/* 🎨 Background theme button */}
          <div className="relative" ref={bgRef}>
            <button
              onClick={() => setShowBgPicker(v => !v)}
              title="שנה רקע"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-sm font-semibold text-gray-500 hover:bg-gray-100 border border-gray-200 transition-colors"
              style={{ borderColor: showBgPicker ? "#f97316" : undefined, color: showBgPicker ? "#f97316" : undefined }}
            >
              {/* Mini swatch of current theme */}
              <span className="w-4 h-4 rounded-full border border-gray-300 flex-shrink-0 inline-block"
                style={{ background: currentTheme.preview }} />
              <span className="hidden sm:inline">רקע</span>
            </button>

            {/* ── Theme picker panel ── */}
            {showBgPicker && (
              <div
                className="absolute left-0 mt-2 rounded-2xl bg-white border border-gray-100 shadow-2xl shadow-gray-200/60 overflow-hidden"
                style={{ zIndex: 9999, width: 320, animation: "fadeSlideDown 0.15s ease-out" }}
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="px-4 pt-4 pb-3 border-b border-gray-50 flex items-center justify-between">
                  <h3 className="font-black text-gray-900 text-sm">🎨 בחר רקע</h3>
                  <button onClick={() => setShowBgPicker(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1">×</button>
                </div>

                {/* Theme swatches */}
                <div className="p-4">
                  {/* Solid colors */}
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">צבעים אחידים</p>
                  <div className="grid grid-cols-4 gap-2 mb-4">
                    {BG_THEMES.filter(t => !t.bgImage).map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => handlePickTheme(theme)}
                        title={theme.label}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <div
                          className="w-full h-11 rounded-xl transition-transform group-hover:scale-105"
                          style={{
                            background: theme.preview,
                            border: bgThemeId === theme.id
                              ? "2.5px solid #f97316"
                              : "2px solid rgba(0,0,0,0.08)",
                            boxShadow: bgThemeId === theme.id ? "0 0 0 2px #f9731640" : undefined,
                          }}
                        />
                        <span className="text-[9px] font-semibold text-gray-400 truncate w-full text-center">{theme.label}</span>
                      </button>
                    ))}
                  </div>

                  {/* Gradients */}
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2.5">גרדיאנטים</p>
                  <div className="grid grid-cols-4 gap-2">
                    {BG_THEMES.filter(t => !!t.bgImage).map(theme => (
                      <button
                        key={theme.id}
                        onClick={() => handlePickTheme(theme)}
                        title={theme.label}
                        className="flex flex-col items-center gap-1 group"
                      >
                        <div
                          className="w-full h-11 rounded-xl transition-transform group-hover:scale-105"
                          style={{
                            background: theme.preview,
                            border: bgThemeId === theme.id
                              ? "2.5px solid #f97316"
                              : "2px solid rgba(0,0,0,0.08)",
                            boxShadow: bgThemeId === theme.id ? "0 0 0 2px #f9731640" : undefined,
                          }}
                        />
                        <span className="text-[9px] font-semibold text-gray-400 truncate w-full text-center">{theme.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Logo — left side in RTL */}
        <div dir="ltr">
          <img src="/beseder_primary_2x.png" alt="beseder" className="block" style={{ height: 40, width: 'auto', maxWidth: 140 }} />
        </div>
      </div>
    </nav>
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
  const blocked  = project.subProjects.reduce((n, sp) => n + sp.stages.filter(s => s.status === "blocked").length, 0);

  return (
    <div
      className="card overflow-hidden flex flex-col hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group cursor-move h-full"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
    >
      <div className="h-1.5 w-full" style={{ background: project.color }} />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onClick} className="flex items-start gap-3 flex-1 text-right">
            <span className="text-3xl mt-0.5">{project.emoji}</span>
            <div>
              <h3 className="font-black text-gray-900 text-base leading-tight">{project.name}</h3>
              {project.description && <p className="text-sm text-gray-400 mt-0.5">{project.description}</p>}
            </div>
          </button>
          <div className="flex gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={e => { e.stopPropagation(); onEdit(); }}   className="icon-btn w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-gray-100 hover:bg-teal-50 text-gray-400 hover:text-teal-600 flex items-center justify-center text-xs">✏️</button>
            <button onClick={e => { e.stopPropagation(); onDelete(); }} className="icon-btn w-8 h-8 sm:w-7 sm:h-7 rounded-lg bg-gray-100 hover:bg-red-50   text-gray-400 hover:text-red-400   flex items-center justify-center text-sm font-bold">×</button>
          </div>
        </div>

        {project.subProjects.length > 0 && (
          <button onClick={onClick} className="flex flex-wrap gap-1.5">
            {project.subProjects.map(sp => (
              <span key={sp.id} className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                {sp.emoji} {sp.name}
              </span>
            ))}
          </button>
        )}

        {(() => {
          const totalExp = project.subProjects.reduce((s, sp) => s + subMonthlyExpenses(sp), 0);
          if (totalExp === 0) return null;
          return (
            <button onClick={onClick} className="flex items-center gap-1.5 text-xs text-gray-500">
              <span>💸</span>
              <span className="font-semibold" style={{ color: project.color }}>₪{totalExp.toLocaleString("he-IL")}</span>
              <span className="text-gray-400">/חודש הוצאות</span>
            </button>
          );
        })()}

        {(() => {
          const projectActive = project.subProjects.reduce((n, sp) => n + sp.stages.filter(s => s.status === "active").length, 0);
          return (
            <button onClick={onClick} className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs text-gray-400">{project.subProjects.length} פרויקטים</span>
              {projectActive > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#eff6ff", color: "#2563eb" }}>
                  ▶ {projectActive} פעיל
                </span>
              )}
              {blocked > 0 && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#fee2e2", color: "#dc2626" }}>
                  ⚠ {blocked} תקוע
                </span>
              )}
            </button>
          );
        })()}

        <button onClick={onClick} className="hidden sm:flex btn btn-ghost w-full justify-center text-sm mt-auto" style={{ borderColor: project.color + "40", color: project.color }}>
          פתח מחלקה ←
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
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onClick} className="flex items-center gap-3 flex-1 text-right">
            <span className="text-2xl">{sub.emoji}</span>
            <div>
              <h3 className="font-bold text-gray-900 text-base leading-tight">{sub.name}</h3>
              {sub.description && <p className="text-sm text-gray-400 mt-0.5">{sub.description}</p>}
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

        {sub.stages.length > 0 ? (
          <button onClick={onClick} className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-gray-400">{sub.stages.length} משימות</span>
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
          פתח פרויקט ←
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

/* ─── One-time brand migration (daniel@daniel-social.com) ── */
const MIGRATION_KEY = "beseder_migration_v2_done";
const MIGRATION_BRANDS: Brand[] = [{"id":"d75a2cb5-ed0b-4166-9ecf-8999b8cebb03","name":"בריתס","emoji":"💼","color":"#ef4444","description":"ליווי וייעוץ לעבודות בחו״ל","projects":[{"id":"37707c6a-9d8a-446d-a59e-a4bf3bce3d6d","name":"גיוסים לחו״ל","emoji":"🎯","color":"#3b82f6","description":"","subProjects":[{"id":"780498c6-c4ca-4bb1-b23a-499d9bf917f6","name":"בניית נוכחות","emoji":"🌐","description":"","stages":[{"id":"12f97e84-167a-47d1-b272-1d64dcd29d4b","name":"פתיחת רשתות חברתיות","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"037e17c0-0cf4-4459-90ed-fcfa70dcbd09","name":"פתיחת אתר רשמי","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"fde3a31b-1f99-4014-8d34-8ad26d6165bf","name":"הקמת CRM","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"6c52931b-74f3-4f5b-9ff4-e1dfe40dae99","name":"סרטונים וויראליים","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3},{"id":"b48cabe7-fdd5-453d-9994-15d47cd04e8b","name":"העברת לידים למגייסים","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":4}],"channels":[],"order":0},{"id":"7df114e2-1913-4c8f-8d47-df0b17c294aa","name":"שיווק ורכישת לידים","emoji":"📢","description":"","stages":[{"id":"5771f951-7eba-41c4-abd1-01b27ae14e1d","name":"תוכן אורגני לינקדאין","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"d5631061-70c0-4c99-ac48-98cac4caf389","name":"קמפיין פייסבוק ממומן","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"b1b4162d-2f87-4358-b21c-cc949d4d152b","name":"שותפויות עם ארגונים","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"0776204d-b83f-4a7f-a368-97b921d54f17","name":"ריטרגטינג ואופטימיזציה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3}],"channels":[],"order":1}],"order":0}],"createdAt":"2026-05-27T11:45:59.804Z"},{"id":"e599b564-389f-4b6e-a766-c307510c7536","name":"דניאל סושיאל","emoji":"📣","color":"#8b5cf6","description":"סוכנות סושיאל מדיה ורטיינר","projects":[{"id":"73ea70e3-9bc0-4d66-8853-fbb757f78b2b","name":"ניהול לקוחות","emoji":"🤝","color":"#8b5cf6","description":"","subProjects":[{"id":"47f0c045-cbc3-4070-9b8a-8b04c0de708c","name":"לקוחות קבועים","emoji":"💼","description":"","stages":[],"channels":[{"id":"7119b827-2bd8-49ce-8eab-c5dafbe1bd56","name":"מיס טים","emoji":"⭐","description":"","stages":[{"id":"328a93cd-fbe8-4869-8664-9fa35dcea432","name":"תכנון תוכן חודשי","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"4175acca-8fe4-4684-b625-b857bbc96e78","name":"הפקת תוכן","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"181c5604-23b6-423a-b43f-6ea5e6278c35","name":"פרסום ואופטימיזציה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"00cbdfa8-4d8f-415b-a57d-b384956ff099","name":"דוח חודשי ומשוב","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3}],"order":0},{"id":"b9b4cb93-5157-4f77-8d01-997f0e4db7e2","name":"פאנזה","emoji":"🍕","description":"","stages":[{"id":"c644fc3a-778a-4cf6-a90f-dca2efbade40","name":"תכנון תוכן חודשי","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"42e847e9-ef66-4fda-9688-87969606be61","name":"הפקת תוכן","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"404612b1-39b8-4310-a978-407fa1ff960f","name":"פרסום ואופטימיזציה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"84999deb-f738-407c-8425-63adc00ef8d0","name":"דוח חודשי ומשוב","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3}],"order":1},{"id":"7b736cca-ffda-4e46-819b-df1fa943c187","name":"ממפיס","emoji":"🎸","description":"","stages":[{"id":"be4b46db-571b-4b82-9640-d56dd3d9e36b","name":"תכנון תוכן חודשי","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"8acada66-a88a-49e7-9a1b-0666782dbed6","name":"הפקת תוכן","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"5582078e-0460-4a91-b745-1866f942a1c4","name":"פרסום ואופטימיזציה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"6331d20e-c6b9-43db-a8ed-e6581d6d2445","name":"דוח חודשי ומשוב","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3}],"order":2},{"id":"73c80727-4ead-4bd7-bae1-c7bd4b557e6e","name":"יאמן בר","emoji":"🍷","description":"","stages":[{"id":"1795efdc-7e92-45c7-8f4d-eee3a7b34a5e","name":"תכנון תוכן חודשי","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"b5d1dc86-541b-4e1c-9f9f-ed730a1f36d6","name":"הפקת תוכן","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"5a888626-0f6c-45bb-b1db-edc28a060dfc","name":"פרסום ואופטימיזציה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"9b378f9a-55d4-4123-8ec0-6d84c47ea219","name":"דוח חודשי ומשוב","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3}],"order":3},{"id":"d705caa3-c534-4fbd-bbc2-67b8eb4b179e","name":"הסולטן","emoji":"👑","description":"","stages":[{"id":"e3c48026-d924-4990-b781-c8a95fe52817","name":"תכנון תוכן חודשי","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"b9c6632e-4860-44f5-bf4f-fe25c193e0da","name":"הפקת תוכן","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"b12d510d-5d0a-468b-81eb-918771cbbf0b","name":"פרסום ואופטימיזציה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"a7f889b2-4af8-437a-9a64-86b3d2caf23f","name":"דוח חודשי ומשוב","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3}],"order":4}],"order":0},{"id":"b0b94a0f-a672-44fd-a396-5cae1a009817","name":"לקוחות לא יציבים","emoji":"⚡","description":"","stages":[{"id":"4af2642d-3da3-4a97-b399-4842efcbc0ef","name":"נטורל דיזיין — מעקב","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"80bf733f-fee5-4ee4-86f3-e8d62a080abb","name":"שיחת חיזוק קשר","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"37dc3524-bb98-436e-a650-b9b76cb005cf","name":"הצעת ערך מחודשת","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2}],"channels":[],"order":1},{"id":"97a9ef5c-f4a3-42ec-a7c5-7baccacac540","name":"צמיחה ומכירות","emoji":"🚀","description":"","stages":[{"id":"50ccb571-cae8-406c-b12f-f63b38250947","name":"10 המלצות רטיינר בחודש","step":"","goal":"10 לקוחות מפנים","status":"todo","notes":"","nextAction":"","order":0},{"id":"103cd67b-dec2-47ae-9e12-24c18d791b45","name":"קמפיין לידים למסעדות","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"ca43586f-6152-4c43-98ab-fa880ee00388","name":"שיחות מכירה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"11728155-83f3-499d-8d85-c7eb6173b352","name":"גיוס לקוח חדש","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3}],"channels":[],"order":2}],"order":0},{"id":"07f9a57e-2dff-4799-87ec-98bab8ab0445","name":"יעדים פיננסיים","emoji":"💰","color":"#10b981","description":"","subProjects":[{"id":"9ac8b03b-b9b4-437d-9d72-6627ee2a60b2","name":"מעקב הכנסות","emoji":"📊","description":"","stages":[{"id":"50e68c96-e587-4b78-9450-625a4f4cb11d","name":"הכנסה קבועה: 27,000₪","step":"","goal":"27,000₪/חודש","status":"todo","notes":"מיס טים 8K + פאנזה 6K + ממפיס 6K + יאמן בר 4.5K + הסולטן 2.5K","nextAction":"","order":0},{"id":"2ff7344e-9b07-40dc-b7e6-bd3bce734eba","name":"יעד חודשי: 54,710₪","step":"","goal":"54,710₪/חודש","status":"todo","notes":"","nextAction":"","order":1},{"id":"7f277e04-5394-4e47-98c4-f97f62edf707","name":"מעקב פיצ׳ים ולא-יציבים","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"c66947ba-e423-4619-95ea-4399a9703f80","name":"בחינת לקוחות חדשים","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3}],"channels":[],"order":0}],"order":1}],"createdAt":"2026-05-27T12:16:13.158Z"},{"id":"308a1d6d-6e45-4acd-94c0-d13014d16e96","name":"food porn","emoji":"📸","color":"#ec4899","description":"לעזור לכל עסק ליצר תמונות מקצועיות מאייפון","createdAt":"2026-05-27T12:16:13.160Z","projects":[{"id":"d00c178b-0505-4beb-af20-6a394c89dfb7","name":"בניית הפלטפורמה","emoji":"💡","color":"#ec4899","description":"","subProjects":[{"id":"9bc71fc2-13b6-4554-b457-89a7867257ab","name":"מוצר","emoji":"🛠️","description":"","stages":[{"id":"7679b56d-e129-499a-8da7-6308959e34a0","name":"תוכנה לעיבוד תמונות מאייפון","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"858ab7da-63ff-46f1-9d2d-5b7d96b5b2eb","name":"אתר אינטרנט ידידותי למשתמש","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"089a802c-0fc3-4ffc-ae38-6d0309f84927","name":"ממשק ניהול לבעלי עסקים","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"0f98db18-4391-403b-940b-c04a74a8c095","name":"בדיקות ו-QA","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3}],"channels":[],"order":0},{"id":"1eb0e4ae-acdf-4b82-acb1-a6c7dc91662c","name":"מודל עסקי","emoji":"💰","description":"","stages":[{"id":"069e9846-4af2-4b45-98ae-71ca8c2b5d29","name":"מחקר מחירי מתחרים","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"7abf4a84-f347-4e23-a232-bbcf75ca6f43","name":"הגדרת מודל רווח","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"421cb6a1-df49-4bf1-b2be-03a4c38d8c47","name":"תמחור שירות","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"2fbab746-22e9-40a3-a40c-a972b26bb0c2","name":"חבילות ללקוחות","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3}],"channels":[],"order":1},{"id":"e9d0bce9-3a60-4dfe-9e34-e09a30154d32","name":"שיווק","emoji":"📢","description":"","stages":[{"id":"a41512e8-e708-407e-b4eb-01f217c7575e","name":"מערך שיווק ממומן","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"c934e27e-93df-4299-93c6-abd91e067dd1","name":"תוכן אורגני ורשתות","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"9c920cda-9e93-4fbb-9b9a-a4d42c0e2f77","name":"שותפויות עם מסעדות","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"69b24e88-f7bc-48f7-a901-2a7bb333dedc","name":"סקייל","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3}],"channels":[],"order":2}],"order":0},{"id":"1ba6da9c-fd53-4675-b110-023c023f2fc0","name":"קהל היעד","emoji":"🎯","color":"#f59e0b","description":"","subProjects":[{"id":"a02ce202-75a4-4df1-b8da-17e03b5bb3cd","name":"מסעדות","emoji":"🍽️","description":"","stages":[{"id":"01082d0e-0ab6-4ad3-a6b5-3e5ddcdbfb9f","name":"מיפוי מסעדות כשרות","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"69f085fd-06f9-4b44-ade9-7958eea9be21","name":"פנייה ראשונית","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"f3ba61d3-8561-4620-b3c1-fb45745a70c2","name":"פיילוט עם 5 מסעדות","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"a8416ccc-dbb5-4f95-8ac1-b4b8b56d2627","name":"Scale","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3}],"channels":[],"order":0},{"id":"098a21ac-e309-41ed-9f0a-cf8d2b4c15d3","name":"בתי קפה ועגלות","emoji":"☕","description":"","stages":[{"id":"dd10089e-dc22-4bed-a728-6547c5bc7495","name":"מיפוי בתי קפה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"16825e86-6b24-4e39-8d2c-4d75a2110b43","name":"פנייה ראשונית","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"6cc867e6-6ff0-40d3-93fc-a9667170ae3c","name":"פיילוט","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2}],"channels":[],"order":1},{"id":"d1f941c5-34e1-44f5-9fae-8fdfc48f0546","name":"מסעדות שף","emoji":"👨‍🍳","description":"","stages":[{"id":"9411e9bc-7b8d-4e69-839d-d11efb5335bd","name":"מיפוי שפים עצמאיים","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"46efabed-e2e3-4ff4-8a67-ab5a0932ba64","name":"גישה דרך רשתות חברתיות","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"63452ab9-9f25-4c55-9c10-715117ef2e76","name":"פיילוט","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2}],"channels":[],"order":2}],"order":1}]},{"id":"6e58e599-baa2-48cb-918d-32ef1cbb9cfd","name":"ואכלת","emoji":"🍽️","color":"#f97316","description":"אפליקציית מסעדות כשרות","projects":[{"id":"7af8df79-78f0-472f-9383-08e0ad9e739d","name":"מסלול ל-100,000 משתמשים","emoji":"🚀","color":"#f97316","description":"","subProjects":[{"id":"12823ff8-ddd7-4414-b77f-a4cdf681beba","name":"שיווק","emoji":"📢","description":"","stages":[],"channels":[{"id":"891fdabf-e7ab-4c91-9614-5e021d1216a8","name":"סרטונים - לב סונץ","emoji":"🎯","description":"3 סרטונים ויראליים בשבוע","stages":[{"id":"6a61850b-7488-41ab-952c-cb185637c460","name":"","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0}],"order":0},{"id":"c8bcc440-4085-4eeb-a191-a2293764c4be","name":"פוסטים - מיכאל ביטון","emoji":"⚡","description":"רילס / פוסט יומי","stages":[],"order":1},{"id":"40b1b140-5d80-4aff-8b9b-cbb3b77e85c0","name":"מאמרים - יהודה ג'ייקובס","emoji":"📣","description":"כתבות וחדשות 3 פעמים בשבוע לאתר","stages":[],"order":2}],"order":0}],"order":0},{"id":"e257a955-a30a-4cb7-8a55-71cea6a351c1","name":"הרחבת הפלטפורמה","emoji":"🌟","color":"#3b82f6","description":"","subProjects":[{"id":"1adbce88-9a78-419d-ac8e-ea596a8e448d","name":"הזמנת שולחנות","emoji":"🍽️","description":"","stages":[{"id":"34057389-4851-4ad4-b7bc-3652f9a6a898","name":"מחקר שוק ומתחרים","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0,"expenses":[{"id":"4182e3a6-0ab2-48eb-affc-8b5a69683551","name":"סרטונים לב סונץ","amount":2500}]},{"id":"1a42294a-23ad-42db-8bc0-a81a0eef8c15","name":"עיצוב UX/UI","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"1e094725-9806-4adb-ad09-ea4a7060ef7b","name":"פיתוח ואינטגרציה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"1899a1c4-d0de-48e0-9c75-aa92cf20b399","name":"בדיקות ו-QA","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3},{"id":"f4a91f24-a18f-422e-beea-6589c0218fd4","name":"השקה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":4}],"channels":[],"order":0},{"id":"5649aa4c-aa41-450c-a587-c55a5a674853","name":"אולמות אירועים","emoji":"🎊","description":"","stages":[{"id":"26c8bb80-bc05-4754-8f9f-5904fe0271cc","name":"הגדרת מודל עסקי","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"de95c216-3626-4c47-bfd1-84876fab1a59","name":"גיוס אולמות לפלטפורמה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"02d6e0bb-2a7b-45dc-98eb-74fcd18087f3","name":"בניית דפי אולמות","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"328fc7d5-63f0-4ba1-a8e9-f40d047d2405","name":"השקה ושיווק","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3}],"channels":[],"order":1},{"id":"bb66b0ff-6882-4fb0-9268-cb81e9155c62","name":"קייטרינג","emoji":"🍳","description":"","stages":[{"id":"53214e33-456d-4f25-a864-02d0744919f0","name":"הגדרת מודל ומחירון","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"ca48ce59-9398-4d00-8f87-238591cf05bd","name":"גיוס ספקי קייטרינג","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"71cc45d2-a162-4698-9e8b-4cd6c96410e4","name":"בניית דפי ספקים","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"2644a980-779a-45b1-8bd7-7f651dbfe0ff","name":"השקה ושיווק","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3}],"channels":[],"order":2},{"id":"778f8f94-bfd4-4857-b84c-6f2b65b1d082","name":"Hotels כשרים","emoji":"🏨","description":"","stages":[{"id":"0d48cb57-3b4c-48d2-84c3-74ff26fcb304","name":"מיפוי מלונות עם מטבח כשר","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"7e71de30-9774-4273-8c8b-dbc002f025ea","name":"אימות תעודות כשרות","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"50248018-7f04-40f4-8036-70be54e25625","name":"בניית רשומות במערכת","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"ac39c8ce-f1f3-4e96-bee2-b3ac377c8a22","name":"השקה ופרסום","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3}],"channels":[],"order":3}],"order":1}],"createdAt":"2026-05-27T11:35:20.158Z"},{"id":"f5645d60-7c07-47d0-b863-59be62f112aa","name":"פיננסי אישי","emoji":"💰","color":"#10b981","description":"ניהול נכסים, הלוואות והוצאות","createdAt":"2026-05-27T12:36:37.078Z","projects":[{"id":"83d7f658-e769-49fe-94af-02a09de5047c","name":"הלוואות","emoji":"🏦","color":"#10b981","description":"","subProjects":[{"id":"83f70ff4-a193-4e34-bba9-4bf27079bb4b","name":"הלוואות פעילות","emoji":"💳","description":"","stages":[],"channels":[{"id":"f7a8d128-4d17-4de6-80d8-68f11441cf7b","name":"רכב","emoji":"🚗","description":"","stages":[{"id":"57bb9132-8080-4209-9c0f-74408a1861c9","name":"בדיקת יתרה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"7adf0d4b-55dd-4298-9379-f07434c3379a","name":"תשלום חודשי","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"136e9709-c14c-428c-9e7f-8d4439e456f1","name":"סגירת הלוואה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2}],"order":0},{"id":"c4d0b67d-1e07-4370-acce-1e356c0caa47","name":"כאל","emoji":"💳","description":"","stages":[{"id":"f8b733a0-8602-41e3-8877-74e930b79e95","name":"בדיקת יתרה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"b7b8ef8f-b0c7-4765-b510-9ed59f6a0493","name":"תשלום חודשי","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"17ed05a5-4f80-4276-a22c-1cda846eb36b","name":"סגירת הלוואה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2}],"order":1},{"id":"1bf8e682-60a6-4471-9073-54273040cc8f","name":"מזרחי פרטי","emoji":"🏦","description":"","stages":[{"id":"ea230601-beca-428f-8d2d-321eb6a7ea05","name":"בדיקת יתרה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"635f26c0-c3d3-4d84-b1d2-45d195a44cf3","name":"תשלום חודשי","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"2705b66a-984f-49f1-93bc-10b78af7d58d","name":"מיחזור/סגירה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2}],"order":2},{"id":"fa790d31-4ef8-4dd4-b0c8-7175e86fb849","name":"מזרחי עסקי","emoji":"🏢","description":"","stages":[{"id":"fa3e7a91-20cd-4a0a-b28b-d0b075d41388","name":"בדיקת יתרה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"542147a4-c378-481b-9df1-c1c6f74d2dcc","name":"תשלום חודשי","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"bc41e693-9f0a-4850-afe4-15c5cf9c7520","name":"מיחזור/סגירה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2}],"order":3},{"id":"39d9efb9-d50a-4291-9c25-959cce94e890","name":"בנק פועלים","emoji":"🔵","description":"","stages":[{"id":"1336c172-48f4-472d-b01c-d4f3b73b51d4","name":"בדיקת יתרה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"3a84e2b3-f003-42f3-9d32-08623796b525","name":"תשלום חודשי","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"5b62fe19-419c-4379-8213-3d34f2094e8e","name":"סגירת הלוואה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2}],"order":4},{"id":"14ec3b7e-1328-47a7-b70b-adb654b4d108","name":"כאל 2","emoji":"💴","description":"","stages":[{"id":"eb754fca-d1ab-4bbd-9742-11f6aa88bcb5","name":"בדיקת יתרה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"9ad77df6-ca1c-4d5f-8a3b-3695858f1932","name":"תשלום חודשי","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"1e54c04d-2fab-4c94-9718-dcbeb8cce703","name":"סגירת הלוואה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2}],"order":5},{"id":"a13c0c63-87ba-431c-bdf5-344bc5a0eb17","name":"איתי מתכנת","emoji":"💻","description":"","stages":[{"id":"df5697ba-8eb4-4742-af2b-3be7a96bc964","name":"בדיקת יתרה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"effcd26b-55f6-48ee-a0c2-ddb9c7f269a4","name":"תשלום חודשי","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"77eaeeed-c78b-43f2-b818-ed8e2539b261","name":"סגירת הלוואה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2}],"order":6}],"order":0}],"order":0},{"id":"2a612a0f-93ad-446f-82e1-6d87e0485243","name":"הוצאות קבועות","emoji":"📊","color":"#f59e0b","description":"","subProjects":[{"id":"6cde9da1-09e2-448a-a9ac-717454bb556a","name":"הוצאות חודשיות","emoji":"📋","description":"","stages":[],"channels":[{"id":"bff8d591-b4e1-4722-8b9a-7025ebd1a30d","name":"ביטוח מקף ₪1,547","emoji":"🛡️","description":"","stages":[{"id":"54bba9f9-f50d-4879-88b1-e4cb8045734f","name":"בדיקה שנתית","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"04f4c0db-6133-4272-9167-491f04aaf18f","name":"חידוש","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"2d1cd0fa-53ad-4277-a338-c00911fd530b","name":"השוואת מחירים","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2}],"order":0},{"id":"48e0f4ec-d1de-423c-9c54-2e7bfac485a3","name":"שכירות ₪5,500","emoji":"🏠","description":"","stages":[{"id":"fb757484-78f3-434d-ac1b-b00ebb52f5af","name":"תשלום חודשי","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"48ea8919-cb6d-4ec5-8869-bb28cb3e6597","name":"חידוש חוזה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"5d955d86-3f7e-4a83-b96d-251dfa6b86dd","name":"מו\"מ על מחיר","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2}],"order":1},{"id":"d24dad1a-c13e-4cd8-936b-835ca2713386","name":"כרטיסי אשראי ₪6,000","emoji":"💳","description":"","stages":[{"id":"072898ec-3b2c-48bc-8c1a-3e85da06b7d0","name":"מעקב חודשי","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"3ab6e9b7-aba2-4fa2-8e16-cdb39432d13b","name":"בדיקת חיובים","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"37942263-fe2f-4ca6-a72c-c11a2d69e280","name":"הפחתת הוצאות","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2}],"order":2},{"id":"1e721c35-f554-497e-972f-0ab72479f785","name":"שונות ₪2,000","emoji":"🔀","description":"","stages":[{"id":"1c55ce0f-39b4-4bb6-ad40-d4596800013b","name":"מעקב חודשי","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"6977d2f1-c005-474e-8cc5-e6e6361c2083","name":"קטגוריזציה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"9d81ec5e-0624-462e-bb82-62ae3a2336ea","name":"אופטימיזציה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2}],"order":3}],"order":0}],"order":1},{"id":"2ecd9756-18a0-42f3-882e-2dfad7f1825a","name":"נכסים","emoji":"🏘️","color":"#6366f1","description":"","subProjects":[{"id":"0492528e-0ff8-4d3d-9737-5e914c54f422","name":"נדל\"ן","emoji":"🏗️","description":"","stages":[],"channels":[{"id":"484aa97d-0ca8-4e2a-ba0e-79707fa3c115","name":"דב קסט 11","emoji":"🏠","description":"","stages":[{"id":"842d3964-0c35-497b-a4e2-6937182708a1","name":"מצב הנכס","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"b04ae467-f806-4477-a84a-06afd6dcdc4b","name":"תפוסה/שכירות","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"75919bbb-8f22-4b8e-890b-439fb912d9f6","name":"ניהול שוטף","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"571c4878-d542-409d-9f7f-3b8aa3c4365d","name":"תחזוקה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3},{"id":"ab31549f-04ea-42f2-8e81-46fdb27cf91d","name":"תכנון מכירה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":4}],"order":0},{"id":"3691c375-2274-45eb-bc36-7e9c54619eba","name":"VIE 1125 12","emoji":"🏢","description":"","stages":[{"id":"fffc6244-f5b2-4b06-86d5-fed93c3f601c","name":"מצב הנכס","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"910b89c5-562d-4230-8714-3ea679f19e66","name":"תפוסה/שכירות","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"01b7611d-ba32-4a4d-aaae-01e28d4a3663","name":"ניהול שוטף","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"4a5acdbc-0ca2-42d6-b31e-f68cb6420773","name":"תחזוקה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3},{"id":"275fcfc5-8be8-40e4-a941-84c55306d671","name":"תכנון מכירה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":4}],"order":1},{"id":"a475c3da-4354-4d17-8df2-30d5e75809ff","name":"VIE 1222 11","emoji":"🏢","description":"","stages":[{"id":"af64711c-6c0e-4c8a-b7af-3f8c821fd08f","name":"מצב הנכס","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":0},{"id":"64146882-8ae6-4566-865e-183000a4b99b","name":"תפוסה/שכירות","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":1},{"id":"efc83c8a-466d-48c3-9c8e-608b08f37e94","name":"ניהול שוטף","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":2},{"id":"4aca1dd0-c3f8-4c3c-8834-2db0b33c5ac5","name":"תחזוקה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":3},{"id":"ad2d0c15-69a3-45ad-931b-b0526ae2a26c","name":"תכנון מכירה","step":"","goal":"","status":"todo","notes":"","nextAction":"","order":4}],"order":2}],"order":0}],"order":2}]}];

/* ─── One-time financial data migration (daniel@daniel-social.com) ── */
const FIN_MIGRATION_KEY = "beseder_fin_migration_v1_done";
const MIGRATION_FINANCIAL: FinancialData = {"loans":[{"id":"bbzqgq8kylp","name":"רכב","principal":46600,"monthlyPayment":1361.33,"paidMonths":4,"totalMonths":36},{"id":"rd8l1hkduk","name":"כאל מזרחי מורשה","principal":50000,"monthlyPayment":2272.78,"paidMonths":2,"totalMonths":24},{"id":"wgrepajvp8d","name":"מזרחי פרטי","principal":38000,"monthlyPayment":820.66,"paidMonths":5,"totalMonths":60},{"id":"8rszsqoezu4","name":"מזרחי עסקי","principal":115313,"monthlyPayment":2520.22,"paidMonths":4,"totalMonths":60},{"id":"rpp6hacm18","name":"בנק פועלים","principal":110000,"monthlyPayment":1250.61,"paidMonths":16,"totalMonths":120},{"id":"pl2zfn6henh","name":"כאל","principal":17500,"monthlyPayment":1587.79,"paidMonths":1,"totalMonths":12},{"id":"pf058nubyb","name":"איתי מתכנת","principal":48020,"monthlyPayment":1000,"paidMonths":2,"totalMonths":50}],"expenses":[{"id":"gk7vswz4u6","name":"ביטוח מקף","amount":1547,"frequency":"monthly"},{"id":"8v7qi53j174","name":"שכירות","amount":5500,"frequency":"monthly"},{"id":"qgm2gpc4slh","name":"כרטיסי אשראי","amount":6000,"frequency":"monthly"},{"id":"nanxkgtmms","name":"שונות","amount":2000,"frequency":"monthly"}],"incomes":[],"properties":[{"id":"ozaw2fa6sdk","name":"דב יוסף 11, באר שבע","purchasePrice":1000000,"incomes":[{"id":"ztclgh3x5al","name":"מאשה (יחידה אמצעית)","amount":2600},{"id":"g3dro3jpyxm","name":"הגר (יחידה תחתית)","amount":2500},{"id":"n5h33r3rer","name":"אגם (יחידה תחתית)","amount":2300}],"expenses":[{"id":"wh3shiim1b","name":"ארנונה","amount":385,"frequency":"monthly"},{"id":"43lzjl0tnyn","name":"חשמל","amount":335,"frequency":"monthly"}],"liabilities":[]},{"id":"alwgtcvevpc","name":"VIE קומה 12 (1125)","purchasePrice":1357000,"incomes":[],"expenses":[],"liabilities":[{"id":"is4sttu201d","name":"שרון - עורך דין","totalDebt":5900,"monthlyPayment":2950,"paidSoFar":14160},{"id":"2oqo10i7uih","name":"ישראל - משכנתא","totalDebt":1180,"monthlyPayment":1180,"paidSoFar":1180},{"id":"f1e0xu2xan9","name":"בנימין סבג - תיווך","totalDebt":50740,"monthlyPayment":0,"paidSoFar":0},{"id":"hksdcgodofc","name":"שלום גבאי - יזם","totalDebt":784700,"monthlyPayment":0,"paidSoFar":0},{"id":"2i1a7hfu26z","name":"בלדי - קבלן","totalDebt":469000,"monthlyPayment":3300,"paidSoFar":35400},{"id":"rn1l0rmb23","name":"מס רכישה","totalDebt":27303,"monthlyPayment":0,"paidSoFar":0}]},{"id":"43d7pyy985c","name":"VIE קומה 11 (1222)","purchasePrice":1062000,"incomes":[],"expenses":[],"liabilities":[{"id":"opv0khu4up","name":"שלום גבאי - יזם","totalDebt":445000,"monthlyPayment":0,"paidSoFar":0},{"id":"kbhr8ygf14n","name":"בלדי - קבלן","totalDebt":549100,"monthlyPayment":3300,"paidSoFar":67900},{"id":"pxe0zstej6","name":"מס רכישה","totalDebt":27303,"monthlyPayment":0,"paidSoFar":0}]}],"asOfDate":"2026-04-27"};

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
      // one-time migration: inject missing brands
      const migrated = (() => {
        if (typeof window === "undefined") return base;
        if (localStorage.getItem(MIGRATION_KEY)) return base;
        const migrationNames = new Set(MIGRATION_BRANDS.map(b => b.name));
        const filtered = base.filter((b: Brand) => !migrationNames.has(b.name));
        const merged = [...filtered, ...MIGRATION_BRANDS];
        localStorage.setItem(MIGRATION_KEY, "1");
        return merged;
      })();
      if (migrated.length !== base.length || (!cloud && local.length > 0)) {
        saveBrands(migrated);
      }
      setBrands(migrated);
      if (typeof window !== "undefined") {
        localStorage.setItem("vaachalta_brands_v1", JSON.stringify(migrated));
      }
      if (migrated.length === 0) {
        setTimeout(() => setShowBrandModal(true), 400);
      }
    });
    // one-time financial data migration — save directly to brand-specific key
    if (typeof window !== "undefined" && !localStorage.getItem(FIN_MIGRATION_KEY)) {
      saveFinancialData(MIGRATION_FINANCIAL, "f5645d60-7c07-47d0-b863-59be62f112aa");
      localStorage.setItem(FIN_MIGRATION_KEY, "1");
    }
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

        <div className="sticky top-0 z-30 border-b" style={{ background: `${activeProject.color}10`, borderColor: `${activeProject.color}25` }}>
          <div className="max-w-2xl mx-auto px-4 py-2 flex items-center justify-between gap-2">
            <BackButton emoji={activeSubProject.emoji} label={activeSubProject.name} onClick={() => { setActiveChannel(null); setSelectedStage(null); }} />
            <div className="flex gap-1.5">
              <button onClick={() => setEditingChannel(activeChannel)} className="btn btn-ghost text-sm px-3">✏️<span className="hidden sm:inline"> ערוך</span></button>
              <button onClick={handleAddChannelStageEnd} className="btn btn-orange text-sm px-3">+<span className="hidden sm:inline"> משימה חדשה</span><span className="sm:hidden"> משימה</span></button>
            </div>
          </div>
        </div>

        <div className="max-w-2xl mx-auto px-4 py-5 space-y-5 animate-in">
          <div className="flex items-center gap-3 pt-1">
            <span className="text-3xl">{activeChannel.emoji}</span>
            <div>
              <h1 className="font-black text-gray-900 text-xl">{activeChannel.name}</h1>
              {activeChannel.description && <p className="text-sm text-gray-400 mt-0.5">{activeChannel.description}</p>}
            </div>
          </div>

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

        {/* Context header */}
        <div className="sticky top-0 z-30 border-b" style={{ background: `${activeProject.color}10`, borderColor: `${activeProject.color}25` }}>
          <div className="max-w-screen-lg mx-auto px-4 py-2 flex items-center justify-between gap-2">
            <BackButton emoji={activeProject.emoji} label={activeProject.name} onClick={() => { setActiveSubProject(null); setSelectedStage(null); }} />
            <div className="flex gap-1.5">
              <button onClick={() => setEditingSub(activeSubProject)} className="btn btn-ghost text-sm px-3">✏️<span className="hidden sm:inline"> ערוך</span></button>
              {hasChannels
                ? <button onClick={() => setShowChannelModal(true)} className="btn btn-orange text-sm px-3">+<span className="hidden sm:inline"> פריט חדש</span><span className="sm:hidden"> פריט</span></button>
                : hasStages
                  ? <button onClick={handleAddStageEnd} className="btn btn-orange text-sm px-3">+<span className="hidden sm:inline"> משימה חדשה</span><span className="sm:hidden"> משימה</span></button>
                  : null
              }
            </div>
          </div>
        </div>

        <div className="max-w-screen-lg mx-auto px-4 py-5 space-y-5 animate-in">
          {/* Title */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-3xl">{activeSubProject.emoji}</span>
            <div>
              <h1 className="font-black text-gray-900 text-xl">{activeSubProject.name}</h1>
              {activeSubProject.description && <p className="text-sm text-gray-400 mt-0.5">{activeSubProject.description}</p>}
            </div>
          </div>

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

        {/* Context header */}
        <div className="sticky top-0 z-30 border-b" style={{ background: `${activeBrand.color}10`, borderColor: `${activeBrand.color}25` }}>
          <div className="max-w-screen-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <BackButton emoji={activeBrand.emoji} label={activeBrand.name} onClick={() => setActiveProject(null)} />
            <div className="flex gap-2">
              <button onClick={() => setEditingProject(activeProject)} className="btn btn-ghost text-sm">✏️ ערוך</button>
              <button onClick={() => setShowSubModal(true)} className="btn btn-orange text-sm">+ פרויקט חדש</button>
            </div>
          </div>
        </div>

        <div className="max-w-screen-lg mx-auto px-4 py-5 space-y-6 animate-in">
          {/* Title */}
          <div className="flex items-center gap-3 pt-1">
            <span className="text-3xl">{activeProject.emoji}</span>
            <div>
              <h1 className="font-black text-gray-900 text-2xl">{activeProject.name}</h1>
              {activeProject.description && <p className="text-sm text-gray-400 mt-0.5">{activeProject.description}</p>}
            </div>
          </div>

          {/* Projects summary */}
          {totalStages > 0 && (
            <div className="flex items-center gap-3 px-1">
              <span className="text-xs text-gray-400">{activeProject.subProjects.length} פרויקטים · {doneStages}/{totalStages} משימות הושלמו</span>
            </div>
          )}

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
                className="card flex flex-col items-center justify-center gap-3 py-8 hover:shadow-md transition-all hover:-translate-y-0.5 border-2 border-dashed border-gray-200 bg-transparent h-full"
              >
                <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-500 flex items-center justify-center text-2xl">+</div>
                <span className="font-semibold text-gray-400 text-sm">פרויקט חדש</span>
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
    // When coming from personal finance button (activeBrand is null), use the dedicated finance brand's ID
    // When coming from within a brand (activeBrand is set), use that brand's ID
    const personalFinanceBrandId = brands.find((b) => b.emoji === "💰")?.id ?? "personal";
    const financeBrandId = activeBrand?.id ?? personalFinanceBrandId;
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

        {/* Context header */}
        <div className="sticky top-0 z-30 border-b" style={{ background: `${activeBrand.color}10`, borderColor: `${activeBrand.color}25` }}>
          <div className="max-w-screen-lg mx-auto px-4 py-3 flex items-center justify-between gap-2">
            <BackButton emoji="🏠" label="המותגים שלי" onClick={() => { setActiveBrand(null); setShowBrandFinancial(false); }} />
            <div className="flex gap-1.5 sm:gap-2">
              <button onClick={() => setShowWhiteboard(true)} className="hidden sm:inline-flex btn btn-ghost text-sm">🗺️ מפה</button>
              <button onClick={() => setShowBrandFinancial(true)} className="btn btn-ghost text-sm px-2.5 sm:px-4">💰<span className="hidden sm:inline"> פיננסי</span></button>
              <button onClick={() => setEditingBrand(activeBrand)} className="btn btn-ghost text-sm px-2.5 sm:px-4">✏️ <span className="hidden sm:inline">ערוך מותג</span></button>
              <button onClick={() => setShowProjectModal(true)} className="btn btn-orange text-sm px-3 sm:px-4">+ <span className="hidden sm:inline">מחלקה חדשה</span><span className="sm:hidden">מחלקה</span></button>
            </div>
          </div>
        </div>

        <div className="max-w-screen-lg mx-auto px-4 py-5 space-y-6 animate-in">
          {/* Title */}
          <div className="flex items-center gap-4 pt-1">
            {activeBrand.logo
              ? <img src={activeBrand.logo} alt={activeBrand.name} className="w-14 h-14 rounded-2xl object-contain bg-white border border-gray-100 shadow-sm flex-shrink-0" />
              : <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-sm flex-shrink-0" style={{ background: activeBrand.color + "20", border: `2px solid ${activeBrand.color}30` }}>{activeBrand.emoji}</div>
            }
            <div>
              <h1 className="font-black text-gray-900 text-2xl">{activeBrand.name}</h1>
              {activeBrand.description && <p className="text-sm text-gray-400 mt-0.5">{activeBrand.description}</p>}
            </div>
          </div>

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
                style={{ border: "2px solid #d1fae5" }}
              >
                <div className="h-1.5 w-full" style={{ background: "#10b981" }} />
                <div className="p-5 flex flex-col gap-3 flex-1">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: "#f0fdf4" }}>💰</div>
                    <div>
                      <h3 className="font-black text-gray-900 text-base leading-tight">ניהול פיננסי</h3>
                      <p className="text-xs text-gray-400 mt-0.5">הלוואות, הוצאות, הכנסות, נכסים</p>
                    </div>
                  </div>
                  <div className="btn w-full justify-center text-sm mt-auto" style={{ borderColor: "#10b98140", color: "#10b981", border: "1.5px solid #10b98140", borderRadius: 12, padding: "6px 0" }}>
                    פתח פאנל ←
                  </div>
                </div>
              </button>

              <button
                onClick={() => setShowProjectModal(true)}
                className="card flex flex-col items-center justify-center gap-3 py-8 hover:shadow-md transition-all hover:-translate-y-0.5 border-2 border-dashed border-gray-200 bg-transparent h-full"
              >
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-500 flex items-center justify-center text-2xl">+</div>
                <span className="font-semibold text-gray-400 text-sm">מחלקה חדשה</span>
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
