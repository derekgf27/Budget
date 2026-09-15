import { desc } from "drizzle-orm";
import { deleteSavings } from "@/app/actions";
import { AddSavingsButton } from "@/components/add-savings-button";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { FundActions } from "@/components/fund-actions";
import { SavingsForm } from "@/components/savings-form";
import { SavingsTransferForm } from "@/components/savings-transfer-form";
import { Money, PageHeader } from "@/components/ui";
import { getDb, hasDatabase } from "@/db";
import { savingsGoals, savingsTransfers } from "@/db/schema";
import { formatDisplayDate } from "@/lib/money";

export const dynamic = "force-dynamic";

function ActivityList({
  transfers,
}: {
  transfers: {
    id: string;
    amountCents: number;
    transferredOn: string;
    note: string | null;
  }[];
}) {
  if (transfers.length === 0) {
    return <p className="text-sm text-ink">No moves yet.</p>;
  }

  return (
    <ul className="divide-y divide-rule">
      {transfers.map((t) => (
        <li
          key={t.id}
          className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm first:pt-0 last:pb-0"
        >
          <div className="min-w-0">
            <p className="font-medium">
              {t.amountCents >= 0 ? "Deposit" : "Withdrawal"}
            </p>
            <p className="mt-0.5 truncate text-xs text-ink">
              {formatDisplayDate(t.transferredOn)}
              {t.note ? ` · ${t.note}` : ""}
            </p>
          </div>
          <Money
            cents={t.amountCents}
            className={`shrink-0 font-semibold tabular-nums ${
              t.amountCents >= 0 ? "text-safe" : "text-danger"
            }`}
          />
        </li>
      ))}
    </ul>
  );
}

