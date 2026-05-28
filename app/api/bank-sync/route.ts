import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";
export const maxDuration = 120; // 2 minutes for bank scraping

function getEncryptionKey(): Buffer {
  const key = process.env.BANK_ENCRYPTION_KEY;
  if (!key) throw new Error("BANK_ENCRYPTION_KEY env var is not set");
  return crypto.createHash("sha256").update(key).digest();
}

function decrypt(data: string): string {
  const [ivHex, encHex] = data.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv("aes-256-cbc", getEncryptionKey(), iv);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}

function createClient() {
  const cookieStore = cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        },
      },
    }
  );
}

export async function POST(req: NextRequest) {
  const supabase = createClient();
  let userId = "";

  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    userId = user.id;

    const { bankId } = await req.json();
    if (!bankId) return NextResponse.json({ error: "Missing bankId" }, { status: 400 });

    // Get encrypted credentials
    const { data: conn, error: connError } = await supabase
      .from("bank_connections")
      .select("credentials_encrypted")
      .eq("user_id", userId)
      .eq("bank_id", bankId)
      .single();

    if (connError || !conn) return NextResponse.json({ error: "Bank not connected" }, { status: 404 });

    // Mark as syncing
    await supabase.from("bank_connections").update({ sync_status: "syncing", error_message: null })
      .eq("user_id", userId).eq("bank_id", bankId);

    // Decrypt credentials
    const credentials = JSON.parse(decrypt(conn.credentials_encrypted));

    // Run scraper
    const { createScraper } = await import("israeli-bank-scrapers");
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3); // last 3 months

    const scraper = createScraper({
      companyId: bankId,
      startDate,
      combineInstallments: false,
      showBrowser: false,
    });

    const scrapeResult = await scraper.scrape(credentials);

    if (!scrapeResult.success) {
      await supabase.from("bank_connections").update({
        sync_status: "error",
        error_message: scrapeResult.errorType ?? "שגיאה לא ידועה",
        last_sync_at: new Date().toISOString(),
      }).eq("user_id", userId).eq("bank_id", bankId);

      return NextResponse.json({ error: scrapeResult.errorType }, { status: 400 });
    }

    // Save accounts and transactions
    const accounts = scrapeResult.accounts ?? [];
    let totalTransactions = 0;

    for (const account of accounts) {
      // Upsert account balance
      await supabase.from("bank_accounts").upsert(
        {
          user_id: userId,
          bank_id: bankId,
          account_number: account.accountNumber ?? null,
          balance: account.balance ?? null,
          credit_limit: null,
          available_credit: null,
          last_sync_at: new Date().toISOString(),
        },
        { onConflict: "user_id,bank_id,account_number" }
      );

      // Upsert transactions
      const txns = account.txns ?? [];
      totalTransactions += txns.length;

      if (txns.length > 0) {
        const rows = txns.map((t) => ({
          user_id: userId,
          bank_id: bankId,
          account_number: account.accountNumber ?? null,
          transaction_identifier: t.identifier?.toString() ?? null,
          date: new Date(t.date).toISOString().split("T")[0],
          amount: t.chargedAmount ?? t.originalAmount ?? 0,
          description: t.description ?? "",
          memo: t.memo ?? null,
          type: t.type ?? null,
          status: t.status ?? null,
          balance: null,
        }));

        await supabase.from("bank_transactions").upsert(rows, {
          onConflict: "user_id,bank_id,account_number,transaction_identifier,date",
          ignoreDuplicates: true,
        });
      }
    }

    // Mark sync as success
    await supabase.from("bank_connections").update({
      sync_status: "success",
      last_sync_at: new Date().toISOString(),
      error_message: null,
    }).eq("user_id", userId).eq("bank_id", bankId);

    return NextResponse.json({ success: true, accounts: accounts.length, transactions: totalTransactions });
  } catch (e: unknown) {
    const msg = (e as Error).message ?? "שגיאה לא ידועה";
    if (userId) {
      const supabase2 = createClient();
      await supabase2.from("bank_connections").update({
        sync_status: "error",
        error_message: msg,
        last_sync_at: new Date().toISOString(),
      }).eq("user_id", userId);
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
