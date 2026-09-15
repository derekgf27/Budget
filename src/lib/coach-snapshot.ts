import { desc } from "drizzle-orm";
import { getDb } from "@/db";
import {
  billPayments,
  bills,
  categories,
  incomeSources,
  paycheckLogs,
  savingsGoals,
  transactions,
} from "@/db/schema";
import {
  centsToDollars,
  computeMoneySplit,
  type Cadence,
} from "@/lib/money";

export type CoachSnapshot = {
  monthKey: string;
  monthLabel: string;
  halfLabel: string;
  daysLeft: number;
  incomeCents: number;
  billsCents: number;
  savingsCents: number;
  spentCents: number;
  safeToSpendCents: number;
  incomeByJob: {
    name: string;
    amountCents: number;
    logged: boolean;
  }[];
  categories: {
    name: string;
    spentCents: number;
    limitCents: number;
    pct: number;
  }[];
  topMerchants: {
    name: string;
    amountCents: number;
    count: number;
  }[];
  unpaidBills: { name: string; amountCents: number; date: string }[];
  uncategorizedCount: number;
  priorMonth?: {
    monthLabel: string;
    incomeCents: number;
    spentCents: number;
    safeToSpendCents: number;
  };
};

function monthKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function dateFromMonthKey(monthKey: string): Date {
  const [y, m] = monthKey.split("-").map(Number);
  return new Date(y, m - 1, 15);
}

function priorMonthKey(monthKey: string): string {
  const d = dateFromMonthKey(monthKey);
  return monthKeyFromDate(new Date(d.getFullYear(), d.getMonth() - 1, 15));
}

/**
 * Build a compact, number-heavy snapshot for the coach.
 * Only fields the model is allowed to reason about.
 */
export async function buildCoachSnapshot(
  monthKey: string,
): Promise<CoachSnapshot> {
  const db = getDb();
  const viewDate = dateFromMonthKey(monthKey);

  const [incomes, billRows, goals, txs, logs, payments, cats] =
    await Promise.all([
      db.select().from(incomeSources),
      db.select().from(bills),
      db.select().from(savingsGoals),
      db.select().from(transactions).orderBy(desc(transactions.date)),
      db.select().from(paycheckLogs),
      db.select().from(billPayments),
      db.select().from(categories),
    ]);

  const incomeInputs = incomes.map((i) => ({
    ...i,
    cadence: i.cadence as Cadence,
  }));
  const billInputs = billRows.map((b) => ({
    ...b,
    cadence: b.cadence as Cadence,
  }));

  const split = computeMoneySplit(
    incomeInputs,
    billInputs,
    goals,
    txs,
    viewDate,
    logs,
  );

  const spentByCategoryId = new Map<string, number>();
  const merchantTotals = new Map<string, { amountCents: number; count: number }>();

  for (const t of txs) {
    if (
      t.excluded ||
      t.amountCents <= 0 ||
      t.date < split.periodStart ||
      t.date > split.periodEnd
    ) {
      continue;
    }
    if (t.categoryId) {
      spentByCategoryId.set(
        t.categoryId,
        (spentByCategoryId.get(t.categoryId) ?? 0) + t.amountCents,
      );
    }
    const merchant = (t.merchantName || t.name || "Unknown").trim();
    const prev = merchantTotals.get(merchant) ?? { amountCents: 0, count: 0 };
    merchantTotals.set(merchant, {
      amountCents: prev.amountCents + t.amountCents,
      count: prev.count + 1,
    });
  }

  const categoryRows = cats
    .map((c) => {
      const spent = spentByCategoryId.get(c.id) ?? 0;
      const limit = c.monthlyLimitCents;
      return {
        name: c.name,
        spentCents: spent,
        limitCents: limit,
        pct: limit > 0 ? Math.round((spent / limit) * 100) : 0,
      };
    })
    .filter((c) => c.spentCents > 0 || c.limitCents > 0)
    .sort((a, b) => b.spentCents - a.spentCents);

  const topMerchants = [...merchantTotals.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.amountCents - a.amountCents)
    .slice(0, 8);

  const paid = new Set(payments.map((p) => `${p.billId}:${p.dueDate}`));
  const unpaidBills = split.billsDue
    .filter((b) => !paid.has(`${b.billId}:${b.date}`))
    .map((b) => ({
      name: b.name,
      amountCents: b.amountCents,
      date: b.date,
    }));

  const uncategorizedCount = txs.filter(
    (t) =>
      !t.excluded &&
      !t.categoryId &&
      t.amountCents > 0 &&
      t.date >= split.periodStart &&
      t.date <= split.periodEnd,
  ).length;

  const priorKey = priorMonthKey(monthKey);
  const priorDate = dateFromMonthKey(priorKey);
  const priorSplit = computeMoneySplit(
    incomeInputs,
    billInputs,
    goals,
    txs,
    priorDate,
    logs,
  );

  return {
    monthKey,
    monthLabel: split.monthLabel,
    halfLabel: split.halfLabel,
    daysLeft: split.daysLeft,
    incomeCents: split.incomeCents,
    billsCents: split.billsCents,
    savingsCents: split.savingsCents,
    spentCents: split.spentCents,
    safeToSpendCents: split.safeToSpendCents,
    incomeByJob: split.incomeByJob
      .filter((j) => j.fundsWindow)
      .map((j) => ({
        name: j.name,
        amountCents: j.amountCents,
        logged: j.logged,
      })),
    categories: categoryRows,
    topMerchants,
    unpaidBills,
    uncategorizedCount,
    priorMonth: {
      monthLabel: priorSplit.monthLabel,
      incomeCents: priorSplit.incomeCents,
      spentCents: priorSplit.spentCents,
      safeToSpendCents: priorSplit.safeToSpendCents,
    },
  };
}

