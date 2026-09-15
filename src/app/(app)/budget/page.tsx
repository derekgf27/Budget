import Link from "next/link";
import { asc } from "drizzle-orm";
import { AddCategoryButton } from "@/components/add-category-button";
import { BudgetCategoryCard } from "@/components/budget-category-card";
import {
  MonthPicker,
  formatMonthKeyLabel,
  resolveMonthKey,
} from "@/components/month-picker";
import { Money, PageHeader, Panel } from "@/components/ui";
import { getDb, hasDatabase } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { accountLabel } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function BudgetPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  if (!hasDatabase()) {
    return (
      <PageHeader title="Budget" description="Add DATABASE_URL to continue." />
    );
  }

  const params = (await searchParams) || {};
  const monthPrefix = resolveMonthKey(params.month);
  const monthLabel = formatMonthKeyLabel(monthPrefix);

  const db = getDb();
  const [cats, txs, accountRows] = await Promise.all([
    db
      .select()
      .from(categories)
      .orderBy(asc(categories.createdAt), asc(categories.id)),
    db.select().from(transactions),
    db.select().from(accounts),
  ]);

  const accountById = new Map(
    accountRows.map((a) => [a.id, accountLabel(a)]),
  );

  const monthTxs = txs.filter(
    (t) =>
      !t.excluded &&
      t.date.startsWith(monthPrefix) &&
      t.amountCents > 0,
  );

  const uncategorizedCount = monthTxs.filter((t) => !t.categoryId).length;

  const rows = cats.map((cat) => {
    const expenses = monthTxs
      .filter((t) => t.categoryId === cat.id)
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((t) => ({
        id: t.id,
        date: t.date,
        name: t.name,
        merchantName: t.merchantName,
        amountCents: t.amountCents,
        accountLabel: t.accountId ? accountById.get(t.accountId) ?? null : null,
      }));
    const spent = expenses.reduce((sum, t) => sum + t.amountCents, 0);
    const limit = cat.monthlyLimitCents;
    const remaining = limit - spent;
    const over = remaining < 0;
    const barPct =
      limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
    return { cat, spent, limit, remaining, over, barPct, expenses };
  });

  const totalBudgeted = rows.reduce((sum, r) => sum + r.limit, 0);
  const totalSpent = rows.reduce((sum, r) => sum + r.spent, 0);
  const totalLeft = totalBudgeted - totalSpent;
  const totalOver = totalLeft < 0;
  const totalPct =
    totalBudgeted > 0
      ? Math.min(999, Math.round((totalSpent / totalBudgeted) * 100))
      : 0;

  return (
    <div>
      <PageHeader
        title="Budget"
        description={`Monthly category limits versus spending · ${monthLabel}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker monthKey={monthPrefix} basePath="/budget" />
            <AddCategoryButton />
          </div>
        }
      />

      {cats.length === 0 ? (
        <Panel>
          <div className="py-10 text-center">
            <p className="text-ink-muted">No categories yet.</p>
            <div className="mt-4 flex justify-center">
              <AddCategoryButton />
            </div>
          </div>
        </Panel>
      ) : (
        <>
          <Panel className="mb-4 !p-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-ink-muted">Budgeted</p>
                <p className="mt-1 text-xl font-medium">
                  <Money cents={totalBudgeted} />
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">Spent</p>
                <p className="mt-1 text-xl font-medium">
                  <Money cents={totalSpent} />
                  {totalBudgeted > 0 ? (
                    <span className="ml-2 text-sm font-normal text-ink-muted">
                      {totalPct}%
                    </span>
                  ) : null}
                </p>
              </div>
              <div>
                <p className="text-xs text-ink-muted">
                  {totalOver ? "Over" : "Left"}
                </p>
                <p
                  className={`mt-1 text-xl font-medium ${
                    totalOver ? "text-danger" : "text-safe"
                  }`}
                >
                  <Money cents={Math.abs(totalLeft)} />
                </p>
              </div>
            </div>
          </Panel>

          {uncategorizedCount > 0 ? (
            <div className="mb-4 rounded-xl border border-accent/30 bg-accent-soft/50 px-4 py-3 text-sm">
              <p className="font-medium text-ink">
                {uncategorizedCount} transaction
                {uncategorizedCount === 1 ? "" : "s"} need a category
              </p>
              <p className="mt-0.5 text-ink-muted">
                Until you categorize them, budget bars won’t include that spend.
              </p>
              <Link
                href="/transactions"
                className="mt-2 inline-block font-medium text-brand-soft hover:underline"
              >
                Review transactions
              </Link>
            </div>
          ) : null}

          <ul className="grid gap-4 lg:grid-cols-2">
            {rows.map(({ cat, spent, limit, remaining, over, barPct, expenses }) => (
              <li key={cat.id}>
                <BudgetCategoryCard
                  category={cat}
                  spent={spent}
                  limit={limit}
                  remaining={remaining}
                  over={over}
                  barPct={barPct}
                  monthLabel={monthLabel}
                  expenses={expenses}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
