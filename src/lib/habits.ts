import {
  addDays,
  advanceToOnOrAfter,
  formatDate,
  parseDate,
  type Cadence,
} from "@/lib/money";

/** Show payday nudge this many days before (and on) payday. */
export const PAYDAY_REMINDER_WINDOW_DAYS = 2;

/** Soft warn when a category reaches this share of its monthly limit. */
export const CATEGORY_WARN_PCT = 80;

/** Soft warn when safe-to-spend is below this and days remain. */
export const SAFE_TO_SPEND_FLOOR_CENTS = 5_000; // $50

export type PaydayReminder = {
  jobId: string;
  jobName: string;
  date: string;
  daysUntil: number;
};

export type CategoryGuardrail = {
  categoryId: string;
  name: string;
  spentCents: number;
  limitCents: number;
  pct: number;
  over: boolean;
};

export type SafeSpendGuardrail = {
  safeToSpendCents: number;
  daysLeft: number;
  kind: "negative" | "low";
};

function signedDaysFromToday(todayIso: string, targetIso: string): number {
  const ms =
    parseDate(targetIso).getTime() - parseDate(todayIso).getTime();
  return Math.round(ms / (1000 * 60 * 60 * 24));
}

/**
 * Jobs with a payday today or within the next few days that still need
 * a paycheck logged this calendar month.
 */
export function getPaydayReminders(
  jobs: {
    id: string;
    name: string;
    nextPayday: string;
    cadence: Cadence;
  }[],
  loggedJobIdsThisMonth: Set<string>,
  today = new Date(),
): PaydayReminder[] {
  const todayIso = formatDate(today);
  const from = addDays(today, -1); // catch payday yesterday if not logged
  const reminders: PaydayReminder[] = [];

  for (const job of jobs) {
    if (loggedJobIdsThisMonth.has(job.id)) continue;

    const next = advanceToOnOrAfter(job.nextPayday, job.cadence, from);
    const daysUntil = signedDaysFromToday(todayIso, next);
    if (daysUntil < -1 || daysUntil > PAYDAY_REMINDER_WINDOW_DAYS) continue;

    reminders.push({
      jobId: job.id,
      jobName: job.name,
      date: next,
      daysUntil: Math.max(0, daysUntil),
    });
  }

  return reminders.sort((a, b) => a.daysUntil - b.daysUntil);
}

export function getCategoryGuardrails(
  categories: {
    id: string;
    name: string;
    monthlyLimitCents: number;
  }[],
  spentByCategoryId: Map<string, number>,
): CategoryGuardrail[] {
  const rows: CategoryGuardrail[] = [];
  for (const cat of categories) {
    if (cat.monthlyLimitCents <= 0) continue;
    const spent = spentByCategoryId.get(cat.id) ?? 0;
    const pct = Math.round((spent / cat.monthlyLimitCents) * 100);
    if (pct < CATEGORY_WARN_PCT) continue;
    rows.push({
      categoryId: cat.id,
      name: cat.name,
      spentCents: spent,
      limitCents: cat.monthlyLimitCents,
      pct,
      over: spent > cat.monthlyLimitCents,
    });
  }
  return rows.sort((a, b) => b.pct - a.pct);
}

export function getSafeSpendGuardrail(
  safeToSpendCents: number,
  daysLeft: number,
): SafeSpendGuardrail | null {
  if (safeToSpendCents < 0) {
    return { safeToSpendCents, daysLeft, kind: "negative" };
  }
  if (
    daysLeft >= 3 &&
    safeToSpendCents > 0 &&
    safeToSpendCents < SAFE_TO_SPEND_FLOOR_CENTS
  ) {
    return { safeToSpendCents, daysLeft, kind: "low" };
  }
  return null;
}
