"use client";

import { useState, useEffect } from "react";
import { Brand, Project, SubProject, Channel, Stage, StageStatus } from "@/lib/types";
import { loadBrands, saveBrands, createStage } from "@/lib/storage";
import { v4 as uuidv4 } from "uuid";
import ProjectPipeline from "@/components/ProjectPipeline";
import StageEditDrawer from "@/components/StageEditDrawer";
import BrandModal from "@/components/BrandModal";
import BrandWizard from "@/components/BrandWizard";
import NewProjectModal from "@/components/NewProjectModal";
import SubProjectModal from "@/components/SubProjectModal";
import ChannelModal from "@/components/ChannelModal";
import FinancialDashboard from "@/components/FinancialDashboard";

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
  return subDirect + stageDirect + chExp;
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
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20 flex pointer-events-none">
      <div
        className="rounded-full flex flex-row items-center pointer-events-auto"
        style={{
          background: "rgba(20,20,22,0.72)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          boxShadow: "0 8px 32px rgba(0,0,0,0.28), 0 1px 0 rgba(255,255,255,0.06) inset",
          padding: "5px 6px",
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
              padding: item.isCurrent ? "5px 12px 5px 10px" : "5px 9px",
              background: item.isCurrent ? "rgba(255,255,255,0.15)" : "transparent",
              opacity: item.isCurrent ? 1 : 0.45,
            }}
          >
            <span style={{ fontSize: 15, lineHeight: 1, filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}>{item.emoji}</span>
            {item.isCurrent && (
              <span
                className="font-semibold text-white"
                style={{
                  fontSize: 12,
                  lineHeight: 1,
                  maxWidth: 110,
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
  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#f0f2f5" }}>
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          {brand.logo
            ? <img src={brand.logo} alt={brand.name} className="w-10 h-10 rounded-2xl object-contain bg-gray-50 border border-gray-100" />
            : <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-2xl" style={{ background: brand.color + "18", border: `2px solid ${brand.color}30` }}>{brand.emoji}</div>
          }
          <div>
            <h2 className="font-black text-gray-900 text-lg leading-tight">{brand.name}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{brand.projects.length} פרויקט{brand.projects.length !== 1 ? "ים" : ""} · תצוגת מפה</p>
          </div>
        </div>
        <button onClick={onClose} className="btn btn-ghost text-sm gap-1">× סגור</button>
      </div>

      {/* Scrollable canvas */}
      <div className="flex-1 overflow-auto p-6">
        <div className="space-y-5 max-w-screen-xl mx-auto">
          {brand.projects.length === 0 && (
            <div className="bg-white rounded-2xl p-16 text-center shadow-sm">
              <div className="text-5xl mb-3">📭</div>
              <p className="text-gray-400 font-semibold">אין פרויקטים במותג זה עדיין</p>
            </div>
          )}
          {brand.projects.map(project => {
            const allS = project.subProjects.reduce((n, sp) => n + sp.stages.length, 0);
            const doneS = project.subProjects.reduce((n, sp) => n + sp.stages.filter(s => s.status === "done").length, 0);
            const projPct = allS > 0 ? Math.round((doneS / allS) * 100) : 0;

            return (
              <div key={project.id} className="bg-white rounded-2xl overflow-hidden shadow-sm"
                style={{ border: `1px solid ${project.color}28` }}>

                {/* Project header bar */}
                <button
                  onClick={() => onNavigateTo(project)}
                  className="w-full flex items-center justify-between px-5 py-4 transition-opacity hover:opacity-90"
                  style={{ background: project.color + "0e", borderBottom: `1px solid ${project.color}1a` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl" style={{ background: project.color + "20" }}>
                      {project.emoji}
                    </div>
                    <div className="text-right">
                      <h3 className="font-black text-gray-900 text-base">{project.name}</h3>
                      <p className="text-xs text-gray-400 mt-0.5">{project.subProjects.length} מחלקות</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <span className="font-black text-2xl" style={{ color: project.color }}>{projPct}%</span>
                      <div className="w-28 h-1.5 bg-gray-100 rounded-full mt-1 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${projPct}%`, background: project.color }} />
                      </div>
                    </div>
                    <span className="text-gray-300 text-lg">←</span>
                  </div>
                </button>

                {/* Departments grid */}
                <div className="p-4 flex gap-3 flex-wrap">
                  {project.subProjects.map(sub => {
                    const hasChannels = sub.channels.length > 0;
                    const hasStages   = sub.stages.length > 0;
                    const subPct      = hasChannels
                      ? pct(sub.channels.flatMap(c => c.stages))
                      : pct(sub.stages);
                    const itemCount   = hasChannels ? sub.channels.length : sub.stages.length;

                    return (
                      <div
                        key={sub.id}
                        onClick={() => onNavigateTo(project, sub)}
                        className="flex-1 rounded-xl p-3 text-right transition-all hover:shadow-md hover:-translate-y-0.5 group cursor-pointer"
                        style={{
                          minWidth: 130, maxWidth: 220,
                          background: project.color + "07",
                          border: `1.5px solid ${project.color}20`,
                        }}
                      >
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{sub.emoji}</span>
                          <span className="font-bold text-gray-800 text-sm leading-tight line-clamp-2">{sub.name}</span>
                        </div>

                        {/* Channel chips */}
                        {hasChannels && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {sub.channels.slice(0, 5).map(ch => (
                              <button
                                key={ch.id}
                                onClick={e => { e.stopPropagation(); onNavigateTo(project, sub, ch); }}
                                className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold hover:opacity-70 transition-opacity"
                                style={{ background: project.color + "22", color: project.color }}
                              >
                                <span>{ch.emoji}</span>
                                <span className="max-w-[60px] truncate">{ch.name}</span>
                              </button>
                            ))}
                            {sub.channels.length > 5 && (
                              <span className="text-[10px] text-gray-400 self-center px-1">+{sub.channels.length - 5}</span>
                            )}
                          </div>
                        )}

                        {/* Stage dots */}
                        {!hasChannels && hasStages && (
                          <div className="flex gap-0.5 mb-2 flex-wrap">
                            {sub.stages.slice(0, 8).map(s => (
                              <div key={s.id} className="w-1.5 h-1.5 rounded-full" style={{
                                background: s.status === "done" ? project.color : s.status === "active" ? "#3b82f6" : s.status === "blocked" ? "#ef4444" : "#d1d5db"
                              }} />
                            ))}
                            {sub.stages.length > 8 && <span className="text-[9px] text-gray-400 self-center">+{sub.stages.length - 8}</span>}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <div className="h-1 bg-gray-100 rounded-full overflow-hidden flex-1">
                            <div className="h-full rounded-full" style={{ width: `${subPct}%`, background: project.color }} />
                          </div>
                          <span className="text-[9px] text-gray-400 font-semibold whitespace-nowrap">
                            {itemCount} {hasChannels ? "ערוצים" : "שלבים"}
                          </span>
                        </div>
                      </div>
                    );
                  })}

                  {project.subProjects.length === 0 && (
                    <p className="text-sm text-gray-400 italic py-2 px-1">אין מחלקות עדיין</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BackButton({ emoji, label, onClick }: { emoji?: string; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-gray-200 shadow-sm text-sm font-semibold text-gray-500 hover:text-gray-900 hover:border-gray-300 hover:shadow-md transition-all duration-150 group"
    >
      <span className="text-gray-400 group-hover:text-gray-700 transition-colors text-base leading-none">→</span>
      {emoji && <span className="text-base leading-none">{emoji}</span>}
      <span>{label}</span>
    </button>
  );
}

/* ─── Brand card ──────────────────────────────────────── */
function BrandCard({ brand, onClick, onEdit, onDelete }: {
  brand: Brand; onClick: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const allSubs   = brand.projects.flatMap(p => p.subProjects);
  const progress  = totalPct(allSubs);
  const nProjects = brand.projects.length;

  return (
    <div className="card overflow-hidden flex flex-col hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
      <div className="h-2 w-full rounded-t-[18px]" style={{ background: brand.color }} />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onClick} className="flex items-start gap-3 flex-1 text-right">
            {brand.logo
              ? <img src={brand.logo} alt={brand.name} className="w-10 h-10 rounded-xl object-contain bg-gray-50 border border-gray-100 flex-shrink-0" />
              : <span className="text-3xl mt-0.5 flex-shrink-0">{brand.emoji}</span>
            }
            <div className="min-w-0">
              <h3 className="font-black text-gray-900 text-base leading-tight">{brand.name}</h3>
              {brand.description && <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{brand.description}</p>}
            </div>
          </button>
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={onEdit}   className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-teal-50 text-gray-400 hover:text-teal-600 flex items-center justify-center text-xs">✏️</button>
            <button onClick={onDelete} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50   text-gray-400 hover:text-red-400   flex items-center justify-center text-sm font-bold">×</button>
          </div>
        </div>

        <button onClick={onClick} className="space-y-1.5">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: brand.color }} />
          </div>
          <p className="text-xs text-gray-400">{nProjects} פרויקט{nProjects !== 1 ? "ים" : ""} · {progress}% הושלם</p>
        </button>

        <button onClick={onClick} className="btn btn-ghost w-full justify-center text-sm mt-auto" style={{ borderColor: brand.color + "40", color: brand.color }}>
          פתח מותג ←
        </button>
      </div>
    </div>
  );
}

/* ─── Project card ────────────────────────────────────── */
function ProjectCard({ project, onClick, onEdit, onDelete }: {
  project: Project; onClick: () => void; onEdit: () => void; onDelete: () => void;
}) {
  const progress = totalPct(project.subProjects);
  const blocked  = project.subProjects.reduce((n, sp) => n + sp.stages.filter(s => s.status === "blocked").length, 0);

  return (
    <div className="card overflow-hidden flex flex-col hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
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
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={onEdit}   className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-teal-50 text-gray-400 hover:text-teal-600 flex items-center justify-center text-xs">✏️</button>
            <button onClick={onDelete} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50   text-gray-400 hover:text-red-400   flex items-center justify-center text-sm font-bold">×</button>
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

        <button onClick={onClick} className="space-y-1.5">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, background: project.color }} />
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>{project.subProjects.length} מחלקות · {progress}% הושלם</span>
            {blocked > 0 && <span className="text-red-500">● {blocked} תקוע</span>}
          </div>
        </button>

        <button onClick={onClick} className="btn btn-ghost w-full justify-center text-sm mt-auto" style={{ borderColor: project.color + "40", color: project.color }}>
          פתח פרויקט ←
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
  const p           = pct(sub.stages);
  const blocked     = sub.stages.filter(s => s.status === "blocked").length;
  const active      = sub.stages.filter(s => s.status === "active").length;
  const done        = sub.stages.filter(s => s.status === "done").length;
  const monthlyExp  = subMonthlyExpenses(sub);
  const monthlyInc  = subMonthlyIncomes(sub);

  return (
    <div className="card overflow-hidden flex flex-col hover:shadow-md transition-all duration-200 hover:-translate-y-0.5 group">
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
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={onEdit}   className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-teal-50 text-gray-400 hover:text-teal-600 flex items-center justify-center text-xs">✏️</button>
            <button onClick={onDelete} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50   text-gray-400 hover:text-red-400   flex items-center justify-center text-sm font-bold">×</button>
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
          <button onClick={onClick} className="space-y-1.5">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p}%`, background: color }} />
            </div>
            <div className="flex gap-3 text-xs text-gray-400">
              <span>{done}/{sub.stages.length} הושלמו</span>
              {active  > 0 && <span className="text-blue-500">● {active} בתהליך</span>}
              {blocked > 0 && <span className="text-red-500">● {blocked} תקוע</span>}
            </div>
          </button>
        ) : (
          <p className="text-sm text-gray-300">אין שלבים עדיין</p>
        )}

        <button onClick={onClick} className="btn btn-ghost w-full justify-center text-sm mt-auto">
          פתח מחלקה ←
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
  const p          = pct(channel.stages);
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
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={onEdit}   className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-teal-50 text-gray-400 hover:text-teal-600 flex items-center justify-center text-xs">✏️</button>
            <button onClick={onDelete} className="w-7 h-7 rounded-lg bg-gray-100 hover:bg-red-50   text-gray-400 hover:text-red-400   flex items-center justify-center text-sm font-bold">×</button>
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
          <button onClick={onClick} className="space-y-1.5">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${p}%`, background: color }} />
            </div>
            <div className="flex gap-3 text-xs text-gray-400">
              <span>{done}/{channel.stages.length} הושלמו</span>
              {active  > 0 && <span className="text-blue-500">● {active} בתהליך</span>}
              {blocked > 0 && <span className="text-red-500">● {blocked} תקוע</span>}
            </div>
          </button>
        ) : (
          <p className="text-sm text-gray-300">אין שלבים עדיין</p>
        )}

        <button onClick={onClick} className="btn btn-ghost w-full justify-center text-sm mt-auto">
          פתח פרויקט ←
        </button>
      </div>
    </div>
  );
}

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
  const [showWhiteboard,   setShowWhiteboard]  = useState(false);

  useEffect(() => { setBrands(loadBrands()); setLoaded(true); }, []);

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

  /* ── Brand CRUD ── */
  const handleSaveBrand = (brand: Brand) => {
    const updated = brands.find(b => b.id === brand.id)
      ? brands.map(b => b.id === brand.id ? brand : b)
      : [...brands, brand];
    syncAll(updated);
  };

  const handleDeleteBrand = (id: string) => {
    if (!confirm("למחוק מותג זה וכל הפרויקטים שלו?")) return;
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
    if (!activeBrand || !confirm("למחוק פרויקט זה?")) return;
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
    if (!activeProject || !confirm("למחוק מחלקה זו?")) return;
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
      <div className="min-h-screen bg-gray-50">
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
          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <BackButton emoji={activeSubProject.emoji} label={activeSubProject.name} onClick={() => { setActiveChannel(null); setSelectedStage(null); }} />
            <div className="flex gap-2">
              <button onClick={() => setEditingChannel(activeChannel)} className="btn btn-ghost text-sm">✏️ ערוך</button>
              <button onClick={handleAddChannelStageEnd} className="btn btn-orange text-sm">+ שלב חדש</button>
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
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-gray-700 text-sm">התקדמות</span>
              <span className="font-black text-xl" style={{ color: activeProject.color }}>{progress}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: activeProject.color }} />
            </div>
            <div className="flex gap-4 mt-2.5 flex-wrap">
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
              <h2 className="font-bold text-gray-800">שלבים</h2>
              <span className="text-xs text-gray-400 bg-gray-50 px-2 py-1 rounded-full">לחץ לעריכה</span>
            </div>
            {sorted.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <p className="text-4xl mb-2">📋</p>
                <p className="font-medium mb-3">אין שלבים עדיין</p>
                <button onClick={handleAddChannelStageEnd} className="btn btn-orange text-sm">+ הוסף שלב ראשון</button>
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
      <div className="min-h-screen bg-gray-50">
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
        {editingSub       && <SubProjectModal existing={editingSub} order={activeSubProject.order} onClose={() => setEditingSub(null)} onSave={handleSaveSub} />}

        {/* Context header */}
        <div className="sticky top-0 z-30 border-b" style={{ background: `${activeProject.color}10`, borderColor: `${activeProject.color}25` }}>
          <div className="max-w-screen-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <BackButton emoji={activeProject.emoji} label={activeProject.name} onClick={() => { setActiveSubProject(null); setSelectedStage(null); }} />
            <div className="flex gap-2">
              <button onClick={() => setEditingSub(activeSubProject)} className="btn btn-ghost text-sm">✏️ ערוך</button>
              {hasChannels
                ? <button onClick={() => setShowChannelModal(true)} className="btn btn-orange text-sm">+ פרויקט חדש</button>
                : hasStages
                  ? <button onClick={handleAddStageEnd} className="btn btn-orange text-sm">+ שלב חדש</button>
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

          {/* ── CHANNELS MODE ── */}
          {hasChannels && (
            <>
              <div className="card px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-700 text-sm">התקדמות כללית</span>
                  <span className="font-black text-xl" style={{ color: activeProject.color }}>{chProgress}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${chProgress}%`, background: activeProject.color }} />
                </div>
                <p className="text-xs text-gray-400 mt-2">{activeSubProject.channels.length} פרויקטים</p>
              </div>

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
                  <span className="font-semibold text-gray-400 text-sm">פרויקט חדש</span>
                </button>
              </div>
            </>
          )}

          {/* ── STAGES MODE ── */}
          {hasStages && !hasChannels && (
            <>
              <div className="card px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-gray-700 text-sm">התקדמות</span>
                  <span className="font-black text-xl" style={{ color: activeProject.color }}>{stageProgress}%</span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${stageProgress}%`, background: activeProject.color }} />
                </div>
              </div>
              <div className="card p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-gray-800">שלבים</h2>
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
              <h2 className="font-black text-gray-800 text-lg mb-1">איך תרצה לארגן את המחלקה?</h2>
              <p className="text-gray-400 text-sm mb-7">בחר מצב אחד — אפשר לשנות בהמשך</p>
              <div className="flex gap-4 justify-center flex-wrap">
                <button
                  onClick={handleAddStageEnd}
                  className="card p-6 flex flex-col items-center gap-2 hover:shadow-md transition-all hover:-translate-y-0.5 w-44 cursor-pointer border-2 hover:border-teal-200"
                >
                  <span className="text-3xl">📋</span>
                  <span className="font-bold text-gray-800">שלבים ישירים</span>
                  <span className="text-xs text-gray-400 text-center">רשימה אחת של שלבים לכל המחלקה</span>
                </button>
                <button
                  onClick={() => setShowChannelModal(true)}
                  className="card p-6 flex flex-col items-center gap-2 hover:shadow-md transition-all hover:-translate-y-0.5 w-44 cursor-pointer border-2 hover:border-teal-200"
                >
                  <span className="text-3xl">🗂️</span>
                  <span className="font-bold text-gray-800">פרויקטים</span>
                  <span className="text-xs text-gray-400 text-center">כמה פרויקטים נפרדים, לכל אחד שלבים</span>
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
      <div className="min-h-screen bg-gray-50">
        <BreadcrumbSidebar color={activeBrand.color} items={[
          { emoji: activeBrand.emoji,  name: activeBrand.name,  onClick: () => setActiveProject(null), isCurrent: false },
          { emoji: activeProject.emoji, name: activeProject.name, onClick: () => {},                  isCurrent: true  },
        ]} />
        {showSubModal   && <SubProjectModal order={activeProject.subProjects.length} onClose={() => setShowSubModal(false)} onSave={handleSaveSub} />}
        {editingSub     && <SubProjectModal existing={editingSub} order={editingSub.order} onClose={() => setEditingSub(null)} onSave={handleSaveSub} />}
        {editingProject && <NewProjectModal existing={editingProject} order={editingProject.order} onClose={() => setEditingProject(null)} onSave={handleSaveProject} />}

        {/* Context header */}
        <div className="sticky top-0 z-30 border-b" style={{ background: `${activeBrand.color}10`, borderColor: `${activeBrand.color}25` }}>
          <div className="max-w-screen-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <BackButton emoji={activeBrand.emoji} label={activeBrand.name} onClick={() => setActiveProject(null)} />
            <div className="flex gap-2">
              <button onClick={() => setEditingProject(activeProject)} className="btn btn-ghost text-sm">✏️ ערוך</button>
              <button onClick={() => setShowSubModal(true)} className="btn btn-orange text-sm">+ מחלקה חדשה</button>
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

          {/* Overall progress */}
          <div className="card px-5 py-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-gray-700 text-sm">התקדמות כללית</span>
              <span className="font-black text-xl" style={{ color: activeProject.color }}>{progress}%</span>
            </div>
            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700" style={{ width: `${progress}%`, background: activeProject.color }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{activeProject.subProjects.length} מחלקות · {doneStages}/{totalStages} שלבים הושלמו</p>
          </div>

          {/* Financial overview */}
          {(() => {
            const rows = activeProject.subProjects.map(sp => ({
              sp, exp: subMonthlyExpenses(sp)
            })).filter(r => r.exp > 0);
            if (!rows.length) return null;
            const totalExp = rows.reduce((s, r) => s + r.exp, 0);
            return (
              <div className="card p-4 border-l-4" style={{ borderLeftColor: activeProject.color }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800 text-sm">💸 סיכום הוצאות חודשיות</h3>
                  <span className="font-black text-base" style={{ color: activeProject.color }}>
                    ₪{totalExp.toLocaleString("he-IL")}/חודש
                  </span>
                </div>
                <div className="space-y-2">
                  {rows.map(({ sp, exp }) => (
                    <div key={sp.id} className="flex items-center gap-3">
                      <span className="text-base">{sp.emoji}</span>
                      <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{sp.name}</span>
                      <span className="text-xs font-semibold text-gray-600">
                        ₪{exp.toLocaleString("he-IL")}/חודש
                      </span>
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
              <h2 className="font-black text-gray-800 text-lg mb-2">אין מחלקות עדיין</h2>
              <p className="text-gray-400 mb-5 text-sm">כל מחלקה מקבלת שלבים משלה</p>
              <button onClick={() => setShowSubModal(true)} className="btn btn-orange">+ הוסף מחלקה ראשונה</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
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
                className="card flex flex-col items-center justify-center gap-3 py-12 hover:shadow-md transition-all hover:-translate-y-0.5 border-2 border-dashed border-gray-200 bg-transparent"
              >
                <div className="w-11 h-11 rounded-2xl bg-teal-50 text-teal-500 flex items-center justify-center text-2xl">+</div>
                <span className="font-semibold text-gray-400 text-sm">מחלקה חדשה</span>
              </button>
            </div>
          )}
        </div>
      </div>
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
    if (activeBrand.emoji === "💰") {
      return (
        <FinancialDashboard
          brandId={activeBrand.id}
          onBack={() => setActiveBrand(null)}
        />
      );
    }

    const projects = activeBrand.projects;

    return (
      <div className="min-h-screen bg-gray-50">
        <BreadcrumbSidebar color={activeBrand.color} items={[
          { emoji: activeBrand.emoji, name: activeBrand.name, onClick: () => {}, isCurrent: true },
        ]} />
        {showProjectModal && <NewProjectModal order={projects.length} onClose={() => setShowProjectModal(false)} onSave={handleSaveProject} />}
        {editingProject   && <NewProjectModal existing={editingProject} order={editingProject.order} onClose={() => setEditingProject(null)} onSave={handleSaveProject} />}
        {editingBrand     && <BrandModal existing={editingBrand} onClose={() => setEditingBrand(null)} onSave={handleSaveBrand} />}

        {/* Context header */}
        <div className="sticky top-0 z-30 border-b" style={{ background: `${activeBrand.color}10`, borderColor: `${activeBrand.color}25` }}>
          <div className="max-w-screen-lg mx-auto px-4 py-3 flex items-center justify-between gap-3">
            <BackButton label="המותגים שלי" onClick={() => setActiveBrand(null)} />
            <div className="flex gap-2">
              <button onClick={() => setShowWhiteboard(true)} className="btn btn-ghost text-sm">🗺️ מפה</button>
              <button onClick={() => setEditingBrand(activeBrand)} className="btn btn-ghost text-sm">✏️ ערוך מותג</button>
              <button onClick={() => setShowProjectModal(true)} className="btn btn-orange text-sm">+ פרויקט חדש</button>
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
              p, exp: p.subProjects.reduce((s, sp) => s + subMonthlyExpenses(sp), 0)
            })).filter(r => r.exp > 0);
            if (!projRows.length) return null;
            const totalExp = projRows.reduce((s, r) => s + r.exp, 0);
            return (
              <div className="card p-4 border-l-4" style={{ borderLeftColor: activeBrand.color }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-gray-800 text-sm">💸 סיכום הוצאות חודשיות — כל הפרויקטים</h3>
                  <span className="font-black text-base" style={{ color: activeBrand.color }}>
                    ₪{totalExp.toLocaleString("he-IL")}/חודש
                  </span>
                </div>
                <div className="space-y-2">
                  {projRows.map(({ p, exp }) => (
                    <div key={p.id} className="flex items-center gap-3">
                      <span className="text-base">{p.emoji}</span>
                      <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{p.name}</span>
                      <span className="text-xs font-semibold text-gray-600">
                        ₪{exp.toLocaleString("he-IL")}/חודש
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Projects grid */}
          {projects.length === 0 ? (
            <div className="card p-16 text-center">
              <div className="text-5xl mb-3">🚀</div>
              <h2 className="font-black text-gray-800 text-xl mb-2">אין פרויקטים עדיין</h2>
              <p className="text-gray-400 mb-5 text-sm max-w-xs mx-auto">כל פרויקט מחולק למחלקות ושלבים</p>
              <button onClick={() => setShowProjectModal(true)} className="btn btn-orange">+ צור פרויקט ראשון</button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
              {[...projects].sort((a, b) => a.order - b.order).map(p => (
                <ProjectCard
                  key={p.id}
                  project={p}
                  onClick={() => setActiveProject(p)}
                  onEdit={() => setEditingProject(p)}
                  onDelete={() => handleDeleteProject(p.id)}
                />
              ))}
              <button
                onClick={() => setShowProjectModal(true)}
                className="card flex flex-col items-center justify-center gap-3 py-12 hover:shadow-md transition-all hover:-translate-y-0.5 border-2 border-dashed border-gray-200 bg-transparent"
              >
                <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-500 flex items-center justify-center text-2xl">+</div>
                <span className="font-semibold text-gray-400 text-sm">פרויקט חדש</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ══ LEVEL 0: Brands home ══ */
  return (
    <div className="min-h-screen bg-gray-50">
      {showBrandModal && <BrandWizard onClose={() => setShowBrandModal(false)} onSave={handleSaveBrand} />}
      {editingBrand   && <BrandModal existing={editingBrand} onClose={() => setEditingBrand(null)} onSave={handleSaveBrand} />}

      <div className="max-w-screen-lg mx-auto px-4 py-8 space-y-6 animate-in">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-gray-900">המותגים שלי</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {brands.length === 0 ? "צור מותג ראשון" : `${brands.length} מותג${brands.length !== 1 ? "ים" : ""}`}
            </p>
          </div>
          <button onClick={() => setShowBrandModal(true)} className="btn btn-orange">+ מותג חדש</button>
        </div>

        {brands.length === 0 ? (
          <div className="card p-16 text-center">
            <div className="text-5xl mb-3">🏢</div>
            <h2 className="font-black text-gray-800 text-xl mb-2">צור את המותג הראשון שלך</h2>
            <p className="text-gray-400 mb-5 text-sm max-w-xs mx-auto">כל מותג מכיל פרויקטים, כל פרויקט — מחלקות ושלבים</p>
            <button onClick={() => setShowBrandModal(true)} className="btn btn-orange text-base px-8 py-3">+ צור מותג</button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-5">
            {brands.map(b => (
              <BrandCard
                key={b.id}
                brand={b}
                onClick={() => setActiveBrand(b)}
                onEdit={() => setEditingBrand(b)}
                onDelete={() => handleDeleteBrand(b.id)}
              />
            ))}
            <button
              onClick={() => setShowBrandModal(true)}
              className="card flex flex-col items-center justify-center gap-3 py-12 hover:shadow-md transition-all hover:-translate-y-0.5 border-2 border-dashed border-gray-200 bg-transparent"
            >
              <div className="w-12 h-12 rounded-2xl bg-teal-50 text-teal-500 flex items-center justify-center text-2xl">+</div>
              <span className="font-semibold text-gray-400 text-sm">מותג חדש</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
