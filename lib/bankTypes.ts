export interface BankLoginField {
  key: string;
  label: string;
  type: "text" | "password" | "number";
}

export interface BankConfig {
  key: string;
  name: string;
  nameHebrew: string;
  emoji: string;
  loginFields: BankLoginField[];
}

export interface BankConnection {
  id: string;
  bank_id: string;
  last_sync_at: string | null;
  created_at: string;
  sync_status: "idle" | "syncing" | "error" | "success";
  error_message?: string | null;
}

export interface BankTransaction {
  id: string;
  user_id: string;
  bank_id: string;
  account_number: string | null;
  transaction_identifier: string | null;
  date: string;
  amount: number;
  description: string;
  memo: string | null;
  type: string | null;
  status: string | null;
  balance: number | null;
  created_at: string;
}

export interface BankAccount {
  id: string;
  user_id: string;
  bank_id: string;
  account_number: string | null;
  balance: number | null;
  credit_limit: number | null;
  available_credit: number | null;
  last_sync_at: string | null;
}
