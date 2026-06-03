"use client";

/**
 * HebrewDateInput — date/month inputs that always display in DD/MM/YY or MM/YY format.
 * Replaces native browser inputs that show English month names.
 *
 * <HebrewMonthInput  value="2025-02"  onChange={v => ...} className="..." />
 * <HebrewDateInput   value="2025-02-15" onChange={v => ...} className="..." />
 */

import { useEffect, useState } from "react";

const MONTHS_HE = [
  "01","02","03","04","05","06","07","08","09","10","11","12"
];

const MONTHS_NAMES = [
  "ינואר","פברואר","מרץ","אפריל","מאי","יוני",
  "יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"
];

const baseInput =
  "border border-gray-200 rounded-lg px-2 py-1 text-sm bg-white focus:outline-none focus:border-teal-400 font-['Heebo',system-ui,sans-serif] text-right";

/* ══ MonthInput ══════════════════════════════════════════════
   value:    "YYYY-MM"  (or "")
   onChange: (v: string) => void  — emits "YYYY-MM"
*/
export function HebrewMonthInput({
  value,
  onChange,
  className = "",
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  // parse incoming "YYYY-MM"
  const year  = value ? value.slice(0, 4) : "";
  const month = value ? value.slice(5, 7) : "";

  const [localYear, setLocalYear] = useState(year);

  useEffect(() => {
    setLocalYear(year);
  }, [year]);

  const emit = (m: string, y: string) => {
    if (m && y && y.length === 4) {
      onChange(`${y}-${m}`);
    } else {
      onChange("");
    }
  };

  return (
    <div className={`flex gap-1 ${className}`} dir="ltr">
      {/* Month select */}
      <select
        value={month}
        onChange={e => emit(e.target.value, localYear)}
        className={`${baseInput} flex-1 cursor-pointer`}
        dir="rtl"
      >
        <option value="">{placeholder ?? "חודש"}</option>
        {MONTHS_HE.map((m, i) => (
          <option key={m} value={m}>
            {m}/{MONTHS_NAMES[i]}
          </option>
        ))}
      </select>

      {/* Year input */}
      <input
        type="number"
        value={localYear}
        min={2000}
        max={2060}
        placeholder="שנה"
        onChange={e => {
          setLocalYear(e.target.value);
          if (e.target.value.length === 4) emit(month, e.target.value);
        }}
        onBlur={e => {
          if (e.target.value.length === 4) emit(month, e.target.value);
        }}
        className={`${baseInput} w-20 text-center`}
        dir="ltr"
      />
    </div>
  );
}

/* ══ DateInput ═══════════════════════════════════════════════
   value:    "YYYY-MM-DD"  (or "")
   onChange: (v: string) => void — emits "YYYY-MM-DD"
*/
export function HebrewDateInput({
  value,
  onChange,
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  const parts = value ? value.split("-") : ["", "", ""];
  const [y, m, d] = parts;

  const [localDay,   setLocalDay]   = useState(d ?? "");
  const [localMonth, setLocalMonth] = useState(m ?? "");
  const [localYear,  setLocalYear]  = useState(y ?? "");

  useEffect(() => {
    setLocalDay(d ?? "");
    setLocalMonth(m ?? "");
    setLocalYear(y ?? "");
  }, [value]);

  const emit = (day: string, mon: string, yr: string) => {
    const dd = day.padStart(2, "0");
    const mm = mon.padStart(2, "0");
    if (dd && mm && yr.length === 4) {
      onChange(`${yr}-${mm}-${dd}`);
    }
  };

  return (
    <div className={`flex gap-1 items-center ${className}`} dir="ltr">
      {/* Day */}
      <input
        type="number"
        value={localDay}
        min={1}
        max={31}
        placeholder="יום"
        onChange={e => {
          setLocalDay(e.target.value);
          emit(e.target.value, localMonth, localYear);
        }}
        className={`${baseInput} w-14 text-center`}
        dir="ltr"
      />
      <span className="text-gray-300 text-sm font-light">/</span>
      {/* Month select */}
      <select
        value={localMonth.padStart(2, "0")}
        onChange={e => {
          setLocalMonth(e.target.value);
          emit(localDay, e.target.value, localYear);
        }}
        className={`${baseInput} flex-1 cursor-pointer`}
        dir="rtl"
      >
        <option value="">חודש</option>
        {MONTHS_HE.map((mo, i) => (
          <option key={mo} value={mo}>
            {mo} — {MONTHS_NAMES[i]}
          </option>
        ))}
      </select>
      <span className="text-gray-300 text-sm font-light">/</span>
      {/* Year */}
      <input
        type="number"
        value={localYear}
        min={2000}
        max={2060}
        placeholder="שנה"
        onChange={e => {
          setLocalYear(e.target.value);
          if (e.target.value.length === 4) emit(localDay, localMonth, e.target.value);
        }}
        className={`${baseInput} w-20 text-center`}
        dir="ltr"
      />
    </div>
  );
}
