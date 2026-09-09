export type Cadence = "weekly" | "biweekly" | "semimonthly" | "monthly" | "yearly";

export function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Display ISO YYYY-MM-DD as MM/DD/YYYY. */
export function formatDisplayDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const [, y, m, d] = match;
    return `${m}/${d}/${y}`;
  }
  const parsed = new Date(iso);
  if (!Number.isNaN(parsed.getTime())) {
    const m = String(parsed.getMonth() + 1).padStart(2, "0");
    const d = String(parsed.getDate()).padStart(2, "0");
    const y = parsed.getFullYear();
    return `${m}/${d}/${y}`;
  }
  return iso;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function centsToDollars(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}

export function dollarsToCents(value: string | number): number {
  const n = typeof value === "number" ? value : Number(value.replace(/[$,]/g, ""));
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function nextOccurrence(date: Date, cadence: Cadence): Date {
  switch (cadence) {
    case "weekly":
      return addDays(date, 7);
    case "biweekly":
      return addDays(date, 14);
    case "semimonthly": {
      const day = date.getDate();
      if (day < 15) {
        return new Date(date.getFullYear(), date.getMonth(), 15);
      }
      return new Date(date.getFullYear(), date.getMonth() + 1, 1);
    }
    case "monthly":
      return new Date(date.getFullYear(), date.getMonth() + 1, date.getDate());
    case "yearly":
      return new Date(date.getFullYear() + 1, date.getMonth(), date.getDate());
    default:
      return addDays(date, 14);
  }
}

export function previousOccurrence(date: Date, cadence: Cadence): Date {
  switch (cadence) {
    case "weekly":
      return addDays(date, -7);
    case "biweekly":
      return addDays(date, -14);
    case "semimonthly": {
      const day = date.getDate();
      if (day > 1 && day <= 15) {
        return new Date(date.getFullYear(), date.getMonth(), 1);
      }
      // on/after 16th or on the 1st → go to prior 15th
      if (day === 1) {
        return new Date(date.getFullYear(), date.getMonth() - 1, 15);
      }
      return new Date(date.getFullYear(), date.getMonth(), 15);
    }
    case "monthly":
      return new Date(date.getFullYear(), date.getMonth() - 1, date.getDate());
    case "yearly":
      return new Date(date.getFullYear() - 1, date.getMonth(), date.getDate());
    default:
      return addDays(date, -14);
  }
}

/** Move schedule forward until on or after `from`. */
export function advanceToOnOrAfter(
  startIso: string,
  cadence: Cadence,
  from: Date,
): string {
  let cursor = parseDate(startIso);
  let guard = 0;
  while (cursor < from && guard < 500) {
    cursor = nextOccurrence(cursor, cadence);
    guard += 1;
  }
  return formatDate(cursor);
}

/** Most recent occurrence on or before `from`. */
export function retreatToOnOrBefore(
  startIso: string,
  cadence: Cadence,
  from: Date,
): string {
  let cursor = parseDate(advanceToOnOrAfter(startIso, cadence, from));
  if (cursor > from) {
    cursor = previousOccurrence(cursor, cadence);
  }
  return formatDate(cursor);
}

export function occurrencesInRange(
  startIso: string,
  cadence: Cadence,
  rangeStart: Date,
  rangeEnd: Date,
): string[] {
  const dates: string[] = [];
  let cursor = parseDate(advanceToOnOrAfter(startIso, cadence, rangeStart));
  let guard = 0;
  while (cursor <= rangeEnd && guard < 100) {
    if (cursor >= rangeStart) {
      dates.push(formatDate(cursor));
    }
    cursor = nextOccurrence(cursor, cadence);
    guard += 1;
  }
  return dates;
}

export type IncomeInput = {
  id: string;
  name: string;
  netAmountCents: number;
  cadence: Cadence;
  nextPayday: string;
};

export type PaycheckLogInput = {
  incomeSourceId: string;
  paidOn: string;
  amountCents: number;
};

export type BillInput = {
  id: string;
  name: string;
  amountCents: number;
  cadence: Cadence;
  nextDueDate: string;
  incomeSourceId?: string | null;
};

export type BillPaymentInput = {
  billId: string;
  dueDate: string;
};

export type BillMonthStatus = "paid" | "upcoming" | "overdue";

export type BillThisMonth = {
  billId: string;
  name: string;
  date: string;
  amountCents: number;
  status: BillMonthStatus;
  incomeSourceId?: string | null;
};

export function monthBounds(today = new Date()): {
  start: Date;
  end: Date;
  label: string;
} {
  const start = new Date(today.getFullYear(), today.getMonth(), 1);
  const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const label = today.toLocaleString("en-US", { month: "long", year: "numeric" });
  return { start, end, label };
}

export function billsForMonth(
  bills: BillInput[],
  payments: BillPaymentInput[],
  today = new Date(),
): BillThisMonth[] {
  const { start, end } = monthBounds(today);
  const todayIso = formatDate(
    new Date(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  const paid = new Set(payments.map((p) => `${p.billId}:${p.dueDate}`));
  const rows: BillThisMonth[] = [];

  for (const bill of bills) {
    const dues = occurrencesInRange(
      bill.nextDueDate,
      bill.cadence,
      start,
      end,
    );
    for (const date of dues) {
      let status: BillMonthStatus;
      if (paid.has(`${bill.id}:${date}`)) {
        status = "paid";
      } else if (date < todayIso) {
        status = "overdue";
      } else {
        status = "upcoming";
      }
      rows.push({
        billId: bill.id,
        name: bill.name,
        date,
        amountCents: bill.amountCents,
        status,
        incomeSourceId: bill.incomeSourceId ?? null,
      });
    }
  }

  const order: Record<BillMonthStatus, number> = {
    overdue: 0,
    upcoming: 1,
    paid: 2,
  };
  rows.sort((a, b) => {
    const byStatus = order[a.status] - order[b.status];
    if (byStatus !== 0) return byStatus;
    return a.date.localeCompare(b.date);
  });
  return rows;
}

export type SavingsInput = {
  id: string;
  name: string;
  contributionPerPeriodCents: number;
};

export type TxInput = {
  date: string;
  amountCents: number;
  excluded: boolean;
};

export type MoneySplit = {
  periodStart: string;
  periodEnd: string;
  daysLeft: number;
  incomeCents: number;
  billsCents: number;
  savingsCents: number;
  spentCents: number;
  safeToSpendCents: number;
  incomeByJob: {
    id: string;
    name: string;
    payday: string;
    amountCents: number;
    logged: boolean;
    fundsWindow: boolean;
  }[];
  drivers: { label: string; amountCents?: number; tone: "neutral" | "warn" | "good" }[];
  upcomingPaydays: {
    id: string;
    name: string;
    date: string;
    amountCents: number;
  }[];
  billsDue: {
    billId: string;
    name: string;
    date: string;
    amountCents: number;
    incomeSourceId?: string | null;
  }[];
};

function daysBetween(from: Date, to: Date): number {
  const ms = parseDate(formatDate(to)).getTime() - parseDate(formatDate(from)).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Current paycheck window:
 * start = most recent payday on/before today (across jobs)
 * end   = soonest payday after today (across jobs)
 */
export function computeMoneySplit(
  incomes: IncomeInput[],
  bills: BillInput[],
  savings: SavingsInput[],
  transactions: TxInput[],
  today = new Date(),
  paycheckLogs: PaycheckLogInput[] = [],
): MoneySplit {
  const todayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );

  if (incomes.length === 0) {
    const empty = formatDate(todayStart);
    return {
      periodStart: empty,
      periodEnd: empty,
      daysLeft: 0,
      incomeCents: 0,
      billsCents: 0,
      savingsCents: 0,
      spentCents: 0,
      safeToSpendCents: 0,
      incomeByJob: [],
      drivers: [
        {
          label: "Add a job to start tracking this window",
          tone: "warn",
        },
      ],
      upcomingPaydays: [],
      billsDue: [],
    };
  }

  const schedules = incomes.map((inc) => {
    const lastIso = retreatToOnOrBefore(inc.nextPayday, inc.cadence, todayStart);
    const nextIso = advanceToOnOrAfter(
      inc.nextPayday,
      inc.cadence,
      addDays(todayStart, 1),
    );
    return { income: inc, lastIso, nextIso };
  });

  const periodStart = schedules
    .map((s) => s.lastIso)
    .sort()
    .at(-1)!;
  const periodEnd = schedules.map((s) => s.nextIso).sort()[0]!;

  const periodStartDate = parseDate(periodStart);
  const periodEndDate = parseDate(periodEnd);
  const daysLeft = daysBetween(todayStart, periodEndDate);

  function logFor(incomeId: string, date: string) {
    return paycheckLogs.find(
      (l) => l.incomeSourceId === incomeId && l.paidOn === date,
    );
  }

  function amountFor(incomeId: string, date: string, fallback: number) {
    const log = logFor(incomeId, date);
    return log ? log.amountCents : fallback;
  }

  const incomeByJob = schedules.map((s) => {
    const log = logFor(s.income.id, s.lastIso);
    const fundsWindow = s.lastIso === periodStart;
    return {
      id: s.income.id,
      name: s.income.name,
      payday: s.lastIso,
      amountCents: log ? log.amountCents : s.income.netAmountCents,
      logged: Boolean(log),
      fundsWindow,
    };
  });

  // Income that funded this window: paycheck(s) on periodStart
  const incomeCents = incomeByJob
    .filter((j) => j.fundsWindow)
    .reduce((sum, j) => sum + j.amountCents, 0);

  const upcomingPaydays = schedules
    .filter((s) => s.nextIso === periodEnd)
    .map((s) => ({
      id: s.income.id,
      name: s.income.name,
      date: s.nextIso,
      amountCents: amountFor(
        s.income.id,
        s.nextIso,
        s.income.netAmountCents,
      ),
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const billsDue: MoneySplit["billsDue"] = [];
  let billsCents = 0;
  for (const bill of bills) {
    const dues = occurrencesInRange(
      bill.nextDueDate,
      bill.cadence,
      periodStartDate,
      periodEndDate,
    );
    for (const date of dues) {
      billsCents += bill.amountCents;
      billsDue.push({
        billId: bill.id,
        name: bill.name,
        date,
        amountCents: bill.amountCents,
        incomeSourceId: bill.incomeSourceId ?? null,
      });
    }
  }
  billsDue.sort((a, b) => a.date.localeCompare(b.date));

  const savingsCents = savings.reduce(
    (sum, g) => sum + g.contributionPerPeriodCents,
    0,
  );

  const spentCents = transactions
    .filter((t) => !t.excluded)
    .filter((t) => t.date >= periodStart && t.date <= periodEnd)
    .filter((t) => t.amountCents > 0)
    .reduce((sum, t) => sum + t.amountCents, 0);

  const safeToSpendCents = incomeCents - billsCents - savingsCents - spentCents;

  const drivers: MoneySplit["drivers"] = [];
  const unloggedFunding = incomeByJob.filter((j) => j.fundsWindow && !j.logged);
  if (unloggedFunding.length > 0) {
    for (const job of unloggedFunding) {
      drivers.push({
        label: `No paycheck logged for ${job.name} on ${formatDisplayDate(job.payday)}`,
        tone: "warn",
      });
    }
  }
  if (billsCents > 0) {
    drivers.push({
      label: "Bills due in this window",
      amountCents: -billsCents,
      tone: "neutral",
    });
  }
  if (savingsCents > 0) {
    drivers.push({
      label: "Savings plan",
      amountCents: -savingsCents,
      tone: "neutral",
    });
  }
  if (spentCents > 0) {
    drivers.push({
      label: "Card spend so far",
      amountCents: -spentCents,
      tone: "neutral",
    });
  }
  if (incomeCents > 0 && safeToSpendCents >= 0) {
    drivers.push({
      label: "Left after bills, savings, and spend",
      amountCents: safeToSpendCents,
      tone: "good",
    });
  } else if (safeToSpendCents < 0 && drivers.length === 0) {
    drivers.push({
      label: "Safe to spend is negative — log income or trim plans",
      tone: "warn",
    });
  }

  return {
    periodStart,
    periodEnd,
    daysLeft,
    incomeCents,
    billsCents,
    savingsCents,
    spentCents,
    safeToSpendCents,
    incomeByJob,
    drivers,
    upcomingPaydays,
    billsDue,
  };
}
