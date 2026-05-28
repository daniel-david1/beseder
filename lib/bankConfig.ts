import { BankConfig } from "./bankTypes";

export const BANK_CONFIGS: BankConfig[] = [
  {
    key: "hapoalim",
    name: "Bank Hapoalim",
    nameHebrew: "בנק הפועלים",
    emoji: "🔵",
    loginFields: [
      { key: "userCode", label: "קוד משתמש", type: "text" },
      { key: "password", label: "סיסמה", type: "password" },
    ],
  },
  {
    key: "leumi",
    name: "Bank Leumi",
    nameHebrew: "בנק לאומי",
    emoji: "🟢",
    loginFields: [
      { key: "username", label: "שם משתמש", type: "text" },
      { key: "password", label: "סיסמה", type: "password" },
    ],
  },
  {
    key: "mizrahi",
    name: "Mizrahi Bank",
    nameHebrew: "מזרחי טפחות",
    emoji: "🟠",
    loginFields: [
      { key: "username", label: "שם משתמש", type: "text" },
      { key: "password", label: "סיסמה", type: "password" },
    ],
  },
  {
    key: "discount",
    name: "Discount Bank",
    nameHebrew: "בנק דיסקונט",
    emoji: "🔴",
    loginFields: [
      { key: "id", label: "מספר זהות", type: "text" },
      { key: "password", label: "סיסמה", type: "password" },
      { key: "num", label: "מספר סניף (אופציונלי)", type: "text" },
    ],
  },
  {
    key: "max",
    name: "Max",
    nameHebrew: "מקס",
    emoji: "💳",
    loginFields: [
      { key: "username", label: "שם משתמש", type: "text" },
      { key: "password", label: "סיסמה", type: "password" },
    ],
  },
  {
    key: "visaCal",
    name: "Visa Cal",
    nameHebrew: "ויזה כ.א.ל",
    emoji: "💳",
    loginFields: [
      { key: "username", label: "שם משתמש", type: "text" },
      { key: "password", label: "סיסמה", type: "password" },
    ],
  },
  {
    key: "isracard",
    name: "Isracard",
    nameHebrew: "ישראכרט",
    emoji: "💳",
    loginFields: [
      { key: "id", label: "מספר זהות", type: "text" },
      { key: "card6Digits", label: "6 ספרות כרטיס", type: "text" },
      { key: "password", label: "סיסמה", type: "password" },
    ],
  },
  {
    key: "amex",
    name: "Amex",
    nameHebrew: "אמריקן אקספרס",
    emoji: "💳",
    loginFields: [
      { key: "id", label: "מספר זהות", type: "text" },
      { key: "card6Digits", label: "6 ספרות כרטיס", type: "text" },
      { key: "password", label: "סיסמה", type: "password" },
    ],
  },
  {
    key: "beinleumi",
    name: "Beinleumi",
    nameHebrew: "הבנק הבינלאומי",
    emoji: "🏦",
    loginFields: [
      { key: "username", label: "שם משתמש", type: "text" },
      { key: "password", label: "סיסמה", type: "password" },
    ],
  },
  {
    key: "massad",
    name: "Massad",
    nameHebrew: "בנק מסד",
    emoji: "🏦",
    loginFields: [
      { key: "username", label: "שם משתמש", type: "text" },
      { key: "password", label: "סיסמה", type: "password" },
    ],
  },
  {
    key: "yahav",
    name: "Bank Yahav",
    nameHebrew: "בנק יהב",
    emoji: "🏦",
    loginFields: [
      { key: "username", label: "שם משתמש", type: "text" },
      { key: "nationalID", label: "מספר זהות", type: "text" },
      { key: "password", label: "סיסמה", type: "password" },
    ],
  },
  {
    key: "union",
    name: "Union",
    nameHebrew: "בנק איגוד",
    emoji: "🏦",
    loginFields: [
      { key: "username", label: "שם משתמש", type: "text" },
      { key: "password", label: "סיסמה", type: "password" },
    ],
  },
  {
    key: "mercantile",
    name: "Mercantile Bank",
    nameHebrew: "בנק מרקנטיל",
    emoji: "🏦",
    loginFields: [
      { key: "id", label: "מספר זהות", type: "text" },
      { key: "password", label: "סיסמה", type: "password" },
      { key: "num", label: "מספר סניף (אופציונלי)", type: "text" },
    ],
  },
  {
    key: "otsarHahayal",
    name: "Bank Otsar Hahayal",
    nameHebrew: "בנק אוצר החייל",
    emoji: "🏦",
    loginFields: [
      { key: "username", label: "שם משתמש", type: "text" },
      { key: "password", label: "סיסמה", type: "password" },
    ],
  },
  {
    key: "beyahadBishvilha",
    name: "Beyahad Bishvilha",
    nameHebrew: "ביחד בשבילה",
    emoji: "🏦",
    loginFields: [
      { key: "id", label: "מספר זהות", type: "text" },
      { key: "password", label: "סיסמה", type: "password" },
    ],
  },
  {
    key: "pagi",
    name: "Pagi",
    nameHebrew: "בנק פאגי",
    emoji: "🏦",
    loginFields: [
      { key: "username", label: "שם משתמש", type: "text" },
      { key: "password", label: "סיסמה", type: "password" },
    ],
  },
  {
    key: "behatsdaa",
    name: "Behatsdaa",
    nameHebrew: "בהצלחה",
    emoji: "🏦",
    loginFields: [
      { key: "id", label: "מספר זהות", type: "text" },
      { key: "password", label: "סיסמה", type: "password" },
    ],
  },
];

export function getBankConfig(bankId: string): BankConfig | undefined {
  return BANK_CONFIGS.find((b) => b.key === bankId);
}
