import Link from "next/link";
import { deleteCategory } from "@/app/actions";
import { AddCategoryButton } from "@/components/add-category-button";
import { EditCategoryButton } from "@/components/edit-category-button";
import { Money, PageHeader, Panel } from "@/components/ui";
import { getDb, hasDatabase } from "@/db";
import { categories, transactions } from "@/db/schema";

export const dynamic = "force-dynamic";

export default async function BudgetPage() {
  if (!hasDatabase()) {
    return (
      <PageHeader title="Budget" description="Add DATABASE_URL to continue." />
    );
  }

  const db = getDb();
  const [cats, txs] = await Promise.all([
    db.select().from(categories),
    db.select().from(transactions),
  ]);

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const monthLabel = now.toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const monthTxs = txs.filter(
    (t) =>
      !t.excluded &&
      t.date.startsWith(monthPrefix) &&
      t.amountCents > 0,
  );

  const uncategorizedCount = monthTxs.filter((t) => !t.categoryId).length;

  const rows = cats.map((cat) => {
    const spent = monthTxs
      .filter((t) => t.categoryId === cat.id)
      .reduce((sum, t) => sum + t.amountCents, 0);
    const limit = cat.monthlyLimitCents;
    const remaining = limit - spent;
    const over = remaining < 0;
    const barPct =
      limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
    return { cat, spent, limit, remaining, over, barPct };
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
        action={<AddCategoryButton />}
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
            {totalBudgeted > 0 ? (
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full ${
                    totalOver ? "bg-danger" : "bg-brand"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.round((totalSpent / totalBudgeted) * 100))}%`,
                  }}
                />
              </div>
            ) : null}
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
            {rows.map(({ cat, spent, limit, remaining, over, barPct }) => (
              <li key={cat.id}>
                <Panel className="h-full">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-medium">{cat.name}</p>
                      <p className="mt-0.5 text-sm text-ink-muted">
                        <Money cents={spent} /> of <Money cents={limit} />
                      </p>
                      <p
                        className={`mt-1 text-sm font-medium ${
                          over ? "text-danger" : "text-safe"
                        }`}
                      >
                        {over ? (
                          <>
                            <Money cents={Math.abs(remaining)} /> over
                          </>
                        ) : (
                          <>
                            <Money cents={remaining} /> left
                          </>
                        )}
                      </p>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
                        <div
                          className={`h-full rounded-full ${
                            over ? "bg-danger" : "bg-brand"
                          }`}
                          style={{ width: `${barPct}%` }}
                        />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <EditCategoryButton
                        initial={{
                          id: cat.id,
                          name: cat.name,
                          limit: (cat.monthlyLimitCents / 100).toFixed(2),
                        }}
                      />
                      <form action={deleteCategory}>
                        <input type="hidden" name="id" value={cat.id} />
                        <button
                          type="submit"
                          className="px-1 text-sm text-danger/80 hover:text-danger"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>
                </Panel>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