export default async function SavingsPage() {
  if (!hasDatabase()) {
    return (
      <PageHeader title="Savings" description="Add DATABASE_URL to continue." />
    );
  }

  const db = getDb();
  const items = await db.select().from(savingsGoals);
  let transfers: (typeof savingsTransfers.$inferSelect)[] = [];
  try {
    transfers = await db
      .select()
      .from(savingsTransfers)
      .orderBy(desc(savingsTransfers.transferredOn))
      .limit(200);
  } catch {
    transfers = [];
  }

  const funds = items.filter((i) => i.kind === "fund");
  const goals = items.filter((i) => i.kind !== "fund");
  const primaryFund = funds[0] ?? null;
  const extraFunds = funds.slice(1);

  const primaryHistory = primaryFund
    ? transfers
        .filter((t) => t.savingsId === primaryFund.id)
        .slice(0, 12)
        .map((t) => ({
          id: t.id,
          amountCents: t.amountCents,
          transferredOn: t.transferredOn,
          note: t.note,
        }))
    : [];

  return (
    <div>
      <PageHeader
        title="Savings"
        description="Your pot first — goals underneath."
        action={<AddSavingsButton />}
      />

      {/* Fund hero + recent activity */}
      {primaryFund ? (
        <div className="mb-10 grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)] lg:items-start">
          <section className="notebook-sheet notebook-margin px-5 py-6 sm:px-7">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink">
                  Fund pot
                </p>
                <p className="mt-1 text-sm text-ink">{primaryFund.name}</p>
              </div>
              <ConfirmDeleteForm
                action={deleteSavings}
                itemName={primaryFund.name}
                buttonClassName="text-sm text-danger underline-offset-2 hover:underline"
                confirmLabel="This removes the fund and its transfer history."
              >
                <input type="hidden" name="id" value={primaryFund.id} />
              </ConfirmDeleteForm>
            </div>

            <p className="display mt-4 text-5xl tracking-tight text-safe sm:text-6xl">
              <Money cents={primaryFund.currentCents} />
            </p>

            <div className="mt-6">
              <FundActions
                savingsId={primaryFund.id}
                name={primaryFund.name}
                balanceCents={primaryFund.currentCents}
              />
            </div>

            <details className="mt-5 border-t border-rule pt-4 text-sm">
              <summary className="cursor-pointer font-medium text-brand underline-offset-2 hover:underline">
                Edit fund
              </summary>
              <div className="mt-3 max-w-md">
                <SavingsForm
                  forcedKind="fund"
                  submitLabel="Update fund"
                  initial={{
                    id: primaryFund.id,
                    name: primaryFund.name,
                    kind: "fund",
                    current: (primaryFund.currentCents / 100).toFixed(2),
                  }}
                />
              </div>
            </details>
          </section>

          <aside className="notebook-sheet px-5 py-5 sm:px-6">
            <div className="mb-3 flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-semibold text-brand">Recent moves</h2>
              <p className="text-xs text-ink">
                {primaryHistory.length === 0
                  ? "None"
                  : `${primaryHistory.length} shown`}
              </p>
            </div>
            <ActivityList transfers={primaryHistory} />
          </aside>
        </div>
      ) : (
        <section className="mb-10 notebook-sheet notebook-margin px-5 py-10 text-center sm:px-7">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink">
            Fund pot
          </p>
          <p className="mt-3 text-lg font-medium">No fund yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-ink">
            Create a pot so you can drop money in anytime — no target required.
          </p>
          <div className="mt-5 flex justify-center">
            <AddSavingsButton />
          </div>
        </section>
      )}

      {extraFunds.length > 0 ? (
        <section className="mb-10">
          <h2 className="mb-3 text-sm font-semibold text-brand">Other funds</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {extraFunds.map((fund) => (
              <li
                key={fund.id}
                className="notebook-sheet flex flex-wrap items-center justify-between gap-3 px-4 py-4"
              >
                <div>
                  <p className="font-medium">{fund.name}</p>
                  <p className="display mt-1 text-2xl text-safe">
                    <Money cents={fund.currentCents} />
                  </p>
                </div>
                <FundActions
                  savingsId={fund.id}
                  name={fund.name}
                  balanceCents={fund.currentCents}
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {/* Goals */}
      <section>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-rule pb-3">
          <div>
            <h2 className="text-base font-semibold text-brand">Goals</h2>
            <p className="mt-0.5 text-sm text-ink">
              Targets with a planned amount each check-in.
            </p>
          </div>
        </div>

        {goals.length === 0 ? (
          <p className="text-sm text-ink">
            No goals yet. Add one when you want a target and planned contribution.
          </p>
        ) : (
          <ul className="space-y-4">
            {goals.map((goal) => {
              const pct =
                goal.targetCents > 0
                  ? Math.min(
                      100,
                      Math.round((goal.currentCents / goal.targetCents) * 100),
                    )
                  : 0;
              const history = transfers
                .filter((t) => t.savingsId === goal.id)
                .slice(0, 6)
                .map((t) => ({
                  id: t.id,
                  amountCents: t.amountCents,
                  transferredOn: t.transferredOn,
                  note: t.note,
                }));

              return (
                <li key={goal.id}>
                  <article className="notebook-sheet px-5 py-5 sm:px-6">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(14rem,18rem)] lg:items-start">
                      <div>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink">
                              Goal
                            </p>
                            <p className="mt-1 text-lg font-semibold">
                              {goal.name}
                            </p>
                            <p className="mt-2 text-sm text-ink">
                              <span className="display text-3xl text-brand">
                                <Money cents={goal.currentCents} />
                              </span>
                              <span className="mx-1.5">of</span>
                              <Money cents={goal.targetCents} />
                            </p>
                          </div>
                          <ConfirmDeleteForm
                            action={deleteSavings}
                            itemName={goal.name}
                            buttonClassName="text-sm text-danger underline-offset-2 hover:underline"
                            confirmLabel="This removes the goal and its transfer history."
                          >
                            <input type="hidden" name="id" value={goal.id} />
                          </ConfirmDeleteForm>
                        </div>

                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-rule">
                          <div
                            className="h-full rounded-full bg-safe"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="mt-1.5 text-xs text-ink">
                          {pct}% ·{" "}
                          <Money
                            cents={goal.contributionPerPeriodCents}
                            className="font-medium"
                          />{" "}
                          each check-in
                        </p>

                        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
                          <details>
                            <summary className="cursor-pointer font-medium text-brand underline-offset-2 hover:underline">
                              Add money
                            </summary>
                            <div className="mt-3 max-w-sm">
                              <SavingsTransferForm
                                savingsId={goal.id}
                                direction="deposit"
                              />
                            </div>
                          </details>
                          <details>
                            <summary className="cursor-pointer font-medium text-brand underline-offset-2 hover:underline">
                              Edit goal
                            </summary>
                            <div className="mt-3 max-w-sm">
                              <SavingsForm
                                forcedKind="goal"
                                submitLabel="Update goal"
                                initial={{
                                  id: goal.id,
                                  name: goal.name,
                                  kind: "goal",
                                  target: (goal.targetCents / 100).toFixed(2),
                                  current: (goal.currentCents / 100).toFixed(2),
                                  contribution: (
                                    goal.contributionPerPeriodCents / 100
                                  ).toFixed(2),
                                }}
                              />
                            </div>
                          </details>
                        </div>
                      </div>

                      <div className="border-t border-rule pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
                        <p className="mb-2 text-xs font-medium uppercase tracking-[0.12em] text-ink">
                          Recent
                        </p>
                        <ActivityList transfers={history} />
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
