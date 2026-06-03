/**
 * Israeli Credit Report Parser
 * Handles both "דוח אשראי צרכני" and "דוח ריכוז נתונים"
 * Supports RTL-mirrored text extraction from pdfjs
 */

export interface ParsedLoan {
  id: string;
  lender: string;
  type: "loan" | "mortgage";
  principal: number;
  balance: number;
  monthlyPayment: number;
  annualRate: number;
  startDate?: string;
  endDate?: string;
  totalMonths?: number;
  paidMonths?: number;
  selected: boolean;
}

export interface ParsedCreditCard {
  id: string;
  issuer: string;
  limit: number;
  balance: number;
  monthlyCharge: number;
  selected: boolean;
}

export interface ParsedCreditReport {
  reportDate?: string;
  fullName?: string;
  idNumber?: string;
  reportType: "consumer" | "summary" | "unknown";
  totalDebt: number;
  totalMonthlyPayment: number;
  loans: ParsedLoan[];
  creditCards: ParsedCreditCard[];
  rawTextSample: string;
}

/* ── helpers ──────────────────────────────────────────────── */
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/** Fix RTL-mirrored text: reverse word order in each line */
function fixRtlLine(line: string): string {
  return line.trim().split(/\s+/).reverse().join(" ");
}

/** Try to fix RTL for a block of text */
function fixRtlText(text: string): string {
  return text
    .split("\n")
    .map((line) => fixRtlLine(line))
    .join("\n");
}

