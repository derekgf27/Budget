import { desc, eq } from "drizzle-orm";
import { AddAccountButton } from "@/components/add-account-button";
import { AddManualAccountButton } from "@/components/add-manual-account-button";
import { BankBalanceRow } from "@/components/bank-balance-row";
import { CardBalanceRow } from "@/components/card-balance-row";
import { hideAccount } from "@/app/actions";
import { Money, PageHeader, Panel } from "@/components/ui";
import { getDb, hasDatabase } from "@/db";
import { accounts } from "@/db/schema";
import { accountLabel } from "@/lib/accounts";
import {
  bankBalancesCents,
  cardBalancesCents,
  netBalancesCents,
} from "@/lib/money";

export const dynamic = "force-dynamic";

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
  const banks = visible.filter((a) => a.type === "depository");
  const reservedCents = cardBalancesCents(visible);
  const bankCents = bankBalancesCents(visible);
  const netCents = netBalancesCents(visible);

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Bank cash minus card balances. Cards are also reserved from safe to spend."
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
            <AddManualAccountButton kind="depository" />
            <AddManualAccountButton />
          </div>
        }
      />

      <section className="mb-6 notebook-sheet px-5 py-4">
        <ul className="space-y-2 text-sm">
          <li className="flex justify-between gap-4 text-ink-muted">
            <span>In banks</span>
            <Money cents={bankCents} className="font-medium text-ink" />
          </li>
          <li className="flex justify-between gap-4 text-ink-muted">
            <span>On cards</span>
            <Money cents={reservedCents} className="font-medium text-ink" />
          </li>
          <li className="flex justify-between gap-4 border-t border-line pt-2">
            <span className="text-ink-muted">After cards</span>
            <span
              className={`font-semibold ${netCents < 0 ? "text-danger" : ""}`}
            >
              <Money cents={netCents} />
            </span>
          </li>
        </ul>
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
                updatedAt={a.lastBalanceAt ?? a.lastImportedAt}
                dueDate={a.balanceDueDate}
                source={a.source}
              />
            ))}
          </ul>
        </section>
      )}

      {banks.length === 0 ? (
        <Panel className="mb-8">
          <div className="py-8 text-center">
            <p className="text-ink-muted">No bank balance yet.</p>
            <p className="mt-1 text-sm text-ink-muted">
              Add Popular and set what you have on hand.
            </p>
            <div className="mt-4 flex justify-center">
              <AddManualAccountButton kind="depository" />
            </div>
          </div>
        </Panel>
      ) : (
        <section className="mb-8">
          <h2 className="display mb-3 text-xl text-brand">Banks</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg-elevated/90">
            {banks.map((a) => (
              <BankBalanceRow
                key={a.id}
                id={a.id}
                label={accountLabel(a)}
                balance={
                  a.balanceCurrent != null
                    ? Number(a.balanceCurrent).toFixed(2)
                    : "0.00"
                }
                updatedAt={a.lastBalanceAt ?? a.lastImportedAt}
              />
            ))}
          </ul>
          <div className="mt-3">
            <AddManualAccountButton kind="depository" />
          </div>
        </section>
      )}

      <details className="mb-8">
        <summary className="cursor-pointer text-sm text-brand-soft hover:underline">
          Import a statement CSV
        </summary>
        <div className="mt-3">
          <AddAccountButton />
        </div>
      </details>

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
