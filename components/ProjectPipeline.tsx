"use client";

import { Stage, StageStatus } from "@/lib/types";

interface Props {
  stages: Stage[];
  onClickStage: (stage: Stage) => void;
  activeStageId: string | null;
}

const STATUS_META: Record<StageStatus, { dot: string; bg: string; text: string; label: string; ring: string }> = {
  todo:    { dot: "#9ca3af", bg: "#f9fafb", text: "#6b7280", label: "לא התחיל", ring: "#f3f4f6" },
  active:  { dot: "#3b82f6", bg: "#eff6ff", text: "#1d4ed8", label: "בתהליך",   ring: "#dbeafe" },
  done:    { dot: "#16a34a", bg: "#f0fdf4", text: "#15803d", label: "הושלם",    ring: "#dcfce7" },
  blocked: { dot: "#dc2626", bg: "#fef2f2", text: "#b91c1c", label: "תקוע",     ring: "#fee2e2" },
};

export default function ProjectPipeline({ stages, onClickStage, activeStageId }: Props) {
  const sorted = [...stages].sort((a, b) => a.order - b.order);

  if (sorted.length === 0) return null;

  const counts = {
    done:    sorted.filter(s => s.status === "done").length,
    active:  sorted.filter(s => s.status === "active").length,
    blocked: sorted.filter(s => s.status === "blocked").length,
    todo:    sorted.filter(s => s.status === "todo").length,
  };

  return (
    <div className="w-full max-w-2xl">
      {/* Summary bar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {counts.done > 0 && (
          <span className="flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
            {counts.done} הושלמו
          </span>
        )}
        {counts.active > 0 && (
          <span className="flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block" />
            {counts.active} בתהליך
          </span>
        )}
        {counts.blocked > 0 && (
          <span className="flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 inline-block" />
            {counts.blocked} תקועים
          </span>
        )}
        {counts.todo > 0 && (
          <span className="flex items-center gap-1 text-xs font-semibold text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
            {counts.todo} ממתינות
          </span>
        )}
      </div>

      {/* Task list */}
      <div className="space-y-2">
        {sorted.map((stage) => {
          const meta = STATUS_META[stage.status];
          const isActive = activeStageId === stage.id;
          const hasContent = stage.step || stage.goal || stage.nextAction;

          return (
            <button
              key={stage.id}
              onClick={() => onClickStage(stage)}
              className="w-full text-right group"
            >
              <div
                className="w-full rounded-2xl px-4 py-3.5 border-2 transition-all duration-150 flex items-start gap-3"
                style={{
                  borderColor: isActive ? meta.dot : "transparent",
                  background: isActive ? meta.bg : "white",
                  boxShadow: isActive
                    ? `0 0 0 1px ${meta.dot}20, 0 2px 8px ${meta.dot}15`
                    : "0 1px 3px rgba(0,0,0,0.06)",
                }}
              >
                {/* Status dot */}
                <div
                  className="w-3 h-3 rounded-full shrink-0 mt-1.5 transition-all"
                  style={{
                    background: meta.dot,
                    boxShadow: isActive ? `0 0 0 3px ${meta.dot}30` : undefined,
                  }}
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: meta.ring, color: meta.text }}
                    >
                      {meta.label}
                    </span>
                    <p className="font-bold text-gray-900 text-sm leading-snug truncate">
                      {stage.name || "משימה ללא שם"}
                    </p>
                  </div>

                  {stage.step && (
                    <p className="text-xs text-gray-400 leading-relaxed mt-0.5 line-clamp-2 text-right">
                      {stage.step}
                    </p>
                  )}

                  {stage.nextAction && (
                    <div className="mt-2 flex items-center gap-1.5">
                      <span className="text-xs text-teal-600 font-medium">▶ {stage.nextAction}</span>
                    </div>
                  )}

                  {!hasContent && (
                    <p className="text-xs text-gray-300 mt-0.5">לחץ לעריכה ←</p>
                  )}
                </div>

                {/* Edit arrow */}
                <div className="text-gray-300 group-hover:text-gray-400 transition-colors text-xs shrink-0 mt-1">←</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
