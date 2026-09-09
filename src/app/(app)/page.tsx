import { desc } from "drizzle-orm";
import { BillsThisMonth } from "@/components/bills-this-month";
import { LogPaycheckButton } from "@/components/log-paycheck-button";
import { MoneySplitChart } from "@/components/money-split-chart";
import { PaydayChecklist } from "@/components/payday-checklist";
import { Money, PageHeader, Panel } from "@/components/ui";
import { getDb, hasDatabase } from "@/db";
import {
  accounts,
  billPayments,
  bills,
  incomeSources,
  paycheckLogs,
  savingsGoals,
  savingsTransfers,
  transactions,
} from "@/db/schema";
import {
  billsForMonth,
  computeMoneySplit,
  monthBounds,
  type Cadence,
} from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  if (!hasDatabase()) {
    return (
      <div>
        <PageHeader
          title="Dashboard"
          description="Connect Neon to store your budget data."
        />
        <Panel>
          <p className="text-ink-muted">
            Copy <code className="text-brand">.env.example</code> to{" "}
            <code className="text-brand">.env.local</code>, set{" "}
            <code className="text-brand">DATABASE_URL</code>,{" "}
            <code className="text-brand">APP_PIN</code>, and{" "}
            <code className="text-brand">SESSION_SECRET</code>, then run{" "}
            <code className="text-brand">npm run db:push</code> and{" "}
            <code className="text-brand">npm run db:seed</code>.
          </p>
        </Panel>
      </div>
    );
  }

  const db = getDb();
  const [incomes, billRows, goals, txs, accountRows, logs, payments] =
    await Promise.all([
      db.select().from(incomeSources),
      db.select().from(bills),
      db.select().from(savingsGoals),
      db.select().from(transactions).orderBy(desc(transactions.date)).limit(200),
      db.select().from(accounts),
      db.select().from(paycheckLogs),
      db.select().from(billPayments),
    ]);

  let transfers: (typeof savingsTransfers.$inferSelect)[] = [];
  try {
    transfers = await db.select().from(savingsTransfers);
  } catch {
    transfers = [];
  }

  const split = computeMoneySplit(
    incomes.map((i) => ({
      ...i,
      cadence: i.cadence as Cadence,
    })),
    billRows.map((b) => ({
      ...b,
      cadence: b.cadence as Cadence,
    })),
    goals,
    txs,
    new Date(),
    logs,
  );

  const { label: monthLabel } = monthBounds();
  const monthlyBills = billsForMonth(
    billRows.map((b) => ({
      ...b,
      cadence: b.cadence as Cadence,
    })),
    payments,
  );

  const paid = new Set(payments.map((p) => `${p.billId}:${p.dueDate}`));
  const incomeNameById = new Map(incomes.map((i) => [i.id, i.name]));
  const incomeColorById = new Map(incomes.map((i) => [i.id, i.colorKey]));
  const unpaidInWindow = split.billsDue
    .filter((b) => !paid.has(`${b.billId}:${b.date}`))
    .map((b) => ({
      ...b,
      incomeName: b.incomeSourceId
        ? incomeNameById.get(b.incomeSourceId) ?? null
        : null,
      incomeColorKey: b.incomeSourceId
        ? incomeColorById.get(b.incomeSourceId) ?? null
        : null,
    }));

  const fundingJobs = split.incomeByJob
    .filter((j) => j.fundsWindow)
    .map((j) => ({
      ...j,
      colorKey: incomeColorById.get(j.id) ?? null,
    }));
  const savingsItems = goals.map((g) => {
    const plannedCents = g.contributionPerPeriodCents;
    const movedThisWindow = transfers.some(
      (t) =>
        t.savingsId === g.id &&
        t.amountCents > 0 &&
        t.transferredOn >= split.periodStart &&
        t.transferredOn <= split.periodEnd,
    );
    return {
      id: g.id,
      name: g.name,
      kind: (g.kind === "fund" ? "fund" : "goal") as "goal" | "fund",
      plannedCents,
      movedThisWindow,
    };
  });

  const jobOptions = incomes.map((i) => ({
    id: i.id,
    name: i.name,
    nextPayday: i.nextPayday,
    colorKey: i.colorKey,
  }));

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="How this paycheck window is splitting across bills, savings, and spending."
        action={
          <LogPaycheckButton
            jobs={jobOptions}
          />
        }
      />

      <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(16rem,20rem)_1fr] lg:items-start">
        <PaydayChecklist
          jobs={jobOptions}
          fundingJobs={fundingJobs}
          unpaidBills={unpaidInWindow}
          savingsItems={savingsItems}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Panel className="!p-4">
            <p className="text-sm font-medium text-safe">Safe to spend</p>
            <p
              className={`mt-2 display text-3xl ${
                split.safeToSpendCents < 0 ? "text-danger" : "text-safe"
              }`}
            >
              <Money cents={split.safeToSpendCents} />
            </p>
            <p className="mt-2 text-sm text-ink">
              {split.daysLeft === 0
                ? "Last day of this window"
                : split.daysLeft === 1
                  ? "1 day left in this window"
                  : `${split.daysLeft} days left in this window`}
            </p>
            {split.incomeCents === 0 ? (
              <p className="mt-2 text-sm text-ink">
                Log this paycheck to unlock a real number.
              </p>
            ) : split.safeToSpendCents < 0 ? (
              <p className="mt-2 text-sm text-danger">
                Plans exceed income — trim bills/savings or log more pay.
              </p>
            ) : null}
          </Panel>
          <Panel className="!p-4">
            <h2 className="display text-lg text-brand">Credit balances</h2>
            <ul className="mt-3 space-y-2.5">
              {accountRows.length === 0 ? (
                <li className="text-sm text-ink">
                  Connect a card on Accounts
                </li>
              ) : (
                accountRows.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <span className="min-w-0 truncate">
                      {a.name}
                      {a.mask ? (
                        <span className="text-ink-muted"> ···{a.mask}</span>
                      ) : null}
                    </span>
                    <span className="shrink-0 font-medium">
                      {a.balanceCurrent
                        ? `$${Number(a.balanceCurrent).toFixed(2)}`
                        : "—"}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </Panel>
        </div>
      </div>

      <MoneySplitChart
        split={split}
        jobs={jobOptions}
      />

      <BillsThisMonth
        monthLabel={monthLabel}
        bills={monthlyBills}
        incomes={incomes.map((i) => ({
          id: i.id,
          name: i.name,
          colorKey: i.colorKey,
        }))}
      />
    </div>
  );
}
