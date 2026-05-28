-- Run this in your Supabase SQL editor

-- Bank connections (one per user per bank, stores encrypted credentials)
CREATE TABLE IF NOT EXISTS bank_connections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bank_id TEXT NOT NULL,
  credentials_encrypted TEXT NOT NULL,
  sync_status TEXT DEFAULT 'idle' CHECK (sync_status IN ('idle','syncing','success','error')),
  error_message TEXT,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, bank_id)
);

-- Bank accounts (balance snapshot per account)
CREATE TABLE IF NOT EXISTS bank_accounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bank_id TEXT NOT NULL,
  account_number TEXT,
  balance NUMERIC,
  credit_limit NUMERIC,
  available_credit NUMERIC,
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, bank_id, account_number)
);

-- Bank transactions
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  bank_id TEXT NOT NULL,
  account_number TEXT,
  transaction_identifier TEXT,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  memo TEXT,
  type TEXT,
  status TEXT,
  balance NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, bank_id, account_number, transaction_identifier, date)
);

-- RLS Policies
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own bank connections"
  ON bank_connections FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own bank accounts"
  ON bank_accounts FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own bank transactions"
  ON bank_transactions FOR ALL USING (auth.uid() = user_id);

-- Indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_date
  ON bank_transactions(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_user_bank
  ON bank_transactions(user_id, bank_id);
