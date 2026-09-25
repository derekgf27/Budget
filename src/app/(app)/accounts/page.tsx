import { desc, eq } from "drizzle-orm";
import { AccountActions } from "@/components/account-actions";
import { AddAccountButton } from "@/components/add-account-button";
import { AddManualAccountButton } from "@/components/add-manual-account-button";
import { CardBalanceRow } from "@/components/card-balance-row";
import { hideAccount } from "@/app/actions";
import { Money, PageHeader, Panel } from "@/components/ui";
import { getDb, hasDatabase } from "@/db";
import { accounts } from "@/db/schema";
import { accountLabel, formatImportedAt } from "@/lib/accounts";
import { cardBalancesCents } from "@/lib/money";

export const dynamic = "force-dynamic";

type AccountRow = typeof accounts.$inferSelect;

export default async function AccountsPage({
  searchParams,
}: {
  searchParams?: Promise<{ showHidden?: string }>;
}) {
  if (!hasDatabase()) {
    return (
      <PageHeader title="Accounts" description="Add DATABASE_URL to continue." />
    );
  }

  const params = (await searchParams) || {};
  const showHidden = params.showHidden === "1";

  const db = getDb();
  const rows = await db.select().from(accounts).orderBy(desc(accounts.createdAt));

  for (const a of rows) {
    if (a.displayName) continue;
    const label = accountLabel(a);
    if (label !== a.name) {
      await db
        .update(accounts)
        .set({ displayName: label })
        .where(eq(accounts.id, a.id));
      a.displayName = label;
    }
  }

  const visible = rows.filter((a) => !a.hidden);
  const hiddenRows = rows.filter((a) => a.hidden);
  const cards = visible.filter((a) => a.type === "credit");
  const otherAccounts = visible.filter((a) => a.type !== "credit");
  const reservedCents = cardBalancesCents(visible);

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Track card balances. What you owe is reserved from safe to spend."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="https://card.apple.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-sm border border-line px-3 py-2 text-sm text-ink-muted hover:bg-bg-elevated"
            >
              Apple Card
            </a>
            <AddManualAccountButton />
          </div>
        }
      />

      <section className="notebook-sheet notebook-margin mb-6 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
          Set aside for cards
        </p>
        <p className="display mt-2 text-4xl text-brand">
          <Money cents={reservedCents} />
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          This amount comes out of safe to spend so you can pay the cards by
          their due dates.
        </p>
      </section>

      {cards.length === 0 ? (
        <Panel>
          <div className="py-10 text-center">
            <p className="text-ink-muted">No cards yet.</p>
            <p className="mt-1 text-sm text-ink-muted">
              Add a card and Charge / Pay as you go.
            </p>
            <div className="mt-4 flex justify-center">
              <AddManualAccountButton />
            </div>
          </div>
        </Panel>
      ) : (
        <section className="mb-8">
          <h2 className="display mb-3 text-xl text-brand">Cards</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg-elevated/90">
            {cards.map((a) => (
              <CardBalanceRow
                key={a.id}
                id={a.id}
                label={accountLabel(a)}
                balance={
                  a.balanceCurrent != null
                    ? Number(a.balanceCurrent).toFixed(2)
                    : "0.00"
                }
                updatedAt={a.lastImportedAt}
                dueDate={a.balanceDueDate}
                source={a.source}
              />
            ))}
          </ul>
        </section>
      )}

      {otherAccounts.length > 0 ? (
        <details className="mb-8">
          <summary className="cursor-pointer text-sm text-brand-soft hover:underline">
            Banks & statement imports ({otherAccounts.length})
          </summary>
          <ul className="mt-3 divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg-elevated/90">
            {otherAccounts.map((a) => {
              const label = accountLabel(a);
              const imported = formatImportedAt(a.lastImportedAt);
              const balance =
                a.balanceCurrent != null
                  ? Number(a.balanceCurrent).toFixed(2)
                  : null;
              return (
                <li
                  key={a.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{label}</p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {imported ? `Imported ${imported}` : "Bank"}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-lg font-medium">
                      {balance != null ? `$${balance}` : "—"}
                    </p>
                  </div>
                  <AccountActions
                    id={a.id}
                    label={label}
                    balance={balance}
                    source={a.source}
                  />
                </li>
              );
            })}
          </ul>
          <div className="mt-3">
            <AddAccountButton />
          </div>
        </details>
      ) : (
        <details className="mb-8">
          <summary className="cursor-pointer text-sm text-brand-soft hover:underline">
            Import a bank statement
          </summary>
          <div className="mt-3">
            <AddAccountButton />
          </div>
        </details>
      )}

      {hiddenRows.length > 0 ? (
        <div className="mt-2">
          {!showHidden ? (
            <a
              href="/accounts?showHidden=1"
              className="text-sm text-brand-soft hover:underline"
            >
              Show {hiddenRows.length} hidden account
              {hiddenRows.length === 1 ? "" : "s"}
            </a>
          ) : (
            <>
              <a
                href="/accounts"
                className="mb-3 inline-block text-sm text-brand-soft hover:underline"
              >
                Hide hidden accounts
              </a>
              <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg-elevated/90">
                {hiddenRows.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                  >
                    <p className="font-medium">{accountLabel(a)}</p>
                    <form action={hideAccount}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="hidden" value="false" />
                      <button
                        type="submit"
                        className="text-sm text-brand-soft hover:underline"
                      >
                        Unhide
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
