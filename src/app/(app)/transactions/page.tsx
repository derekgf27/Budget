import Link from "next/link";
import { desc } from "drizzle-orm";
import { toggleTransactionExcluded } from "@/app/actions";
import { CategorySelect } from "@/components/category-select";
import {
  Money,
  PageHeader,
  Panel,
  buttonGhostClass,
  buttonPrimaryClass,
} from "@/components/ui";
import { getDb, hasDatabase } from "@/db";
import { categories, transactions } from "@/db/schema";
import { formatDisplayDate } from "@/lib/money";

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

  const db = getDb();
  const [txs, cats] = await Promise.all([
    db.select().from(transactions).orderBy(desc(transactions.date)).limit(250),
    db.select().from(categories),
  ]);

  const sorted = [...txs].sort((a, b) => {
    const aNeeds =
      !a.excluded && !a.categoryId ? 0 : a.excluded ? 2 : 1;
    const bNeeds =
      !b.excluded && !b.categoryId ? 0 : b.excluded ? 2 : 1;
    if (aNeeds !== bNeeds) return aNeeds - bNeeds;
    return b.date.localeCompare(a.date);
  });

  const needsTriage = sorted.filter((t) => !t.excluded && !t.categoryId).length;

  return (
    <div>
      <PageHeader
        title="Transactions"
        description="Spending from Plaid and CSV. Categorize or ignore so safe-to-spend stays honest."
        action={
          <Link href="/accounts" className={buttonPrimaryClass}>
            Add account
          </Link>
        }
      />

      {txs.length === 0 ? (
        <Panel>
          <div className="py-10 text-center">
            <p className="text-ink-muted">
              No transactions yet — connect Plaid or import a CSV.
            </p>
            <div className="mt-4 flex justify-center">
              <Link href="/accounts" className={buttonPrimaryClass}>
                Go to Accounts
              </Link>
            </div>
          </div>
        </Panel>
      ) : (
        <>
          {needsTriage > 0 ? (
            <p className="mb-3 text-sm text-ink-muted">
              {needsTriage} uncategorized — review these first.
            </p>
          ) : null}
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg-elevated/90">
            {sorted.map((tx) => {
              const needsCat = !tx.excluded && !tx.categoryId;
              return (
                <li
                  key={tx.id}
                  className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                    tx.excluded ? "opacity-55" : needsCat ? "bg-accent-soft/35" : ""
                  }`}
                >
                  <div className="min-w-0 flex-1 basis-40">
                    <p className="font-medium leading-snug">
                      {tx.merchantName || tx.name}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {formatDisplayDate(tx.date)} · {tx.source}
                      {tx.pending ? " · Pending" : ""}
                      {tx.excluded ? " · Ignored" : ""}
                    </p>
                  </div>
                  <Money cents={tx.amountCents} className="shrink-0 font-medium" />
                  <div className="flex min-w-[10rem] flex-1 flex-wrap items-center gap-2 sm:justify-end">
                    {!tx.excluded ? (
                      <CategorySelect
                        transactionId={tx.id}
                        categoryId={tx.categoryId}
                        categories={cats}
                      />
                    ) : null}
                    <form action={toggleTransactionExcluded}>
                      <input type="hidden" name="id" value={tx.id} />
                      <input
                        type="hidden"
                        name="excluded"
                        value={String(tx.excluded)}
                      />
                      <button type="submit" className={buttonGhostClass}>
                        {tx.excluded ? "Include" : "Ignore"}
                      </button>
                    </form>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
