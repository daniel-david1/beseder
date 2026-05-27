"use client";

import { Stage, StageStatus } from "@/lib/types";

interface Props {
  stages: Stage[];
  onClickStage: (stage: Stage) => void;
  activeStageId: string | null;
}

const STATUS_META: Record<StageStatus, { dot: string; ring: string; label: string }> = {
  todo:    { dot: "#d1d5db", ring: "#f3f4f6", label: "לא התחיל" },
  active:  { dot: "#3b82f6", ring: "#eff6ff", label: "בתהליך" },
  done:    { dot: "#16a34a", ring: "#f0fdf4", label: "הושלם" },
  blocked: { dot: "#dc2626", ring: "#fef2f2", label: "תקוע" },
};

export default function ProjectPipeline({ stages, onClickStage, activeStageId }: Props) {
  const sorted = [...stages].sort((a, b) => a.order - b.order);

  return (
    <div className="flex flex-col gap-0 w-full max-w-2xl">
      {sorted.map((stage, i) => {
        const meta = STATUS_META[stage.status];
        const isActive = activeStageId === stage.id;
        const hasContent = stage.step || stage.goal || stage.nextAction;

        return (
          <div key={stage.id} className="flex flex-col items-stretch">
            {/* Stage row */}
            <div className="flex items-stretch gap-0">
              {/* Left spine: number circle + vertical line */}
              <div className="flex flex-col items-center shrink-0" style={{ width: 40 }}>
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white z-10 shrink-0"
                  style={{ background: meta.dot, boxShadow: isActive ? `0 0 0 4px ${meta.dot}30` : undefined }}
                >
                  {i + 1}
                </div>
                {i < sorted.length - 1 && (
                  <div className="flex-1 w-0.5 my-1" style={{ background: "#e5e7eb", minHeight: 24 }} />
                )}
              </div>

              {/* Card */}
              <div className="flex-1 mb-3 mr-3">
                <button
                  onClick={() => onClickStage(stage)}
                  className="w-full text-right"
                >
                  <div
                    className={`w-full rounded-2xl p-4 border-2 transition-all duration-200 ${
                      isActive ? "shadow-md" : "hover:shadow-sm"
                    }`}
                    style={{
                      borderColor: isActive ? meta.dot : "#f0f0f0",
                      background: isActive ? meta.ring : "white",
                    }}
                  >
                    {/* Header row */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span
                        className="text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: meta.ring, color: meta.dot }}
                      >
                        {meta.label}
                      </span>
                      <p className="font-bold text-gray-900 text-base leading-tight">
                        {stage.name || `שלב ${i + 1}`}
                      </p>
                    </div>

                    {/* Step */}
                    {stage.step && (
                      <p className="text-sm text-gray-500 leading-relaxed mb-1.5">
                        {stage.step}
                      </p>
                    )}

                    {/* Goal */}
                    {stage.goal && (
                      <div className="flex items-start gap-1.5">
                        <span className="text-sm shrink-0">🎯</span>
                        <p className="text-sm text-gray-700 font-medium leading-relaxed">
                          {stage.goal}
                        </p>
                      </div>
                    )}

                    {/* Next action */}
                    {stage.nextAction && (
                      <div className="mt-2 bg-teal-50 rounded-lg px-3 py-2">
                        <p className="text-xs text-teal-700 font-medium">
                          ▶ {stage.nextAction}
                        </p>
                      </div>
                    )}

                    {/* Empty hint */}
                    {!hasContent && (
                      <p className="text-xs text-gray-300">לחץ לעריכה ←</p>
                    )}
                  </div>
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
