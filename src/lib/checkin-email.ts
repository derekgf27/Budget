import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  appSettings,
  incomeSources,
  reminderLog,
} from "@/db/schema";
import {
  addDays,
  formatDate,
  formatDisplayDate,
  parseDate,
  retreatToOnOrBefore,
  type Cadence,
} from "@/lib/money";
import { appUrl, sendEmail } from "@/lib/email";

export const SETTING_EMAIL_ENABLED = "email_reminders_enabled";
export const SETTING_REMINDER_EMAIL = "reminder_email";

/** Calendar date (YYYY-MM-DD) in the reminder timezone. */
export function todayInReminderTz(now = new Date()): string {
  const tz = process.env.REMINDER_TZ?.trim() || "America/New_York";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** True during the 1:00–1:59pm hour in US Eastern (handles DST). */
export function isOnePmEastern(now = new Date()): boolean {
  const hourStr = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hourCycle: "h23",
  }).format(now);
  const hour = Number(hourStr);
  return hour === 13;
}

export function dateFromReminderIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/** First Sunday strictly after a payday (if payday is Sunday → next Sunday). */
export function sundayAfterPayday(paydayIso: string): string {
  const payday = parseDate(paydayIso);
  const dow = payday.getDay(); // 0 = Sunday
  const daysUntilSunday = dow === 0 ? 7 : 7 - dow;
  return formatDate(addDays(payday, daysUntilSunday));
}

export type SundayCheckinReminder = {
  jobId: string;
  jobName: string;
  payday: string;
  sunday: string;
};

/** Jobs whose check-in Sunday (Sunday after last payday) is today. */
export function getSundayAfterPaydayReminders(
  jobs: {
    id: string;
    name: string;
    nextPayday: string;
    cadence: Cadence;
  }[],
  today = new Date(),
): SundayCheckinReminder[] {
  const todayIso = formatDate(today);
  const reminders: SundayCheckinReminder[] = [];

  for (const job of jobs) {
    const lastPayday = retreatToOnOrBefore(
      job.nextPayday,
      job.cadence,
      today,
    );
    const sunday = sundayAfterPayday(lastPayday);
    if (sunday !== todayIso) continue;
    reminders.push({
      jobId: job.id,
      jobName: job.name,
      payday: lastPayday,
      sunday,
    });
  }

  return reminders;
}

export async function getSetting(key: string): Promise<string | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(appSettings)
    .where(eq(appSettings.key, key))
    .limit(1);
  return rows[0]?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = getDb();
  await db
    .insert(appSettings)
    .values({ key, value, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: appSettings.key,
      set: { value, updatedAt: new Date() },
    });
}

export async function getReminderEmail(): Promise<string | null> {
  const fromDb = await getSetting(SETTING_REMINDER_EMAIL);
  if (fromDb?.trim()) return fromDb.trim();
  return process.env.REMINDER_EMAIL?.trim() || null;
}

export async function isEmailRemindersEnabled(): Promise<boolean> {
  const fromDb = await getSetting(SETTING_EMAIL_ENABLED);
  if (fromDb === "0") return false;
  if (fromDb === "1") return true;
  return process.env.EMAIL_REMINDERS_ENABLED !== "0";
}

async function alreadySent(
  sentOn: string,
  kind: string,
  jobId: string | null,
): Promise<boolean> {
  const db = getDb();
  if (jobId) {
    const rows = await db
      .select({ id: reminderLog.id })
      .from(reminderLog)
      .where(
        and(
          eq(reminderLog.sentOn, sentOn),
          eq(reminderLog.kind, kind),
          eq(reminderLog.jobId, jobId),
        ),
      )
      .limit(1);
    return rows.length > 0;
  }
  const rows = await db
    .select({ id: reminderLog.id })
    .from(reminderLog)
    .where(and(eq(reminderLog.sentOn, sentOn), eq(reminderLog.kind, kind)))
    .limit(1);
  return rows.length > 0;
}

async function markSent(
  sentOn: string,
  kind: string,
  jobId: string | null,
): Promise<void> {
  const db = getDb();
  await db.insert(reminderLog).values({
    sentOn,
    kind,
    jobId,
  });
}

function sundayCheckinCopy(reminders: SundayCheckinReminder[]) {
  const names = reminders.map((r) => r.jobName).join(" · ");
  const subject = `Sunday check-in — ${names}`;
  const lines = [
    "Sunday after payday — time for your Splitbook check-in.",
    "",
    ...reminders.map(
      (r) => `• ${r.jobName} (paid ${formatDisplayDate(r.payday)})`,
    ),
    "",
    "1. Import a statement CSV",
    "2. Log pay (if you haven’t)",
    "3. Categorize transactions",
    "4. Mark bills",
    "5. Move savings",
    "",
    appUrl(),
  ];
  return { subject, text: lines.join("\n") };
}

export type CheckinEmailResult = {
  skipped?: string;
  sent: { kind: string; jobId: string | null; id: string }[];
  errors: string[];
};

/**
 * Daily job: email on the Sunday after each job’s most recent payday.
 */
export async function runCheckinEmailReminders(
  now = new Date(),
): Promise<CheckinEmailResult> {
  const sent: CheckinEmailResult["sent"] = [];
  const errors: string[] = [];

  if (!(await isEmailRemindersEnabled())) {
    return { skipped: "Email reminders disabled", sent, errors };
  }

  if (!isOnePmEastern(now)) {
    return { skipped: "Outside 1pm Eastern send window", sent, errors };
  }

  const email = await getReminderEmail();
  if (!email) {
    return {
      skipped: "No reminder email set (Settings or REMINDER_EMAIL)",
      sent,
      errors,
    };
  }

  const todayIso = todayInReminderTz(now);
  const todayLocal = dateFromReminderIso(todayIso);
  const db = getDb();
  const incomes = await db.select().from(incomeSources);

  const reminders = getSundayAfterPaydayReminders(
    incomes.map((i) => ({
      id: i.id,
      name: i.name,
      nextPayday: i.nextPayday,
      cadence: i.cadence as Cadence,
    })),
    todayLocal,
  );

  if (reminders.length === 0) {
    return { skipped: "Not a Sunday-after-payday today", sent, errors };
  }

  if (await alreadySent(todayIso, "sunday-checkin", null)) {
    return { skipped: "Already sent Sunday check-in today", sent, errors };
  }

  const { subject, text } = sundayCheckinCopy(reminders);
  const result = await sendEmail({ to: email, subject, text });
  if (!result.ok) {
    errors.push(result.error);
    return { sent, errors };
  }

  await markSent(todayIso, "sunday-checkin", null);
  for (const r of reminders) {
    await markSent(todayIso, "sunday-checkin", r.jobId);
  }
  sent.push({ kind: "sunday-checkin", jobId: null, id: result.id });

  return { sent, errors };
}

export async function sendTestCheckinEmail(): Promise<
  { ok: true; id: string } | { ok: false; error: string }
> {
  const email = await getReminderEmail();
  if (!email) {
    return { ok: false, error: "Save an email address first." };
  }
  const result = await sendEmail({
    to: email,
    subject: "Splitbook test — check-in reminders",
    text: [
      "This is a test. Live reminders send on the Sunday after each payday.",
      "",
      appUrl(),
    ].join("\n"),
  });
  if (result.ok) {
    await markSent(todayInReminderTz(), "test", null);
  }
  return result;
}
