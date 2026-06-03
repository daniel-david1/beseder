"use client";

import { useState } from "react";
import { Project } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

const COLORS = ["#f97316","#3b82f6","#10b981","#8b5cf6","#ec4899","#f59e0b","#ef4444","#14b8a6"];
const EMOJIS = ["🚀","📱","💡","🍽️","🎯","💰","🌟","🛠️","🎨","📊","🔥","💪","🌱","🏆","⚡","🎬"];

interface Props {
  existing?: Project;
  order: number;
  onClose: () => void;
  onSave: (project: Project) => void;
}

export default function NewProjectModal({ existing, order, onClose, onSave }: Props) {
  const [name,        setName]        = useState(existing?.name        ?? "");
  const [emoji,       setEmoji]       = useState(existing?.emoji       ?? "🚀");
  const [color,       setColor]       = useState(existing?.color       ?? "#f97316");
  const [description, setDescription] = useState(existing?.description ?? "");

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id:          existing?.id          ?? uuidv4(),
      name:        name.trim(),
      emoji,
      color,
      description: description.trim(),
      subProjects: existing?.subProjects ?? [],
      order:       existing?.order       ?? order,
    });
    onClose();
  };

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal w-full" style={{ maxWidth: 480 }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-black text-gray-900">
            {existing ? "ערוך מחלקה" : "מחלקה חדשה"}
          </h2>
          <button onClick={onClose} className="icon-btn w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-base">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Emoji */}
          <div>
            <label>אייקון</label>
            <div className="grid grid-cols-8 gap-1 mt-1">
              {EMOJIS.map(e => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  className={`text-xl p-1.5 rounded-lg transition-all ${emoji === e ? "bg-teal-100 ring-2 ring-teal-400" : "hover:bg-gray-100"}`}
                >{e}</button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label>שם המחלקה *</label>
            <input
              className="input text-base font-semibold"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="לדוגמה: מסלול ל-100,000 משתמשים"
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label>תיאור קצר</label>
            <input
              className="input"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="על מה המחלקה הזו?"
            />
          </div>

          {/* Color */}
          <div>
            <label>צבע</label>
            <div className="flex gap-2 mt-1">
              {COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className="w-8 h-8 rounded-full transition-all"
                  style={{
                    background: c,
                    transform: color === c ? "scale(1.2)" : "scale(1)",
                    outline: color === c ? `3px solid ${c}` : "none",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex gap-2 sticky bottom-0 bg-white rounded-b-2xl">
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="btn btn-orange flex-1"
            style={{ opacity: name.trim() ? 1 : 0.5 }}
          >
            {existing ? "שמור שינויים" : "צור מחלקה"}
          </button>
          <button onClick={onClose} className="btn btn-ghost">ביטול</button>
        </div>
      </div>
    </div>
  );
}
