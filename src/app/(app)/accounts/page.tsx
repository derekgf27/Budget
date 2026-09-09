import { AddAccountButton } from "@/components/add-account-button";
import { SyncPlaidButton } from "@/components/plaid-connect";
import { PageHeader, Panel } from "@/components/ui";
import { getDb, hasDatabase } from "@/db";
import { accounts } from "@/db/schema";
import { hasPlaid } from "@/lib/plaid";

export const dynamic = "force-dynamic";

export default async function AccountsPage() {
  if (!hasDatabase()) {
    return (
      <PageHeader title="Accounts" description="Add DATABASE_URL to continue." />
    );
  }

  const db = getDb();
  const rows = await db.select().from(accounts);
  const plaidEnabled = hasPlaid();

  return (
    <div>
      <PageHeader
        title="Accounts"
        description="Linked cards and banks for spending and balances."
        action={
          <div className="flex flex-wrap gap-2">
            {plaidEnabled && rows.length > 0 ? <SyncPlaidButton /> : null}
            <AddAccountButton plaidEnabled={plaidEnabled} />
          </div>
        }
      />

      {rows.length === 0 ? (
        <Panel>
          <div className="py-10 text-center">
            <p className="text-ink-muted">No accounts yet.</p>
            <div className="mt-4 flex justify-center">
              <AddAccountButton plaidEnabled={plaidEnabled} />
            </div>
          </div>
        </Panel>
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {rows.map((a) => (
            <li key={a.id}>
              <Panel className="h-full">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-medium">
                      {a.name}
                      {a.mask ? (
                        <span className="text-ink-muted"> ···{a.mask}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-sm text-ink-muted">
                      {a.type} · {a.source}
                      {a.officialName ? ` · ${a.officialName}` : ""}
                    </p>
                    <p className="mt-1 text-lg font-medium">
                      {a.balanceCurrent != null
                        ? `$${Number(a.balanceCurrent).toFixed(2)}`
                        : "—"}
                    </p>
                  </div>
                </div>
              </Panel>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
