"use client";

import { useState, useEffect, useCallback } from "react";
import { BANK_CONFIGS, getBankConfig } from "@/lib/bankConfig";
import { BankConnection, BankAccount, BankTransaction } from "@/lib/bankTypes";

/* ─── helpers ─────────────────────────────────────────── */
const ils = (n: number) =>
  (n < 0 ? "-" : "") + "₪" + Math.abs(Math.round(n)).toLocaleString("he-IL");

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("he-IL", { day: "2-digit", month: "2-digit", year: "2-digit" });
}

/* ─── subcomponents ───────────────────────────────────── */
function StatusBadge({ status }: { status: BankConnection["sync_status"] }) {
  const map: Record<BankConnection["sync_status"], { label: string; bg: string; text: string }> = {
    idle:    { label: "ממתין",    bg: "#f3f4f6", text: "#6b7280" },
    syncing: { label: "מסנכרן...", bg: "#fef9c3", text: "#a16207" },
    success: { label: "מסונכרן",  bg: "#dcfce7", text: "#15803d" },
    error:   { label: "שגיאה",   bg: "#fee2e2", text: "#dc2626" },
  };
  const s = map[status] ?? map.idle;
  return (
    <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.text }}>
      {s.label}
    </span>
  );
}

/* ─── Add bank form ───────────────────────────────────── */
function AddBankForm({ onSaved, onCancel }: { onSaved: () => void; onCancel: () => void }) {
  const [selectedBank, setSelectedBank] = useState("");
  const [fields, setFields] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const bankCfg = BANK_CONFIGS.find((b) => b.key === selectedBank);

  const handleSave = async () => {
    if (!bankCfg) return;
    const missing = bankCfg.loginFields
      .filter((f) => f.key !== "num" && !fields[f.key]?.trim())
      .map((f) => f.label);
    if (missing.length) { setError("חסרים שדות: " + missing.join(", ")); return; }

    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/bank-credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankId: selectedBank, credentials: fields }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "שגיאה בשמירה");
      onSaved();
    } catch (e: unknown) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-gray-800 text-base">חיבור בנק חדש</h3>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
      </div>

      {/* Bank selector */}
      <div>
        <label className="text-xs font-semibold text-gray-500 mb-1 block">בחר בנק / כרטיס אשראי</label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-52 overflow-y-auto pr-1">
          {BANK_CONFIGS.map((b) => (
            <button
              key={b.key}
              onClick={() => { setSelectedBank(b.key); setFields({}); setError(""); }}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold text-right transition-all"
              style={{
                borderColor: selectedBank === b.key ? "#0d9488" : "#e5e7eb",
                background: selectedBank === b.key ? "#f0fdfa" : "#fafafa",
                color: selectedBank === b.key ? "#0d9488" : "#374151",
              }}
            >
              <span>{b.emoji}</span>
              <span className="truncate">{b.nameHebrew}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Login fields */}
      {bankCfg && (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <p className="text-xs text-gray-500 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            🔒 הפרטים מוצפנים ונשמרים בצורה מאובטחת. לא נשמר שום מידע אחר.
          </p>
          {bankCfg.loginFields.map((f) => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">{f.label}</label>
              <input
                type={f.type}
                value={fields[f.key] ?? ""}
                onChange={(e) => setFields((prev) => ({ ...prev, [f.key]: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-teal-500"
                placeholder={f.key === "num" ? "אופציונלי" : ""}
                dir="ltr"
              />
            </div>
          ))}
          {error && <p className="text-red-500 text-xs font-semibold">{error}</p>}
          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{ background: "#0d9488" }}
            >
              {saving ? "שומר..." : "חבר בנק"}
            </button>
            <button onClick={onCancel} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200 transition-colors">
              ביטול
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Transactions table ──────────────────────────────── */
function TransactionsTable({ transactions, bankFilter }: { transactions: BankTransaction[]; bankFilter?: string }) {
  const filtered = bankFilter ? transactions.filter((t) => t.bank_id === bankFilter) : transactions;
  const [show, setShow] = useState(30);

  if (!filtered.length) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">
        <div className="text-3xl mb-2">📭</div>
        אין עסקאות להצגה
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-xs text-gray-400 font-semibold">
              <th className="text-right py-2 px-3">תאריך</th>
              <th className="text-right py-2 px-3">תיאור</th>
              <th className="text-left py-2 px-3">סכום</th>
              <th className="text-left py-2 px-3">יתרה</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, show).map((t) => (
              <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                <td className="py-2 px-3 text-gray-500 whitespace-nowrap">{formatDate(t.date)}</td>
                <td className="py-2 px-3 text-gray-800 max-w-[220px] truncate">{t.description}</td>
                <td className={`py-2 px-3 font-bold text-left whitespace-nowrap ${t.amount < 0 ? "text-red-500" : "text-green-600"}`}>
                  {ils(t.amount)}
                </td>
                <td className="py-2 px-3 text-gray-400 text-left whitespace-nowrap">
                  {t.balance != null ? ils(t.balance) : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {filtered.length > show && (
        <button
          onClick={() => setShow((s) => s + 50)}
          className="w-full mt-3 py-2 text-xs font-semibold text-teal-600 hover:text-teal-800 transition-colors"
        >
          הצג עוד ({filtered.length - show} נותרו)
        </button>
      )}
    </div>
  );
}

/* ─── Main component ──────────────────────────────────── */
interface Props {
  onBack: () => void;
}

export default function BankConnect({ onBack }: Props) {
  const [connections, setConnections] = useState<BankConnection[]>([]);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [syncing, setSyncing] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<"overview" | "transactions">("overview");
  const [txnBankFilter, setTxnBankFilter] = useState<string | undefined>(undefined);

  const fetchAll = useCallback(async () => {
    const [connRes, dataRes] = await Promise.all([
      fetch("/api/bank-credentials"),
      fetch("/api/bank-data"),
    ]);
    if (connRes.ok) {
      const d = await connRes.json();
      setConnections(d.connections ?? []);
    }
    if (dataRes.ok) {
      const d = await dataRes.json();
      setAccounts(d.accounts ?? []);
      setTransactions(d.transactions ?? []);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Poll while any bank is syncing
  useEffect(() => {
    const hasSyncing = connections.some((c) => c.sync_status === "syncing");
    if (!hasSyncing) return;
    const interval = setInterval(fetchAll, 3000);
    return () => clearInterval(interval);
  }, [connections, fetchAll]);

  const handleSync = async (bankId: string) => {
    setSyncing((s) => ({ ...s, [bankId]: true }));
    await fetch("/api/bank-sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankId }),
    });
    await fetchAll();
    setSyncing((s) => ({ ...s, [bankId]: false }));
  };

  const handleDelete = async (bankId: string) => {
    if (!confirm("למחוק את החיבור לבנק זה?")) return;
    await fetch("/api/bank-credentials", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bankId }),
    });
    await fetchAll();
  };

  const totalBalance = accounts.reduce((s, a) => s + (a.balance ?? 0), 0);
  const totalExpenses = transactions
    .filter((t) => t.amount < 0 && new Date(t.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  const totalIncome = transactions
    .filter((t) => t.amount > 0 && new Date(t.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between shadow-sm sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-sm font-semibold text-gray-600 transition-colors"
          >
            → חזור
          </button>
          <div>
            <h1 className="font-black text-gray-900 text-lg">🏦 חיבור לבנק</h1>
            <p className="text-xs text-gray-400">נתונים בזמן אמת מהבנקים שלך</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white shadow-sm transition-all hover:opacity-90"
          style={{ background: "#0d9488" }}
        >
          + הוסף בנק
        </button>
      </div>

      <div className="max-w-screen-lg mx-auto px-4 py-6 space-y-6">
        {/* Add bank form */}
        {showAddForm && (
          <AddBankForm
            onSaved={async () => { setShowAddForm(false); await fetchAll(); }}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {loading ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-3 animate-pulse">🏦</div>
            <p>טוען נתונים...</p>
          </div>
        ) : connections.length === 0 ? (
          <div
            className="rounded-2xl border-2 border-dashed p-12 text-center cursor-pointer hover:opacity-80 transition-opacity"
            style={{ borderColor: "#0d948840", background: "#f0fdfa" }}
            onClick={() => setShowAddForm(true)}
          >
            <div className="text-5xl mb-4">🏦</div>
            <h2 className="font-black text-gray-800 text-xl mb-2">חבר את הבנק שלך</h2>
            <p className="text-gray-500 text-sm mb-4">משוך נתונים אמיתיים — יתרות, עסקאות, הלוואות</p>
            <div className="inline-block px-6 py-2.5 rounded-xl text-white font-bold text-sm" style={{ background: "#0d9488" }}>
              + הוסף בנק ראשון
            </div>
          </div>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "סה״כ יתרות", value: totalBalance, color: totalBalance >= 0 ? "#15803d" : "#dc2626", bg: totalBalance >= 0 ? "#dcfce7" : "#fee2e2" },
                { label: "הוצאות (30 יום)", value: -totalExpenses, color: "#dc2626", bg: "#fee2e2" },
                { label: "הכנסות (30 יום)", value: totalIncome, color: "#15803d", bg: "#dcfce7" },
              ].map((c) => (
                <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-right">
                  <p className="text-xs text-gray-400 font-semibold mb-1">{c.label}</p>
                  <p className="text-xl font-black" style={{ color: c.color }}>{ils(c.value)}</p>
                </div>
              ))}
            </div>

            {/* Tabs */}
            <div className="flex gap-2">
              {(["overview", "transactions"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: activeTab === tab ? "#0d9488" : "#f3f4f6",
                    color: activeTab === tab ? "white" : "#6b7280",
                  }}
                >
                  {tab === "overview" ? "🏦 חשבונות" : "📋 עסקאות"}
                </button>
              ))}
            </div>

            {activeTab === "overview" && (
              <div className="space-y-4">
                {connections.map((conn) => {
                  const cfg = getBankConfig(conn.bank_id);
                  const bankAccounts = accounts.filter((a) => a.bank_id === conn.bank_id);
                  const isSyncing = syncing[conn.bank_id] || conn.sync_status === "syncing";

                  return (
                    <div key={conn.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                      {/* Bank header */}
                      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{cfg?.emoji ?? "🏦"}</span>
                          <div>
                            <h3 className="font-black text-gray-900 text-base">{cfg?.nameHebrew ?? conn.bank_id}</h3>
                            {conn.last_sync_at && (
                              <p className="text-xs text-gray-400">סונכרן: {formatDate(conn.last_sync_at)}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={conn.sync_status} />
                          <button
                            onClick={() => handleSync(conn.bank_id)}
                            disabled={isSyncing}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
                            style={{ background: "#f0fdfa", color: "#0d9488", border: "1px solid #0d948830" }}
                          >
                            {isSyncing ? "⟳ מסנכרן..." : "⟳ סנכרן"}
                          </button>
                          <button
                            onClick={() => { setTxnBankFilter(conn.bank_id); setActiveTab("transactions"); }}
                            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 transition-colors"
                          >
                            עסקאות
                          </button>
                          <button
                            onClick={() => handleDelete(conn.bank_id)}
                            className="px-2 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-400 hover:bg-red-100 transition-colors"
                          >
                            ×
                          </button>
                        </div>
                      </div>

                      {/* Error */}
                      {conn.sync_status === "error" && conn.error_message && (
                        <div className="px-5 py-2 bg-red-50 border-b border-red-100">
                          <p className="text-xs text-red-600 font-semibold">שגיאה: {conn.error_message}</p>
                        </div>
                      )}

                      {/* Accounts */}
                      {bankAccounts.length === 0 ? (
                        <div className="px-5 py-4 text-sm text-gray-400">
                          {conn.sync_status === "idle" ? "לחץ על ״סנכרן״ כדי למשוך נתונים" : "אין חשבונות"}
                        </div>
                      ) : (
                        <div className="divide-y divide-gray-50">
                          {bankAccounts.map((acc) => (
                            <div key={acc.id} className="flex items-center justify-between px-5 py-3">
                              <div className="text-sm text-gray-500">
                                חשבון {acc.account_number ?? "—"}
                                {acc.credit_limit && (
                                  <span className="mr-3 text-xs text-gray-400">
                                    מסגרת: {ils(acc.credit_limit)}
                                  </span>
                                )}
                              </div>
                              <div className="text-right">
                                <span
                                  className="font-black text-lg"
                                  style={{ color: (acc.balance ?? 0) >= 0 ? "#15803d" : "#dc2626" }}
                                >
                                  {acc.balance != null ? ils(acc.balance) : "—"}
                                </span>
                                {acc.available_credit != null && (
                                  <p className="text-xs text-gray-400">זמין: {ils(acc.available_credit)}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "transactions" && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-black text-gray-800 text-base">עסקאות אחרונות</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setTxnBankFilter(undefined)}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                      style={{
                        background: !txnBankFilter ? "#0d9488" : "#f3f4f6",
                        color: !txnBankFilter ? "white" : "#6b7280",
                      }}
                    >
                      כל הבנקים
                    </button>
                    {connections.map((c) => (
                      <button
                        key={c.bank_id}
                        onClick={() => setTxnBankFilter(c.bank_id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                        style={{
                          background: txnBankFilter === c.bank_id ? "#0d9488" : "#f3f4f6",
                          color: txnBankFilter === c.bank_id ? "white" : "#6b7280",
                        }}
                      >
                        {getBankConfig(c.bank_id)?.nameHebrew ?? c.bank_id}
                      </button>
                    ))}
                  </div>
                </div>
                <TransactionsTable transactions={transactions} bankFilter={txnBankFilter} />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
