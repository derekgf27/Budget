import { desc, eq } from "drizzle-orm";
import { AccountActions } from "@/components/account-actions";
import { AddAccountButton } from "@/components/add-account-button";
import { SyncPlaidButton } from "@/components/plaid-connect";
import { hideAccount } from "@/app/actions";
import { PageHeader, Panel } from "@/components/ui";
import { getDb, hasDatabase } from "@/db";
import { accounts, plaidItems } from "@/db/schema";
import { accountLabel, formatSyncedAt, isEmptyDuplicateAccount } from "@/lib/accounts";
import { hasPlaid } from "@/lib/plaid";

export const dynamic = "force-dynamic";

type AccountRow = typeof accounts.$inferSelect & {
  institutionName?: string | null;
};

function AccountList({
  title,
  items,
  showHidden,
}: {
  title: string;
  items: AccountRow[];
  showHidden?: boolean;
}) {
  if (items.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="display mb-3 text-xl text-brand">{title}</h2>
      <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg-elevated/90">
        {items.map((a) => {
          const label = accountLabel({
            ...a,
            institutionName: a.institutionName,
          });
          const synced = formatSyncedAt(a.lastSyncedAt);
          const balance =
            a.balanceCurrent != null ? Number(a.balanceCurrent).toFixed(2) : null;

          return (
            <li
              key={a.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {label}
                  {a.mask ? (
                    <span className="text-ink-muted"> ···{a.mask}</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  {a.type}
                  {a.subtype ? ` · ${a.subtype}` : ""} · {a.source}
                  {synced
                    ? ` · ${a.source === "csv" ? "Imported" : "Synced"} ${synced}`
                    : ""}
                </p>
              </div>
              <p className="shrink-0 text-lg font-medium">
                {balance != null ? `$${balance}` : "—"}
              </p>
              <div className="w-full sm:w-auto">
                {showHidden ? (
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
                ) : (
                  <AccountActions
                    id={a.id}
                    label={label}
                    source={a.source}
                    balance={balance}
                    canSync={a.source === "plaid" && Boolean(a.plaidItemId)}
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

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
  const [rows, items] = await Promise.all([
    db.select().from(accounts).orderBy(desc(accounts.createdAt)),
    db.select().from(plaidItems),
  ]);
  const institutionByItem = new Map(
    items.map((i) => [i.id, i.institutionName]),
  );

  const enriched: AccountRow[] = rows.map((a) => ({
    ...a,
    institutionName: a.plaidItemId
      ? institutionByItem.get(a.plaidItemId) ?? null
      : null,
  }));

  // Backfill display names for Popular / Apple once
  for (const a of enriched) {
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

  const visible = enriched.filter(
    (a) => !a.hidden && !isEmptyDuplicateAccount(a, enriched),
  );
  const hiddenRows = enriched.filter(
    (a) => a.hidden || isEmptyDuplicateAccount(a, enriched),
  );

  const bankAccounts = visible.filter((a) => a.type === "depository");
  const cardAccounts = visible.filter((a) => a.type === "credit");
  const otherAccounts = visible.filter(
    (a) => a.type !== "depository" && a.type !== "credit",
  );

  const plaidEnabled = hasPlaid();
  const hasPlaidAccounts = visible.some((a) => a.source === "plaid");

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Banks and cards for balances and spending."
        action={
          <div className="flex flex-wrap gap-2">
            {plaidEnabled && hasPlaidAccounts ? <SyncPlaidButton /> : null}
            <AddAccountButton plaidEnabled={plaidEnabled} />
          </div>
        }
      />

      {visible.length === 0 && !showHidden ? (
        <Panel>
          <div className="py-10 text-center">
            <p className="text-ink-muted">No accounts yet.</p>
            <div className="mt-4 flex justify-center">
              <AddAccountButton plaidEnabled={plaidEnabled} />
            </div>
          </div>
        </Panel>
      ) : (
        <>
          <AccountList title="Banks" items={bankAccounts} />
          <AccountList title="Cards" items={cardAccounts} />
          <AccountList title="Other" items={otherAccounts} />
        </>
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
                Hide empty / hidden accounts
              </a>
              <AccountList
                title="Hidden"
                items={hiddenRows}
                showHidden
              />
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