/** Extract a number from a string, removing ₪ and commas */
function parseAmount(s: string): number {
  const cleaned = s.replace(/[₪,\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? 0 : n;
}

/** Parse DD/MM/YYYY to YYYY-MM-DD */
function parseDate(ddmmyyyy: string): string {
  const parts = ddmmyyyy.match(/(\d{2})\/(\d{2})\/(\d{4})/);
  if (!parts) return "";
  return `${parts[3]}-${parts[2]}-${parts[1]}`;
}

/** Months between two YYYY-MM-DD dates */
function monthsBetween(start: string, end: string): number {
  const s = new Date(start);
  const e = new Date(end);
  return (
    (e.getFullYear() - s.getFullYear()) * 12 +
    (e.getMonth() - s.getMonth())
  );
}

/** Months between start date and today */
function monthsSince(start: string): number {
  const s = new Date(start);
  const now = new Date();
  return Math.max(
    0,
    (now.getFullYear() - s.getFullYear()) * 12 +
      (now.getMonth() - s.getMonth())
  );
}

/* ── Israeli bank / lender name mapping ───────────────────── */
const LENDER_MAP: Record<string, string> = {
  // Hebrew → display name
  "בנק הפועלים": "בנק הפועלים",
  פועלים: "בנק הפועלים",
  "בנק לאומי": "בנק לאומי",
  לאומי: "בנק לאומי",
  "מזרחי טפחות": "מזרחי-טפחות",
  "מזרחי-טפחות": "מזרחי-טפחות",
  מזרחי: "מזרחי-טפחות",
  טפחות: "מזרחי-טפחות",
  "בנק דיסקונט": "בנק דיסקונט",
  דיסקונט: "בנק דיסקונט",
  "בנק ירושלים": "בנק ירושלים",
  ירושלים: "בנק ירושלים",
  "הבינלאומי": "הבנק הבינלאומי",
  בינלאומי: "הבנק הבינלאומי",
  "אוצר החייל": "בנק אוצר החייל",
  "בנק יהב": "בנק יהב",
  יהב: "בנק יהב",
  מרכנתיל: "בנק מרכנתיל",
  ישראכרט: "ישראכרט",
  כאל: "כאל",
  מקס: "מקס",
  "מכסימום": "מקס",
  "לאומי קארד": "לאומי קארד",
  "פועלים אקספרס": "פועלים אקספרס",
  "ויזה כאל": "ויזה כאל",
  "דיינרס": "דיינרס",
  "אמריקן אקספרס": "אמריקן אקספרס",
  "הכשרת הישוב": "הכשרת הישוב",
  "בנק הדואר": "דואר ישראל",
  "כנענית": "ישראכרט",
};

function normalizeLender(raw: string): string {
  const lower = raw.trim();
  for (const [key, val] of Object.entries(LENDER_MAP)) {
    if (lower.includes(key)) return val;
  }
  return raw.trim() || "גוף מממן לא ידוע";
}

/* ── Pattern matching on normalized text ──────────────────── */
const AMOUNT_RE = /₪\s*([\d,]+(?:\.\d+)?)/g;
const AMOUNT_PLAIN_RE = /([\d]{1,3}(?:,\d{3})+(?:\.\d+)?)/g;
const DATE_RE = /(\d{2}\/\d{2}\/\d{4})/g;
const RATE_RE = /(\d+(?:\.\d+)?)\s*%/g;
const ID_RE = /(?:ת\.ז\.|ז\.ת\.|תז)\s*:?\s*(\d{9})/;
const NAME_RE = /(?:שם|שמ)\s*:?\s*([א-ת\s]{4,30})/;

/** Find all ₪ amounts in a string */
function findAmounts(text: string): number[] {
  const amounts: number[] = [];
  let m: RegExpExecArray | null;
  AMOUNT_RE.lastIndex = 0;
  while ((m = AMOUNT_RE.exec(text)) !== null) {
    const n = parseAmount(m[1]);
    if (n > 0) amounts.push(n);
  }
  return amounts;
}

/** Find all dates in a string */
function findDates(text: string): string[] {
  const dates: string[] = [];
  let m: RegExpExecArray | null;
  DATE_RE.lastIndex = 0;
  while ((m = DATE_RE.exec(text)) !== null) {
    dates.push(m[1]);
  }
  return dates;
}

/** Find all interest rates in a string */
function findRates(text: string): number[] {
  const rates: number[] = [];
  let m: RegExpExecArray | null;
  RATE_RE.lastIndex = 0;
  while ((m = RATE_RE.exec(text)) !== null) {
    const n = parseFloat(m[1]);
    if (n > 0 && n < 30) rates.push(n); // sanity: 0–30% range
  }
  return rates;
}

/* ── Loan type detection ──────────────────────────────────── */
function detectLoanType(text: string): "mortgage" | "loan" {
  if (
    text.includes("משכנתא") ||
    text.includes("משכנתה") ||
    text.includes("תצנכשמ") // reversed
  ) {
    return "mortgage";
  }
  return "loan";
}

/* ── Section split ────────────────────────────────────────── */
/** Split full PDF text into logical sections */
function splitSections(text: string): Record<string, string> {
  const sections: Record<string, string> = { header: "", loans: "", cards: "", summary: "" };

  // Try to find section boundaries
  const sectionMarkers = [
    { key: "loans", patterns: ["עסקות אשראי", "הלוואות", "אשראי למגורים", "עסקות הלוואה"] },
    { key: "cards", patterns: ["כרטיסי אשראי", "חשבונות כרטיס", "כרטיס חיוב"] },
    { key: "summary", patterns: ["סיכום", "ריכוז נתונים", "סה\"כ"] },
  ];

  let remaining = text;

  // Find first loan section
  for (const marker of sectionMarkers) {
    for (const pattern of marker.patterns) {
      const idx = remaining.indexOf(pattern);
      if (idx !== -1) {
        if (marker.key === "loans" && !sections.loans) {
          sections.header = remaining.slice(0, idx);
          sections.loans = remaining.slice(idx);
          remaining = sections.loans;
        } else if (marker.key === "cards") {
          const cardIdx = remaining.indexOf(pattern);
          if (cardIdx !== -1 && cardIdx < remaining.length / 2) {
            // cards section starts somewhere in loans text
          }
        }
        break;
      }
    }
  }

  if (!sections.loans) {
    // No clear section markers — use full text
    sections.loans = text;
  }

  return sections;
}

/* ── Parse loan block ─────────────────────────────────────── */
/**
 * Try to parse individual loan entries from a block of text.
 * Israeli credit reports list loans in tables. We look for clusters of:
 *   - A lender name
 *   - 2–3 dates nearby
 *   - 2–4 ₪ amounts
 *   - Optional interest rate
 */
function parseLoansFromBlock(block: string): ParsedLoan[] {
  const loans: ParsedLoan[] = [];

  // Split into paragraphs / rows
  const lines = block.split("\n").filter((l) => l.trim().length > 2);

  // Look for rows containing amounts
  let i = 0;
  while (i < lines.length) {
    const window = lines.slice(i, i + 8).join(" ");

    // Skip if no money amounts
    const amounts = findAmounts(window);
    if (amounts.length < 2) {
      i++;
      continue;
    }

    const dates = findDates(window);
    const rates = findRates(window);
    const type = detectLoanType(window);

    // Extract lender from window
    let lender = "גוף מממן";
    for (const [key] of Object.entries(LENDER_MAP)) {
      if (window.includes(key)) {
        lender = normalizeLender(key);
        break;
      }
    }

    // Heuristic: largest amount is principal, second largest is balance
    const sortedAmounts = [...amounts].sort((a, b) => b - a);
    const principal = sortedAmounts[0] ?? 0;
    const balance = sortedAmounts[1] ?? principal;
    const monthlyPayment = sortedAmounts.find((a) => a < 20000) ?? 0;

    if (principal < 1000 || principal > 100_000_000) {
      i++;
      continue;
    }

    // If we have 3+ amounts, try to identify monthly payment (smallest reasonable)
    let finalPrincipal = principal;
    let finalBalance = balance;
    let finalMonthly = monthlyPayment;

    if (amounts.length >= 3) {
      const large = amounts.filter((a) => a >= 10000).sort((a, b) => b - a);
      const small = amounts.filter((a) => a < 10000 && a > 100);
      finalPrincipal = large[0] ?? principal;
      finalBalance = large[1] ?? large[0] ?? balance;
      finalMonthly = small[0] ?? 0;
    }

    const startDateRaw = dates[0] ?? "";
    const endDateRaw = dates[1] ?? "";
    const startDate = startDateRaw ? parseDate(startDateRaw) : undefined;
    const endDate = endDateRaw ? parseDate(endDateRaw) : undefined;

    const totalMonths =
      startDate && endDate ? monthsBetween(startDate, endDate) : undefined;
    const paidMonths = startDate ? monthsSince(startDate) : undefined;

    const loan: ParsedLoan = {
      id: uid(),
      lender,
      type,
      principal: Math.round(finalPrincipal),
      balance: Math.round(finalBalance),
      monthlyPayment: Math.round(finalMonthly),
      annualRate: rates[0] ?? 0,
      startDate,
      endDate,
      totalMonths,
      paidMonths: paidMonths !== undefined ? Math.min(paidMonths, totalMonths ?? paidMonths) : undefined,
      selected: true,
    };

    loans.push(loan);
    i += 6; // skip ahead to avoid duplicates
  }

  return loans;
}

/* ── Parse credit cards ───────────────────────────────────── */
function parseCardsFromBlock(block: string): ParsedCreditCard[] {
  const cards: ParsedCreditCard[] = [];
  const lines = block.split("\n").filter((l) => l.trim().length > 2);

  let i = 0;
  while (i < lines.length) {
    const window = lines.slice(i, i + 6).join(" ");
    const amounts = findAmounts(window);

    if (
      amounts.length < 1 ||
      (!window.includes("כרטיס") &&
        !window.includes("חיוב") &&
        !window.includes("ויזה") &&
        !window.includes("מסטרקארד") &&
        !window.includes("ישראכרט") &&
        !window.includes("כאל") &&
        !window.includes("מקס"))
    ) {
      i++;
      continue;
    }

    let issuer = "כרטיס אשראי";
    for (const [key] of Object.entries(LENDER_MAP)) {
      if (
        window.includes("ישראכרט") ||
        window.includes("כאל") ||
        window.includes("מקס") ||
        window.includes("לאומי קארד")
      ) {
        if (window.includes(key)) {
          issuer = normalizeLender(key);
          break;
        }
      }
    }

    const sortedAmounts = [...amounts].sort((a, b) => b - a);
    const limit = sortedAmounts[0] ?? 0;
    const balance = sortedAmounts[1] ?? 0;
    const monthly = amounts.find((a) => a < 5000 && a > 50) ?? 0;

    if (limit < 500 || limit > 500_000) {
      i++;
      continue;
    }

    cards.push({
      id: uid(),
      issuer,
      limit: Math.round(limit),
      balance: Math.round(balance),
      monthlyCharge: Math.round(monthly),
      selected: false, // cards not selected by default (less common to import as loans)
    });

    i += 5;
  }

  return cards;
}

/* ── Structured table parser (for well-formatted PDFs) ───── */
/**
 * Israeli credit reports often have a structured table with columns.
 * This parser tries to extract rows from pdfjs TextItem arrays (if available).
 */
export function parseFromTextItems(
  items: Array<{ str: string; transform: number[] }>
): ParsedCreditReport {
  // Group items by Y-coordinate (same line = same Y ± 2px)
  const lineMap = new Map<number, string[]>();

  for (const item of items) {
    if (!item.str.trim()) continue;
    const y = Math.round(item.transform[5] / 2) * 2; // snap to 2px grid
    if (!lineMap.has(y)) lineMap.set(y, []);
    lineMap.get(y)!.push(item.str);
  }

  // Sort lines by Y descending (top of page first for most PDFs)
  const sortedLines = Array.from(lineMap.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([, words]) => words.join(" "));

  const fullText = sortedLines.join("\n");
  return parseFromText(fullText);
}

/* ── Main entry point ─────────────────────────────────────── */
export function parseFromText(rawText: string): ParsedCreditReport {
  // Try both normal and RTL-fixed versions
  const fixed = fixRtlText(rawText);

  // Choose the version that has more Hebrew keywords
  const hebrewScore = (t: string) =>
    (t.match(/[א-ת]/g) || []).length +
    (t.includes("הלוואה") ? 100 : 0) +
    (t.includes("משכנתא") ? 100 : 0) +
    (t.includes("אשראי") ? 100 : 0);

  const bestText = hebrewScore(rawText) >= hebrewScore(fixed) ? rawText : fixed;

  // Determine report type
  let reportType: "consumer" | "summary" | "unknown" = "unknown";
  if (bestText.includes("דוח אשראי") || bestText.includes("צרכני")) {
    reportType = "consumer";
  } else if (bestText.includes("ריכוז נתונים") || bestText.includes("ריכוז")) {
    reportType = "summary";
  }

  // Extract header info
  let fullName: string | undefined;
  let idNumber: string | undefined;
  let reportDate: string | undefined;

  const nameMatch = NAME_RE.exec(bestText);
  if (nameMatch) fullName = nameMatch[1].trim();

  const idMatch = ID_RE.exec(bestText);
  if (idMatch) idNumber = idMatch[1];

  const dateMatches = findDates(bestText);
  if (dateMatches.length > 0) reportDate = parseDate(dateMatches[0]);

  // Section-aware parsing
  const sectionText = splitSections(bestText);

  // Parse loans
  const loans = parseLoansFromBlock(sectionText.loans || bestText);

  // Parse credit cards
  const cards = parseCardsFromBlock(bestText);

  // Deduplicate loans (same principal + lender)
  const seen = new Set<string>();
  const uniqueLoans = loans.filter((l) => {
    const key = `${l.lender}_${l.principal}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Totals
  const totalDebt = uniqueLoans.reduce((s, l) => s + l.balance, 0);
  const totalMonthlyPayment = uniqueLoans.reduce(
    (s, l) => s + l.monthlyPayment,
    0
  );

  return {
    reportDate,
    fullName,
    idNumber,
    reportType,
    totalDebt,
    totalMonthlyPayment,
    loans: uniqueLoans,
    creditCards: cards,
    rawTextSample: bestText.slice(0, 1000),
  };
}

/* ── Convert parsed loans to app Loan format ─────────────── */
import type { Loan } from "./types";

export function parsedLoanToAppLoan(pl: ParsedLoan): Loan {
  // Figure out paidMonths
  let paidMonths = pl.paidMonths ?? 0;
  let totalMonths = pl.totalMonths ?? 240; // default 20 years if unknown

  // Clamp
  if (paidMonths > totalMonths) paidMonths = Math.round(totalMonths * 0.5);

  // Monthly payment — use parsed value, or calculate if 0
  let monthlyPayment = pl.monthlyPayment;
  if (monthlyPayment === 0 && pl.principal > 0 && totalMonths > 0) {
    // Simple estimate
    if (pl.annualRate > 0) {
      const r = pl.annualRate / 100 / 12;
      monthlyPayment = Math.round(
        (pl.principal * r * Math.pow(1 + r, totalMonths)) /
          (Math.pow(1 + r, totalMonths) - 1)
      );
    } else {
      monthlyPayment = Math.round(pl.principal / totalMonths);
    }
  }

  const loanName =
    pl.type === "mortgage"
      ? `משכנתא — ${pl.lender}`
      : `הלוואה — ${pl.lender}`;

  return {
    id: pl.id,
    name: loanName,
    principal: pl.principal,
    annualRate: pl.annualRate,
    monthlyPayment,
    manualPayment: pl.monthlyPayment > 0,
    paidMonths,
    totalMonths,
    notes: [
      pl.startDate ? `פתיחה: ${pl.startDate}` : "",
      pl.endDate ? `סיום: ${pl.endDate}` : "",
      pl.balance !== pl.principal
        ? `יתרה מדוח: ₪${pl.balance.toLocaleString("he-IL")}`
        : "",
    ]
      .filter(Boolean)
      .join(" | "),
  };
}
