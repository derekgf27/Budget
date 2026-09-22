import { desc } from "drizzle-orm";
import Link from "next/link";
import { HomeAlerts } from "@/components/habit-alerts";
import { LogPaycheckButton } from "@/components/log-paycheck-button";
import { MoneySplitChart } from "@/components/money-split-chart";
import { MonthChecklist } from "@/components/month-checklist";
import {
  MonthPicker,
  dateFromMonthKey,
  resolveMonthKey,
} from "@/components/month-picker";
import { Money, PageHeader, Panel } from "@/components/ui";
import { getDb, hasDatabase } from "@/db";
import {
  accounts,
  billPayments,
  bills,
  categories,
  incomeSources,
  paycheckLogs,
  savingsGoals,
  savingsTransfers,
  transactions,
} from "@/db/schema";
import {
  getCategoryGuardrails,
  getPaydayReminders,
  getSafeSpendGuardrail,
} from "@/lib/habits";
import { computeMoneySplit, type Cadence } from "@/lib/money";
import { accountLabel, formatImportedAt, visibleAccounts } from "@/lib/accounts";

export const dynamic = "force-dynamic";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<{ month?: string }>;
}) {
  if (!hasDatabase()) {
    return (
      <div>
        <PageHeader
          title="Home"
          description="Connect Neon to store your budget data."
        />
        <Panel>
          <p className="text-ink-muted">
            Copy <code className="text-brand">.env.example</code> to{" "}
            <code className="text-brand">.env.local</code>, set{" "}
            <code className="text-brand">DATABASE_URL</code>, then run{" "}
            <code className="text-brand">npm run db:push</code> and{" "}
            <code className="text-brand">npm run db:seed</code>.
          </p>
        </Panel>
      </div>
    );
  }

  const params = (await searchParams) || {};
  const monthKeyParam = resolveMonthKey(params.month);
  const viewDate = dateFromMonthKey(monthKeyParam);
  const db = getDb();

  const { tidyTransactionsForSpend } = await import("@/lib/spend-tidy");
  await tidyTransactionsForSpend();

  const [incomes, billRows, goals, txs, accountRows, logs, payments, cats] =
    await Promise.all([
      db.select().from(incomeSources),
      db.select().from(bills),
      db.select().from(savingsGoals),
      db
        .select()
        .from(transactions)
        .orderBy(desc(transactions.date)),
      db.select().from(accounts),
      db.select().from(paycheckLogs),
      db.select().from(billPayments),
      db.select().from(categories),
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
    viewDate,
    logs,
  );

  const paid = new Set(payments.map((p) => `${p.billId}:${p.dueDate}`));
  const incomeNameById = new Map(incomes.map((i) => [i.id, i.name]));
  const incomeColorById = new Map(incomes.map((i) => [i.id, i.colorKey]));

  const unpaidThisMonth = split.billsDue
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

  const savingsItems = goals.map((g) => {
    const plannedCents = g.contributionPerPeriodCents;
    const movedThisHalf = transfers.some(
      (t) =>
        t.savingsId === g.id &&
        t.amountCents > 0 &&
        t.transferredOn >= split.halfStart &&
        t.transferredOn <= split.halfEnd,
    );
    return {
      id: g.id,
      name: g.name,
      kind: (g.kind === "fund" ? "fund" : "goal") as "goal" | "fund",
      plannedCents,
      movedThisHalf,
    };
  });

  const uncategorizedCount = txs.filter(
    (t) =>
      !t.excluded &&
      !t.categoryId &&
      t.amountCents > 0 &&
      t.date >= split.periodStart &&
      t.date <= split.periodEnd,
  ).length;

  const jobOptions = incomes.map((i) => ({
    id: i.id,
    name: i.name,
    nextPayday: i.nextPayday,
    colorKey: i.colorKey,
  }));

  const monthKey = monthKeyParam;
  const loggedJobIdsThisMonth = new Set(
    logs
      .filter((l) => l.paidOn.startsWith(monthKey))
      .map((l) => l.incomeSourceId),
  );
  const paydayReminders = getPaydayReminders(
    incomes.map((i) => ({
      id: i.id,
      name: i.name,
      nextPayday: i.nextPayday,
      cadence: i.cadence as Cadence,
    })),
    loggedJobIdsThisMonth,
    viewDate,
  );

  const spentByCategoryId = new Map<string, number>();
  for (const t of txs) {
    if (
      t.excluded ||
      !t.categoryId ||
      t.amountCents <= 0 ||
      t.date < split.periodStart ||
      t.date > split.periodEnd
    ) {
      continue;
    }
    spentByCategoryId.set(
      t.categoryId,
      (spentByCategoryId.get(t.categoryId) ?? 0) + t.amountCents,
    );
  }
  const categoryGuardrails = getCategoryGuardrails(cats, spentByCategoryId);
  const safeGuardrail = getSafeSpendGuardrail(
    split.safeToSpendCents,
    split.daysLeft,
  );

  const accountRowsVisible = visibleAccounts(accountRows);
  const hasAccounts = accountRowsVisible.length > 0;
  const importDone = accountRowsVisible.some((a) => {
    if (!a.lastImportedAt) return false;
    const d =
      a.lastImportedAt instanceof Date
        ? a.lastImportedAt
        : new Date(a.lastImportedAt);
    if (Number.isNaN(d.getTime())) return false;
    return d.toISOString().slice(0, 10) >= split.halfStart;
  });

  return (
    <div>
      <PageHeader
        title={split.monthLabel}
        description={`${split.halfLabel} check-in · import, categorize, bills, savings.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <MonthPicker monthKey={monthKey} basePath="/" />
            <LogPaycheckButton jobs={jobOptions} />
          </div>
        }
      />

      {/* Two notebook pages side by side on wide screens */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          <section className="notebook-sheet notebook-margin px-5 py-6 sm:px-7">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-ink-muted">
              Safe to spend
            </p>
            <p
              className={`display mt-2 text-5xl tracking-tight sm:text-6xl ${
                split.safeToSpendCents < 0 ? "text-danger" : "text-safe"
              }`}
            >
              <Money cents={split.safeToSpendCents} />
            </p>
            <p className="mt-3 text-sm text-ink-muted">
              {split.daysLeft === 0
                ? "Last day of the month"
                : split.daysLeft === 1
                  ? "1 day left this month"
                  : `${split.daysLeft} days left this month`}
            </p>
            {split.incomeCents === 0 ? (
              <p className="mt-2 text-sm text-ink">
                Log paychecks this month to unlock a real number.
              </p>
            ) : split.safeToSpendCents < 0 ? (
              <p className="mt-2 text-sm text-danger">
                Plans exceed income — trim bills/savings or log more pay.
              </p>
            ) : null}
          </section>

          <MonthChecklist
            halfLabel={split.halfLabel}
            importDone={importDone}
            hasAccounts={hasAccounts}
            uncategorizedCount={uncategorizedCount}
            unpaidBills={unpaidThisMonth}
            savingsItems={savingsItems}
          />
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <MoneySplitChart
            split={split}
            jobs={jobOptions}
            monthLabel={split.monthLabel}
          />

          <section className="notebook-sheet px-5 py-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
                Balances
              </p>
              <Link
                href="/accounts"
                className="text-xs text-ink-muted underline-offset-2 hover:underline"
              >
                Accounts
              </Link>
            </div>
            <p className="mt-1 text-[11px] text-ink-muted">
              Snapshot from last import — not live.
            </p>
            {accountRowsVisible.length === 0 ? (
              <p className="mt-2 text-sm text-ink-muted">
                Import a statement on Accounts.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {accountRowsVisible.map((a) => {
                  const imported = formatImportedAt(a.lastImportedAt);
                  return (
                    <li
                      key={a.id}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-ink-muted">
                          {accountLabel(a)}
                        </span>
                        {imported ? (
                          <span className="block text-[11px] text-ink-muted/80">
                            As of {imported}
                          </span>
                        ) : null}
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {a.balanceCurrent != null && a.balanceCurrent !== ""
                          ? `$${Number(a.balanceCurrent).toFixed(2)}`
                          : "—"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </div>

      <HomeAlerts
        reminders={paydayReminders}
        jobs={jobOptions}
        safe={safeGuardrail}
        categories={categoryGuardrails}
        monthKey={monthKey}
      />
    </div>
  );
}
