import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import { accounts } from "@/db/schema";
import { matchPaychecksFromDeposits } from "@/lib/paycheck-match";
import { hasPlaid } from "@/lib/plaid";
import { syncAllPlaidItems, syncPlaidItem } from "@/lib/plaid-sync";

export async function POST(request: Request) {
  if (!hasPlaid()) {
    return NextResponse.json({ error: "Plaid is not configured" }, { status: 400 });
  }

  let accountId: string | undefined;
  try {
    const body = (await request.json()) as { accountId?: string };
    accountId = body.accountId;
  } catch {
    accountId = undefined;
  }

  let results;
  if (accountId) {
    const db = getDb();
    const rows = await db.select().from(accounts).where(eq(accounts.id, accountId));
    const account = rows[0];
    if (!account?.plaidItemId) {
      return NextResponse.json(
        { error: "Account is not linked to Plaid" },
        { status: 400 },
      );
    }
    results = [await syncPlaidItem(account.plaidItemId)];
  } else {
    results = await syncAllPlaidItems();
  }

  const paychecks = await matchPaychecksFromDeposits();
  const { tidyTransactionsForSpend } = await import("@/lib/spend-tidy");
  const tidy = await tidyTransactionsForSpend();
  revalidatePath("/");
  revalidatePath("/paychecks");
  revalidatePath("/transactions");
  revalidatePath("/budget");

  return NextResponse.json({ ok: true, results, paychecks, tidy });
}
