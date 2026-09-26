import { NextResponse } from "next/server";
import Papa from "papaparse";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { dollarsToCents } from "@/lib/money";

type CsvRow = Record<string, string>;

/** Exact header match, then header that starts with / contains the key. */
function pick(row: CsvRow, keys: string[]): string {
  const entries = Object.keys(row).map((k) => ({
    raw: k,
    norm: k.trim().toLowerCase(),
  }));

  for (const key of keys) {
    const want = key.toLowerCase();
    const exact = entries.find((e) => e.norm === want);
    if (exact && row[exact.raw]?.trim()) return row[exact.raw].trim();
  }
  for (const key of keys) {
    const want = key.toLowerCase();
    const soft = entries.find(
      (e) =>
        e.norm.startsWith(want) ||
        e.norm.includes(`(${want})`) ||
        e.norm.includes(want),
    );
    if (soft && row[soft.raw]?.trim()) return row[soft.raw].trim();
  }
  return "";
}

function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function resolveAccountType(
  raw: string,
  accountName: string,
): "credit" | "depository" {
  if (raw === "credit" || raw === "depository") return raw;
  const blob = accountName.toLowerCase();
  if (blob.includes("card") || blob.includes("apple")) return "credit";
  return "depository";
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const accountName = String(form.get("accountName") || "Checking").trim();
  const accountId = String(form.get("accountId") || "").trim();
  const accountType = resolveAccountType(
    String(form.get("accountType") || "").trim(),
    accountName,
  );
  const balanceRaw = String(form.get("balance") || "").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file required" }, { status: 400 });
  }

  if (file.name.toLowerCase().endsWith(".pdf")) {
    return NextResponse.json(
      {
        error:
          "That looks like a PDF. Export a CSV statement (not the PDF).",
      },
      { status: 400 },
    );
  }

  const text = await file.text();
  const parsed = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  if (parsed.errors.length) {
    return NextResponse.json(
      { error: parsed.errors[0]?.message || "CSV parse error" },
      { status: 400 },
    );
  }

  const db = getDb();
  let account = accountId
    ? (await db.select().from(accounts).where(eq(accounts.id, accountId)))[0]
    : undefined;

  if (!account) {
    const existingAccounts = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.name, accountName), eq(accounts.source, "csv")));
    account = existingAccounts[0];
  }

  const balanceCurrent =
    balanceRaw === "" ? undefined : balanceRaw.replace(/[$,]/g, "");
  const importedAt = new Date();

  if (!account) {
    const displayName = accountName.toLowerCase().includes("apple")
      ? "Apple Card"
      : accountName;
    const inserted = await db
      .insert(accounts)
      .values({
        name: accountName,
        displayName,
        type: accountType,
        subtype: accountType === "credit" ? "credit card" : "checking",
        source: "csv",
        balanceCurrent: balanceCurrent ?? null,
        lastImportedAt: importedAt,
        ...(balanceCurrent !== undefined ? { lastBalanceAt: importedAt } : {}),
      })
      .returning();
    account = inserted[0];
  } else {
    await db
      .update(accounts)
      .set({
        ...(balanceCurrent !== undefined
          ? { balanceCurrent, lastBalanceAt: importedAt }
          : {}),
        lastImportedAt: importedAt,
        ...(account.source === "csv" && !account.displayName
          ? {
              displayName: accountName.toLowerCase().includes("apple")
                ? "Apple Card"
                : accountName,
            }
          : {}),
      })
      .where(eq(accounts.id, account.id));
  }

  let imported = 0;
  let skipped = 0;

  for (const row of parsed.data) {
    const dateRaw = pick(row, [
      "transaction date",
      "date",
      "posted date",
      "trans date",
      "clearing date",
    ]);
    const merchant = pick(row, ["merchant", "merchant name", "payee"]);
    const description = pick(row, ["description", "name", "transaction"]);
    const name = merchant || description;
    const amountRaw = pick(row, [
      "amount (usd)",
      "amount",
      "debit",
      "charge",
      "transaction amount",
      "credit",
    ]);
    const type = pick(row, ["type", "transaction type"]).toLowerCase();
    const date = normalizeDate(dateRaw);
    if (!date || !name || !amountRaw) {
      skipped += 1;
      continue;
    }

    // Card payments aren't spend — skip (or they'd skew the budget)
    if (
      type.includes("payment") ||
      name.toLowerCase().includes("payment thank you") ||
      name.toLowerCase().includes("ach deposit payment")
    ) {
      skipped += 1;
      continue;
    }

    let amountCents = dollarsToCents(amountRaw);
    // Credits / refunds → negative (income-style) in our spend convention
    if (type.includes("credit") || type.includes("refund")) {
      amountCents = -Math.abs(amountCents);
    } else if (amountCents < 0) {
      // Already signed refund/deposit in CSV
    } else {
      amountCents = Math.abs(amountCents);
    }

    const dupes = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.accountId, account.id),
          eq(transactions.date, date),
          eq(transactions.amountCents, amountCents),
          eq(transactions.name, name),
        ),
      );

    if (dupes.length > 0) {
      skipped += 1;
      continue;
    }

    await db.insert(transactions).values({
      accountId: account.id,
      date,
      name,
      merchantName: merchant || null,
      amountCents,
      source: "csv",
    });
    imported += 1;
  }

  const { tidyTransactionsForSpend } = await import("@/lib/spend-tidy");
  await tidyTransactionsForSpend();

  let paychecks = { logged: 0, updated: 0 };
  try {
    const { matchPaychecksFromDeposits } = await import(
      "@/lib/paycheck-match"
    );
    paychecks = await matchPaychecksFromDeposits();
  } catch {
    /* matching is best-effort */
  }

  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/");
  revalidatePath("/budget");
  revalidatePath("/paychecks");

  return NextResponse.json({
    ok: true,
    imported,
    skipped,
    accountId: account.id,
    paychecks,
  });
}
