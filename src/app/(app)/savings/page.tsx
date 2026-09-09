import { desc } from "drizzle-orm";
import { deleteSavings } from "@/app/actions";
import { AddSavingsButton } from "@/components/add-savings-button";
import { FundActions } from "@/components/fund-actions";
import { ItemTabs } from "@/components/item-tabs";
import { SavingsForm } from "@/components/savings-form";
import { SavingsTransferForm } from "@/components/savings-transfer-form";
import {
  Money,
  PageHeader,
  Panel,
  buttonDangerClass,
} from "@/components/ui";
import { getDb, hasDatabase } from "@/db";
import { savingsGoals, savingsTransfers } from "@/db/schema";

export const dynamic = "force-dynamic";

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

  return (
    <div>
      <PageHeader
        title="Savings"
        description="Fund pot for anytime deposits, plus goals with targets."
        action={<AddSavingsButton />}
      />

      <div className="space-y-8">
        <section>
          <h2 className="display mb-4 text-xl text-brand">Fund pot</h2>
          {funds.length === 0 ? (
            <Panel>
              <p className="text-lg font-medium">No fund yet</p>
              <p className="mt-1 text-sm text-ink-muted">
                Create a fund pot so you can drop in any amount whenever you
                want.
              </p>
              <div className="mt-4">
                <AddSavingsButton />
              </div>
            </Panel>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {funds.map((fund) => {
                const history = transfers
                  .filter((t) => t.savingsId === fund.id)
                  .map((t) => ({
                    id: t.id,
                    amountCents: t.amountCents,
                    transferredOn: t.transferredOn,
                    note: t.note,
                  }));

                return (
                  <li key={fund.id}>
                    <Panel className="h-full">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                            Fund
                          </p>
                          <p className="text-lg font-medium">{fund.name}</p>
                          <p className="mt-1 text-3xl font-medium text-safe">
                            <Money cents={fund.currentCents} />
                          </p>
                        </div>
                        <form action={deleteSavings}>
                          <input type="hidden" name="id" value={fund.id} />
                          <button type="submit" className={buttonDangerClass}>
                            Delete
                          </button>
                        </form>
                      </div>

                      <ItemTabs
                        transfers={history}
                        overview={
                          <>
                            <FundActions
                              savingsId={fund.id}
                              name={fund.name}
                              balanceCents={fund.currentCents}
                            />
                            <details className="mt-3 text-sm">
                              <summary className="cursor-pointer text-brand-soft hover:underline">
                                Edit fund
                              </summary>
                              <div className="mt-3 rounded-lg border border-line bg-white/70 p-3">
                                <SavingsForm
                                  forcedKind="fund"
                                  submitLabel="Update fund"
                                  initial={{
                                    id: fund.id,
                                    name: fund.name,
                                    kind: "fund",
                                    current: (fund.currentCents / 100).toFixed(
                                      2,
                                    ),
                                  }}
                                />
                              </div>
                            </details>
                          </>
                        }
                      />
                    </Panel>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <h2 className="display mb-4 text-xl text-brand">Goals</h2>
          {goals.length === 0 ? (
            <Panel>
              <p className="text-sm text-ink-muted">
                No goals yet. Add one if you want a target and planned
                contribution each paycheck window.
              </p>
            </Panel>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {goals.map((goal) => {
                const pct =
                  goal.targetCents > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (goal.currentCents / goal.targetCents) * 100,
                        ),
                      )
                    : 0;
                const history = transfers
                  .filter((t) => t.savingsId === goal.id)
                  .map((t) => ({
                    id: t.id,
                    amountCents: t.amountCents,
                    transferredOn: t.transferredOn,
                    note: t.note,
                  }));

                return (
                  <li key={goal.id}>
                    <Panel className="h-full">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium uppercase tracking-wide text-ink-muted">
                            Goal
                          </p>
                          <p className="text-lg font-medium">{goal.name}</p>
                          <p className="mt-0.5 text-sm text-ink-muted">
                            <Money cents={goal.currentCents} /> /{" "}
                            <Money cents={goal.targetCents} />
                          </p>
                        </div>
                        <form action={deleteSavings}>
                          <input type="hidden" name="id" value={goal.id} />
                          <button type="submit" className={buttonDangerClass}>
                            Delete
                          </button>
                        </form>
                      </div>

                      <ItemTabs
                        transfers={history}
                        overview={
                          <>
                            <p className="text-sm">
                              Setting aside{" "}
                              <Money
                                cents={goal.contributionPerPeriodCents}
                                className="font-medium"
                              />{" "}
                              each window
                            </p>
                            <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
                              <div
                                className="h-full rounded-full bg-accent"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <div className="mt-3 space-y-2 text-sm">
                              <details className="group w-full">
                                <summary className="cursor-pointer text-brand-soft hover:underline">
                                  Add money
                                </summary>
                                <div className="mt-3 rounded-lg border border-line bg-white/70 p-3">
                                  <SavingsTransferForm
                                    savingsId={goal.id}
                                    direction="deposit"
                                  />
                                </div>
                              </details>
                              <details className="group w-full">
                                <summary className="cursor-pointer text-brand-soft hover:underline">
                                  Edit goal
                                </summary>
                                <div className="mt-3 rounded-lg border border-line bg-white/70 p-3">
                                  <SavingsForm
                                    forcedKind="goal"
                                    submitLabel="Update goal"
                                    initial={{
                                      id: goal.id,
                                      name: goal.name,
                                      kind: "goal",
                                      target: (goal.targetCents / 100).toFixed(
                                        2,
                                      ),
                                      current: (
                                        goal.currentCents / 100
                                      ).toFixed(2),
                                      contribution: (
                                        goal.contributionPerPeriodCents / 100
                                      ).toFixed(2),
                                    }}
                                  />
                                </div>
                              </details>
                            </div>
                          </>
                        }
                      />
                    </Panel>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
