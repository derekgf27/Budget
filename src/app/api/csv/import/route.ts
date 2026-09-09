import { NextResponse } from "next/server";
import Papa from "papaparse";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, transactions } from "@/db/schema";
import { dollarsToCents } from "@/lib/money";

type CsvRow = Record<string, string>;

function pick(row: CsvRow, keys: string[]): string {
  for (const key of keys) {
    const found = Object.keys(row).find(
      (k) => k.trim().toLowerCase() === key.toLowerCase(),
    );
    if (found && row[found]?.trim()) return row[found].trim();
  }
  return "";
}

function normalizeDate(raw: string): string | null {
  if (!raw) return null;
  // YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // MM/DD/YYYY
  const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }
  return null;
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, " ").trim();
}

export async function POST(request: Request) {
  const form = await request.formData();
  const file = form.get("file");
  const accountName = String(form.get("accountName") || "Imported card").trim();

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "CSV file required" }, { status: 400 });
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
  const existingAccounts = await db
    .select()
    .from(accounts)
    .where(and(eq(accounts.name, accountName), eq(accounts.source, "csv")));

  let account = existingAccounts[0];
  if (!account) {
    const inserted = await db
      .insert(accounts)
      .values({
        name: accountName,
        type: "credit",
        source: "csv",
      })
      .returning();
    account = inserted[0];
  }

  let imported = 0;
  let skipped = 0;

  for (const row of parsed.data) {
    const dateRaw = pick(row, ["date", "transaction date", "posted date", "trans date"]);
    const name = pick(row, [
      "description",
      "name",
      "merchant",
      "payee",
      "transaction",
    ]);
    const amountRaw = pick(row, ["amount", "debit", "charge", "transaction amount"]);
    const date = normalizeDate(dateRaw);
    if (!date || !name || !amountRaw) {
      skipped += 1;
      continue;
    }

    let amountCents = dollarsToCents(amountRaw);
    // Some CSVs use negative for expenses
    if (amountCents < 0) amountCents = Math.abs(amountCents);

    const dupes = await db.select().from(transactions).where(
      and(
        eq(transactions.accountId, account.id),
        eq(transactions.date, date),
        eq(transactions.amountCents, amountCents),
        eq(transactions.name, name),
      ),
    );

    if (
      dupes.some((d) => normalizeName(d.name) === normalizeName(name)) &&
      dupes.length > 0
    ) {
      skipped += 1;
      continue;
    }

    await db.insert(transactions).values({
      accountId: account.id,
      date,
      name,
      amountCents,
      source: "csv",
    });
    imported += 1;
  }

  return NextResponse.json({ ok: true, imported, skipped, accountId: account.id });
}
