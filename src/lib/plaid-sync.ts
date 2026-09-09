import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, plaidItems, transactions } from "@/db/schema";
import { getPlaidClient } from "@/lib/plaid";

function toCents(amount: number): number {
  // Plaid: positive amounts are money leaving the account (expenses)
  return Math.round(amount * 100);
}

export async function syncPlaidItem(plaidItemRowId: string) {
  const db = getDb();
  const items = await db
    .select()
    .from(plaidItems)
    .where(eq(plaidItems.id, plaidItemRowId));
  const item = items[0];
  if (!item) return { added: 0, modified: 0, removed: 0 };

  const client = getPlaidClient();
  let cursor = item.cursor ?? undefined;
  let added = 0;
  let modified = 0;
  let removed = 0;
  let hasMore = true;

  const accountRows = await db
    .select()
    .from(accounts)
    .where(eq(accounts.plaidItemId, item.id));
  const accountByPlaidId = new Map(
    accountRows
      .filter((a) => a.plaidAccountId)
      .map((a) => [a.plaidAccountId!, a.id]),
  );

  while (hasMore) {
    const response = await client.transactionsSync({
      access_token: item.accessToken,
      cursor,
    });

    for (const tx of response.data.added) {
      const accountId = accountByPlaidId.get(tx.account_id) ?? null;
      const existing = await db
        .select()
        .from(transactions)
        .where(eq(transactions.plaidTransactionId, tx.transaction_id));
      const values = {
        accountId,
        plaidTransactionId: tx.transaction_id,
        date: tx.date,
        name: tx.name,
        merchantName: tx.merchant_name ?? null,
        amountCents: toCents(tx.amount),
        pending: tx.pending,
        source: "plaid" as const,
      };
      if (existing[0]) {
        await db
          .update(transactions)
          .set(values)
          .where(eq(transactions.id, existing[0].id));
        modified += 1;
      } else {
        await db.insert(transactions).values(values);
        added += 1;
      }
    }

    for (const tx of response.data.modified) {
      const accountId = accountByPlaidId.get(tx.account_id) ?? null;
      const existing = await db
        .select()
        .from(transactions)
        .where(eq(transactions.plaidTransactionId, tx.transaction_id));
      const values = {
        accountId,
        plaidTransactionId: tx.transaction_id,
        date: tx.date,
        name: tx.name,
        merchantName: tx.merchant_name ?? null,
        amountCents: toCents(tx.amount),
        pending: tx.pending,
        source: "plaid" as const,
      };
      if (existing[0]) {
        await db
          .update(transactions)
          .set(values)
          .where(eq(transactions.id, existing[0].id));
      } else {
        await db.insert(transactions).values(values);
      }
      modified += 1;
    }

    for (const removedTx of response.data.removed) {
      if (!removedTx.transaction_id) continue;
      await db
        .delete(transactions)
        .where(eq(transactions.plaidTransactionId, removedTx.transaction_id));
      removed += 1;
    }

    hasMore = response.data.has_more;
    cursor = response.data.next_cursor;
  }

  await db
    .update(plaidItems)
    .set({ cursor: cursor ?? null })
    .where(eq(plaidItems.id, item.id));

  // refresh balances
  const accountsRes = await client.accountsGet({
    access_token: item.accessToken,
  });
  for (const acct of accountsRes.data.accounts) {
    await db
      .update(accounts)
      .set({
        balanceCurrent: acct.balances.current?.toString() ?? null,
        balanceLimit: acct.balances.limit?.toString() ?? null,
      })
      .where(eq(accounts.plaidAccountId, acct.account_id));
  }

  return { added, modified, removed };
}

export async function syncAllPlaidItems() {
  const db = getDb();
  const items = await db.select().from(plaidItems);
  const results = [];
  for (const item of items) {
    results.push(await syncPlaidItem(item.id));
  }
  return results;
}
