import { asc, desc } from "drizzle-orm";
import { PageHeader } from "@/components/ui";
import { TransactionsClient } from "@/components/transactions-client";
import { getDb, hasDatabase } from "@/db";
import { accounts, bills, categories, transactions } from "@/db/schema";
import { accountLabel, visibleAccounts } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  if (!hasDatabase()) {
    return (
      <PageHeader
        title="Transactions"
        description="Add DATABASE_URL to continue."
      />
    );
  }

  const { tidyTransactionsForSpend } = await import("@/lib/spend-tidy");
  await tidyTransactionsForSpend();

  const db = getDb();
  const [txs, cats, accountRows, billRows] = await Promise.all([
    db.select().from(transactions).orderBy(desc(transactions.date)).limit(500),
    db
      .select()
      .from(categories)
      .orderBy(asc(categories.createdAt), asc(categories.id)),
    db.select().from(accounts),
    db.select().from(bills),
  ]);

  const visible = visibleAccounts(accountRows);
  const accountFilters = visible.map((a) => ({
    id: a.id,
    label: accountLabel(a),
  }));

  const appleAccount =
    visible.find((a) =>
      `${a.name} ${a.displayName || ""}`.toLowerCase().includes("apple"),
    ) ??
    accountRows.find((a) =>
      `${a.name} ${a.displayName || ""}`.toLowerCase().includes("apple"),
    );

  const sorted = [...txs].sort((a, b) => {
    const byDate = b.date.localeCompare(a.date);
    if (byDate !== 0) return byDate;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="This check-in’s worksheet — clear categories, then move on."
      />

      <TransactionsClient
        transactions={sorted.map((t) => ({
          id: t.id,
          accountId: t.accountId,
          categoryId: t.categoryId,
          date: t.date,
          name: t.name,
          merchantName: t.merchantName,
          amountCents: t.amountCents,
          pending: t.pending,
          excluded: t.excluded,
          source: t.source,
          createdAt: t.createdAt.toISOString(),
        }))}
        categories={cats.map((c) => ({
          id: c.id,
          name: c.name,
          colorKey: c.colorKey,
        }))}
        accounts={accountFilters}
        bills={billRows.map((b) => ({
          id: b.id,
          name: b.name,
          amountCents: b.amountCents,
        }))}
        appleAccountId={appleAccount?.id ?? null}
      />
    </div>
  );
}