/** Flatten snapshot to plain text the model must ground every tip in. */
export function formatSnapshotForPrompt(s: CoachSnapshot): string {
  const $ = centsToDollars;
  const lines: string[] = [
    `Month: ${s.monthLabel} (${s.halfLabel} check-in, ${s.daysLeft} days left)`,
    `Income logged: ${$(s.incomeCents)}`,
    `Bills reserved: ${$(s.billsCents)}`,
    `Savings planned (both check-ins): ${$(s.savingsCents)}`,
    `Already spent: ${$(s.spentCents)}`,
    `Left (safe to spend): ${$(s.safeToSpendCents)}`,
  ];

  if (s.incomeByJob.length) {
    lines.push("Paychecks:");
    for (const j of s.incomeByJob) {
      lines.push(
        j.logged
          ? `  - ${j.name}: ${$(j.amountCents)} (logged)`
          : `  - ${j.name}: not logged yet (estimate ${$(j.amountCents)})`,
      );
    }
  }

  if (s.categories.length) {
    lines.push("Categories (spent / limit):");
    for (const c of s.categories) {
      lines.push(
        `  - ${c.name}: ${$(c.spentCents)} / ${$(c.limitCents)} (${c.pct}%)`,
      );
    }
  }

  if (s.topMerchants.length) {
    lines.push("Top merchants this month:");
    for (const m of s.topMerchants) {
      lines.push(
        `  - ${m.name}: ${$(m.amountCents)} across ${m.count} charge(s)`,
      );
    }
  }

  if (s.unpaidBills.length) {
    lines.push("Unpaid bills still due:");
    for (const b of s.unpaidBills) {
      lines.push(`  - ${b.name}: ${$(b.amountCents)} due ${b.date}`);
    }
  }

  if (s.uncategorizedCount > 0) {
    lines.push(`Uncategorized spend transactions: ${s.uncategorizedCount}`);
  }

  if (s.priorMonth) {
    lines.push(
      `Prior month (${s.priorMonth.monthLabel}): income ${$(s.priorMonth.incomeCents)}, spent ${$(s.priorMonth.spentCents)}, left ${$(s.priorMonth.safeToSpendCents)}`,
    );
  }

  return lines.join("\n");
}
