"use client";

import { useState, useRef } from "react";
import { Brand } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

const COLORS = ["#f97316","#3b82f6","#10b981","#8b5cf6","#ec4899","#f59e0b","#ef4444","#14b8a6"];
const EMOJIS = ["🍽️","🚀","💡","🛍️","🎯","💰","🌟","🛠️","🎨","📊","🔥","💪","🌱","🏆","⚡","🎬","🏢","👔","💼","🌐"];

interface Props {
  existing?: Brand;
  onClose: () => void;
  onSave: (brand: Brand) => void;
}

export default function BrandModal({ existing, onClose, onSave }: Props) {
  const [name,        setName]        = useState(existing?.name        ?? "");
  const [emoji,       setEmoji]       = useState(existing?.emoji       ?? "🍽️");
  const [color,       setColor]       = useState(existing?.color       ?? "#f97316");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [logo,        setLogo]        = useState<string | undefined>(existing?.logo);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setLogo(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    onSave({
      id:          existing?.id          ?? uuidv4(),
      name:        name.trim(),
      emoji,
      color,
      description: description.trim(),
      logo,
      projects:    existing?.projects    ?? [],
      createdAt:   existing?.createdAt   ?? new Date().toISOString(),
    });
    onClose();
  };

  return (
    <div className="modal-bg" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal w-full" style={{ maxWidth: 480 }}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl">
          <h2 className="text-lg font-black text-gray-900">
            {existing ? "ערוך מותג" : "מותג חדש"}
          </h2>
          <button onClick={onClose} className="icon-btn w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-500 text-base">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Logo upload */}
          <div>
            <label>לוגו <span className="text-gray-400 font-normal text-xs">— אופציונלי</span></label>
            <div className="flex items-center gap-3 mt-1">
              {logo ? (
                <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 flex-shrink-0 bg-gray-50">
                  <img src={logo} alt="לוגו" className="w-full h-full object-contain" />
                  <button
                    onClick={() => { setLogo(undefined); if (fileRef.current) fileRef.current.value = ""; }}
                    className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center text-[10px] font-bold leading-none hover:bg-red-600 transition-colors"
                  >×</button>
                </div>
              ) : (
                <div
                  onClick={() => fileRef.current?.click()}
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:border-teal-300 hover:text-teal-500 transition-all flex-shrink-0"
                >
                  <span className="text-xl">🖼️</span>
                </div>
              )}
              <div className="flex-1">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-full py-2 px-3 rounded-xl border border-gray-200 text-sm text-gray-500 hover:border-teal-300 hover:text-teal-600 transition-all text-right"
                >
                  {logo ? "החלף לוגו" : "העלה לוגו (PNG, JPG, SVG)"}
                </button>
                <p className="text-xs text-gray-400 mt-1">מוצג בכרטיס המותג ובדשבורד</p>
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
            </div>
          </div>

          {/* Emoji — shown when no logo */}
          {!logo && (
            <div>
              <label>אייקון <span className="text-gray-400 font-normal text-xs">— כשאין לוגו</span></label>
              <div className="grid grid-cols-10 gap-1 mt-1">
                {EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    className={`text-xl p-1.5 rounded-lg transition-all ${emoji === e ? "bg-teal-100 ring-2 ring-teal-400" : "hover:bg-gray-100"}`}
                  >{e}</button>
                ))}
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label>שם המותג *</label>
            <input
              className="input text-base font-semibold"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="לדוגמה: ואכלת, בריתס..."
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
              placeholder="מה המותג הזה עושה?"
            />
          </div>

          {/* Color */}
          <div>
            <label>צבע מותג</label>
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
            {existing ? "שמור שינויים" : "צור מותג"}
          </button>
          <button onClick={onClose} className="btn btn-ghost">ביטול</button>
        </div>
      </div>
    </div>
  );
}
