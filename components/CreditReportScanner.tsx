"use client";

import { useState, useRef, useCallback } from "react";
import {
  ParsedCreditReport,
  ParsedLoan,
  parseFromText,
  parsedLoanToAppLoan,
} from "@/lib/creditReportParser";
import type { Loan } from "@/lib/types";

interface Props {
  onClose: () => void;
  onImport: (loans: Loan[]) => void;
}

type Step = "upload" | "parsing" | "review" | "done";

const ils = (n: number) => "₪" + Math.round(n).toLocaleString("he-IL");

/* ── small components ─────────────────────────────────────── */
function LoanTypeTag({ type }: { type: "loan" | "mortgage" }) {
  return type === "mortgage" ? (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
      משכנתא
    </span>
  ) : (
    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">
      הלוואה
    </span>
  );
}

/* ── main ──────────────────────────────────────────────────── */
export default function CreditReportScanner({ onClose, onImport }: Props) {
  const [step, setStep] = useState<Step>("upload");
  const [report, setReport] = useState<ParsedCreditReport | null>(null);
  const [loans, setLoans] = useState<ParsedLoan[]>([]);
  const [error, setError] = useState<string>("");
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* ── PDF extraction using pdfjs ── */
  const parsePdf = useCallback(async (file: File) => {
    setStep("parsing");
    setProgress(10);
    setError("");

    try {
      // Dynamic import to avoid SSR issues
      const pdfjsLib = await import("pdfjs-dist");

      // Use CDN worker so we don't need to configure webpack
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

      setProgress(20);

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      setProgress(30);

      let fullText = "";
      const totalPages = pdf.numPages;

      // Extract text page by page
      for (let p = 1; p <= totalPages; p++) {
        const page = await pdf.getPage(p);
        const textContent = await page.getTextContent();

        // Get text items with positions
        const items = textContent.items as Array<{
          str: string;
          transform: number[];
        }>;

        // Group items by Y position (same row = same line)
        const lineMap = new Map<number, Array<{ str: string; x: number }>>();

        for (const item of items) {
          if (!item.str.trim()) continue;
          const y = Math.round(item.transform[5]);
          const x = Math.round(item.transform[4]);
          if (!lineMap.has(y)) lineMap.set(y, []);
          lineMap.get(y)!.push({ str: item.str, x });
        }

        // Sort lines top-to-bottom (higher Y = top in PDF coords)
        const sortedLines = Array.from(lineMap.entries())
          .sort((a, b) => b[0] - a[0]) // descending Y
          .map(([, words]) =>
            words
              .sort((a, b) => b.x - a.x) // RTL: right-to-left order
              .map((w) => w.str)
              .join(" ")
          );

        fullText += sortedLines.join("\n") + "\n\n";
        setProgress(30 + Math.round((p / totalPages) * 50));
      }

      setProgress(85);

      // Parse the extracted text
      const parsedReport = parseFromText(fullText);
      setProgress(100);

      setReport(parsedReport);
      setLoans(parsedReport.loans);
      setStep("review");
    } catch (err) {
      console.error("PDF parse error:", err);
      setError(
        `שגיאה בעיבוד הקובץ: ${err instanceof Error ? err.message : "שגיאה לא ידועה"}. ניסה להעלות קובץ PDF תקין.`
      );
      setStep("upload");
    }
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      if (!file.type.includes("pdf") && !file.name.endsWith(".pdf")) {
        setError("יש להעלות קובץ PDF בלבד");
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setError("הקובץ גדול מדי (מקסימום 50MB)");
        return;
      }
      setError("");
      parsePdf(file);
    },
    [parsePdf]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const toggleLoan = (id: string) => {
    setLoans((prev) =>
      prev.map((l) => (l.id === id ? { ...l, selected: !l.selected } : l))
    );
  };

  const selectedCount = loans.filter((l) => l.selected).length;

  const doImport = () => {
    const selected = loans.filter((l) => l.selected).map(parsedLoanToAppLoan);
    onImport(selected);
    setStep("done");
  };

  /* ══════════════════════════════════════════════════════════ */
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm overflow-y-auto py-4 px-3"
      dir="rtl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl my-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h2 className="font-black text-gray-900 text-lg">
              ייבוא דוח אשראי 📄
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              דוח אשראי צרכני · דוח ריכוז נתונים
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* ── UPLOAD step ── */}
        {step === "upload" && (
          <div className="p-6">
            {/* Drop zone */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                dragging
                  ? "border-teal-400 bg-teal-50"
                  : "border-gray-200 hover:border-teal-300 hover:bg-gray-50"
              }`}
            >
              <div className="text-5xl mb-3">📂</div>
              <p className="font-bold text-gray-700 text-base mb-1">
                גרור לכאן את קובץ ה-PDF
              </p>
              <p className="text-sm text-gray-400">
                או לחץ לבחירת קובץ מהמחשב
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>

            {error && (
              <p className="mt-4 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3 text-center">
                {error}
              </p>
            )}

            {/* Info */}
            <div className="mt-5 bg-blue-50 rounded-xl px-4 py-3 space-y-1">
              <p className="text-xs font-bold text-blue-700">
                📋 מה הדוח כולל?
              </p>
              <ul className="text-xs text-blue-600 space-y-0.5 list-disc list-inside">
                <li>הלוואות ומשכנתאות מכל הבנקים</li>
                <li>יתרות, תשלומים חודשיים, ריביות</li>
                <li>כרטיסי אשראי ומסגרות</li>
              </ul>
              <p className="text-[10px] text-blue-400 mt-2">
                🔒 כל העיבוד נעשה ישירות בדפדפן — הנתונים לא עוברים לשום שרת
              </p>
            </div>

            {/* How to get the report */}
            <div className="mt-3 bg-orange-50 rounded-xl px-4 py-3">
              <p className="text-xs font-bold text-orange-700 mb-1">
                🏦 איך מקבלים את הדוח?
              </p>
              <p className="text-xs text-orange-600">
                <strong>BDI:</strong> bdi.co.il →{" "}
                <strong>דוח אשראי צרכני</strong>
                <br />
                <strong>נתב"ג:</strong> niv.cma.gov.il → <strong>ריכוז נתונים</strong>
              </p>
            </div>
          </div>
        )}

        {/* ── PARSING step ── */}
        {step === "parsing" && (
          <div className="p-8 text-center">
            <div className="text-5xl mb-4 animate-pulse">🔍</div>
            <h3 className="font-bold text-gray-800 text-base mb-2">
              מעבד את הדוח...
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              מחלץ טקסט, מזהה הלוואות ומשכנתאות
            </p>
            {/* Progress bar */}
            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
              <div
                className="h-full bg-teal-500 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">{progress}%</p>
          </div>
        )}

        {/* ── REVIEW step ── */}
        {step === "review" && report && (
          <div className="flex flex-col max-h-[80vh]">
            {/* Summary bar */}
            <div className="px-5 py-3 bg-teal-50 border-b border-teal-100">
              <div className="flex items-center justify-between">
                <div>
                  {report.fullName && (
                    <span className="font-bold text-teal-800 text-sm">
                      {report.fullName}
                    </span>
                  )}
                  {report.reportDate && (
                    <span className="text-xs text-teal-500 mr-2">
                      · {report.reportDate}
                    </span>
                  )}
                </div>
                <span className="text-xs bg-teal-100 text-teal-700 font-bold px-2 py-1 rounded-full">
                  {loans.length} הלוואות זוהו
                </span>
              </div>
              {report.totalDebt > 0 && (
                <div className="flex gap-4 mt-2">
                  <div>
                    <span className="text-[11px] text-teal-500">
                      סה&quot;כ חוב:
                    </span>
                    <span className="font-black text-teal-800 text-sm mr-1">
                      {ils(report.totalDebt)}
                    </span>
                  </div>
                  {report.totalMonthlyPayment > 0 && (
                    <div>
                      <span className="text-[11px] text-teal-500">
                        חודשי:
                      </span>
                      <span className="font-black text-teal-800 text-sm mr-1">
                        {ils(report.totalMonthlyPayment)}/חודש
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Loans list */}
            <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
              {loans.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-3xl mb-3">🤔</p>
                  <p className="font-semibold text-gray-600 text-sm">
                    לא זוהו הלוואות בדוח
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    ייתכן שהדוח בפורמט לא מוכר. ניתן להוסיף הלוואות ידנית.
                  </p>
                  {report.rawTextSample && (
                    <details className="mt-4 text-right">
                      <summary className="text-xs text-gray-400 cursor-pointer">
                        טקסט גולמי (לדיבוג)
                      </summary>
                      <pre className="text-[9px] text-gray-400 bg-gray-50 rounded-lg p-3 mt-2 whitespace-pre-wrap overflow-auto max-h-40 text-right" dir="ltr">
                        {report.rawTextSample}
                      </pre>
                    </details>
                  )}
                </div>
              ) : (
                <>
                  <p className="text-xs text-gray-400 mb-2">
                    סמן את ההלוואות שברצונך לייבא:
                  </p>
                  {loans.map((loan) => (
                    <div
                      key={loan.id}
                      onClick={() => toggleLoan(loan.id)}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        loan.selected
                          ? "border-teal-300 bg-teal-50"
                          : "border-gray-100 bg-white hover:bg-gray-50"
                      }`}
                    >
                      {/* Checkbox */}
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                          loan.selected
                            ? "bg-teal-500"
                            : "bg-white border-2 border-gray-300"
                        }`}
                      >
                        {loan.selected && (
                          <span className="text-white text-xs leading-none">
                            ✓
                          </span>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-gray-900 text-sm">
                            {loan.lender}
                          </span>
                          <LoanTypeTag type={loan.type} />
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0.5 mt-1.5">
                          {loan.principal > 0 && (
                            <div>
                              <span className="text-[10px] text-gray-400">
                                קרן מקורית
                              </span>
                              <div className="text-xs font-bold text-gray-700">
                                {ils(loan.principal)}
                              </div>
                            </div>
                          )}
                          {loan.balance > 0 && loan.balance !== loan.principal && (
                            <div>
                              <span className="text-[10px] text-gray-400">
                                יתרה נוכחית
                              </span>
                              <div className="text-xs font-bold text-red-600">
                                {ils(loan.balance)}
                              </div>
                            </div>
                          )}
                          {loan.monthlyPayment > 0 && (
                            <div>
                              <span className="text-[10px] text-gray-400">
                                תשלום חודשי
                              </span>
                              <div className="text-xs font-bold text-orange-600">
                                {ils(loan.monthlyPayment)}/חודש
                              </div>
                            </div>
                          )}
                          {loan.annualRate > 0 && (
                            <div>
                              <span className="text-[10px] text-gray-400">
                                ריבית
                              </span>
                              <div className="text-xs font-bold text-gray-700">
                                {loan.annualRate}%
                              </div>
                            </div>
                          )}
                          {loan.totalMonths && (
                            <div>
                              <span className="text-[10px] text-gray-400">
                                תקופה
                              </span>
                              <div className="text-xs font-bold text-gray-700">
                                {loan.totalMonths} חודש
                              </div>
                            </div>
                          )}
                          {loan.startDate && (
                            <div>
                              <span className="text-[10px] text-gray-400">
                                פתיחה
                              </span>
                              <div className="text-xs font-bold text-gray-700">
                                {loan.startDate}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Raw text sample toggle */}
                  {report.rawTextSample && (
                    <details className="mt-2">
                      <summary className="text-xs text-gray-400 cursor-pointer">
                        טקסט גולמי (לדיבוג)
                      </summary>
                      <pre className="text-[9px] text-gray-400 bg-gray-50 rounded-lg p-3 mt-2 whitespace-pre-wrap overflow-auto max-h-40 text-right" dir="ltr">
                        {report.rawTextSample}
                      </pre>
                    </details>
                  )}
                </>
              )}
            </div>

            {/* Actions */}
            <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={() => {
                  setStep("upload");
                  setReport(null);
                  setLoans([]);
                }}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-500 font-semibold text-sm hover:bg-gray-50 transition-colors"
              >
                העלה קובץ אחר
              </button>
              <button
                onClick={doImport}
                disabled={selectedCount === 0}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  selectedCount > 0
                    ? "bg-teal-500 text-white hover:bg-teal-600 shadow-sm"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                ייבא {selectedCount > 0 ? `${selectedCount} הלוואות` : ""}
              </button>
            </div>
          </div>
        )}

        {/* ── DONE step ── */}
        {step === "done" && (
          <div className="p-8 text-center">
            <div className="text-5xl mb-3">✅</div>
            <h3 className="font-bold text-gray-800 text-base mb-2">
              {selectedCount} הלוואות יובאו בהצלחה!
            </h3>
            <p className="text-sm text-gray-400 mb-6">
              הנתונים נוספו לדשבורד הפיננסי שלך. ניתן לערוך כל פריט בנפרד.
            </p>
            <button
              onClick={onClose}
              className="px-8 py-3 rounded-xl bg-teal-500 text-white font-bold text-sm hover:bg-teal-600 transition-colors"
            >
              סגור
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
