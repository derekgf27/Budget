"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDb } from "@/db";
import {
  billPayments,
  bills,
  categories,
  incomeSources,
  paycheckLogs,
  savingsGoals,
  savingsTransfers,
  transactions,
  accounts,
} from "@/db/schema";
import { dollarsToCents, nextPaydayAfter, type Cadence } from "@/lib/money";
import { isJobColorKey } from "@/lib/job-colors";

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/paychecks");
  revalidatePath("/bills");
  revalidatePath("/budget");
  revalidatePath("/savings");
  revalidatePath("/transactions");
  revalidatePath("/accounts");
  revalidatePath("/settings");
}

function nextPaydayFromDay(day: number, from = new Date()): string {
  const safeDay = Math.min(Math.max(day, 1), 31);
  let year = from.getFullYear();
  let month = from.getMonth();
  const candidate = new Date(year, month, safeDay);
  // Clamp for short months (e.g. day 31 in February)
  if (candidate.getMonth() !== month) {
    const last = new Date(year, month + 1, 0);
    if (last < new Date(from.getFullYear(), from.getMonth(), from.getDate())) {
      month += 1;
    }
  }
  let date = new Date(year, month, Math.min(safeDay, new Date(year, month + 1, 0).getDate()));
  const today = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (date < today) {
    month = from.getMonth() + 1;
    year = from.getFullYear() + (month > 11 ? 1 : 0);
    month = month % 12;
    date = new Date(year, month, Math.min(safeDay, new Date(year, month + 1, 0).getDate()));
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function upsertIncome(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") || "");
  const cadence = String(formData.get("cadence") || "monthly");
  const paydayDayRaw = String(formData.get("paydayDay") || "");
  const paydayDay =
    cadence === "monthly" && paydayDayRaw
      ? Math.min(31, Math.max(1, Number(paydayDayRaw)))
      : null;
  let nextPayday = String(formData.get("nextPayday") || "");
  if (!nextPayday && paydayDay) {
    nextPayday = nextPaydayFromDay(paydayDay);
  }
  const amountRaw = String(formData.get("amount") || "").trim();
  const colorRaw = String(formData.get("colorKey") || "").trim();
  const depositMatch =
    String(formData.get("depositMatch") || "").trim() || null;
  const values = {
    name: String(formData.get("name") || "").trim(),
    netAmountCents: amountRaw ? dollarsToCents(amountRaw) : 0,
    cadence,
    paydayDay,
    nextPayday,
    amountVaries: formData.get("amountVaries") === "on",
    colorKey: isJobColorKey(colorRaw) ? colorRaw : "forest",
    depositMatch,
  };
  if (!values.name || !values.nextPayday) {
    throw new Error("Name and next payday are required");
  }
  if (id) {
    await db.update(incomeSources).set(values).where(eq(incomeSources.id, id));
  } else {
    await db.insert(incomeSources).values(values);
  }
  revalidateAll();
}

export async function deleteIncome(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") || "");
  if (id) await db.delete(incomeSources).where(eq(incomeSources.id, id));
  revalidateAll();
}

export async function logPaycheck(formData: FormData) {
  const db = getDb();
  const incomeSourceId = String(formData.get("incomeSourceId") || "");
  const paidOn = String(formData.get("paidOn") || "");
  const amountCents = dollarsToCents(String(formData.get("amount") || "0"));
  const note = String(formData.get("note") || "").trim() || null;
  if (!incomeSourceId || !paidOn || amountCents <= 0) {
    throw new Error("Job, date, and amount are required");
  }

  const existing = await db
    .select()
    .from(paycheckLogs)
    .where(
      and(
        eq(paycheckLogs.incomeSourceId, incomeSourceId),
        eq(paycheckLogs.paidOn, paidOn),
      ),
    );

  if (existing[0]) {
    await db
      .update(paycheckLogs)
      .set({ amountCents, note })
      .where(eq(paycheckLogs.id, existing[0].id));
  } else {
    await db.insert(paycheckLogs).values({
      incomeSourceId,
      paidOn,
      amountCents,
      note,
    });
  }

  // Keep estimate + schedule in sync with what actually paid
  const [job] = await db
    .select()
    .from(incomeSources)
    .where(eq(incomeSources.id, incomeSourceId));
  if (job) {
    const advanced = nextPaydayAfter(
      paidOn,
      job.cadence as Cadence,
      job.nextPayday,
    );
    const nextPayday =
      advanced > job.nextPayday || job.nextPayday <= paidOn
        ? advanced
        : job.nextPayday;
    await db
      .update(incomeSources)
      .set({ netAmountCents: amountCents, nextPayday })
      .where(eq(incomeSources.id, incomeSourceId));
  }

  revalidateAll();
}

export async function deletePaycheckLog(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") || "");
  if (id) await db.delete(paycheckLogs).where(eq(paycheckLogs.id, id));
  revalidateAll();
}

export async function upsertBill(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") || "");
  const incomeSourceId = String(formData.get("incomeSourceId") || "") || null;
  const values = {
    name: String(formData.get("name") || "").trim(),
    amountCents: dollarsToCents(String(formData.get("amount") || "0")),
    cadence: String(formData.get("cadence") || "monthly"),
    nextDueDate: String(formData.get("nextDueDate") || ""),
    dueDay: Number(formData.get("dueDay") || 0) || null,
    incomeSourceId,
  };
  if (!values.name || !values.nextDueDate) {
    throw new Error("Name and next due date are required");
  }
  if (id) {
    await db.update(bills).set(values).where(eq(bills.id, id));
  } else {
    await db.insert(bills).values(values);
  }
  revalidateAll();
}

export async function deleteBill(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") || "");
  if (id) await db.delete(bills).where(eq(bills.id, id));
  revalidateAll();
}

export async function markBillPaid(formData: FormData) {
  const db = getDb();
  const billId = String(formData.get("billId") || "");
  const dueDate = String(formData.get("dueDate") || "");
  const paidOn =
    String(formData.get("paidOn") || "") ||
    new Date().toISOString().slice(0, 10);
  if (!billId || !dueDate) {
    throw new Error("Bill and due date are required");
  }

  const existing = await db
    .select()
    .from(billPayments)
    .where(
      and(eq(billPayments.billId, billId), eq(billPayments.dueDate, dueDate)),
    );

  if (!existing[0]) {
    await db.insert(billPayments).values({ billId, dueDate, paidOn });
  }
  const { tidyTransactionsForSpend } = await import("@/lib/spend-tidy");
  await tidyTransactionsForSpend();
  revalidateAll();
}

export async function markBillUnpaid(formData: FormData) {
  const db = getDb();
  const billId = String(formData.get("billId") || "");
  const dueDate = String(formData.get("dueDate") || "");
  if (!billId || !dueDate) {
    throw new Error("Bill and due date are required");
  }
  await db
    .delete(billPayments)
    .where(
      and(eq(billPayments.billId, billId), eq(billPayments.dueDate, dueDate)),
    );
  revalidateAll();
}

export async function upsertCategory(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") || "");
  const rawColor = String(formData.get("colorKey") || "").trim();
  const { isCategoryColorKey } = await import("@/lib/category-colors");
  const values = {
    name: String(formData.get("name") || "").trim(),
    monthlyLimitCents: dollarsToCents(String(formData.get("limit") || "0")),
    colorKey: isCategoryColorKey(rawColor) ? rawColor : null,
  };
  if (!values.name) throw new Error("Name is required");
  if (id) {
    await db.update(categories).set(values).where(eq(categories.id, id));
  } else {
    await db.insert(categories).values(values);
  }
  revalidateAll();
}

export async function deleteCategory(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") || "");
  if (id) await db.delete(categories).where(eq(categories.id, id));
  revalidateAll();
}

export async function upsertSavings(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") || "");
  const kind = String(formData.get("kind") || "goal") === "fund" ? "fund" : "goal";
  const values = {
    name: String(formData.get("name") || "").trim(),
    kind,
    targetCents:
      kind === "fund"
        ? 0
        : dollarsToCents(String(formData.get("target") || "0")),
    currentCents: dollarsToCents(String(formData.get("current") || "0")),
    contributionPerPeriodCents:
      kind === "fund"
        ? 0
        : dollarsToCents(String(formData.get("contribution") || "0")),
  };
  if (!values.name) throw new Error("Name is required");
  if (id) {
    await db.update(savingsGoals).set(values).where(eq(savingsGoals.id, id));
  } else {
    await db.insert(savingsGoals).values(values);
  }
  revalidateAll();
}

export async function deleteSavings(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") || "");
  if (id) await db.delete(savingsGoals).where(eq(savingsGoals.id, id));
  revalidateAll();
}

export async function transferSavings(formData: FormData) {
  const db = getDb();
  const savingsId = String(formData.get("savingsId") || "");
  const direction = String(formData.get("direction") || "deposit");
  const amountCents = Math.abs(
    dollarsToCents(String(formData.get("amount") || "0")),
  );
  const transferredOn =
    String(formData.get("transferredOn") || "") ||
    new Date().toISOString().slice(0, 10);
  const note = String(formData.get("note") || "").trim() || null;

  if (!savingsId || amountCents <= 0) {
    throw new Error("Savings item and amount are required");
  }

  const rows = await db
    .select()
    .from(savingsGoals)
    .where(eq(savingsGoals.id, savingsId));
  const item = rows[0];
  if (!item) throw new Error("Savings item not found");

  const signed = direction === "withdraw" ? -amountCents : amountCents;
  const nextBalance = item.currentCents + signed;
  if (nextBalance < 0) {
    throw new Error("Cannot withdraw more than the current balance");
  }

  await db.insert(savingsTransfers).values({
    savingsId,
    amountCents: signed,
    transferredOn,
    note,
  });
  await db
    .update(savingsGoals)
    .set({ currentCents: nextBalance })
    .where(eq(savingsGoals.id, savingsId));

  revalidateAll();
}

export async function toggleTransactionExcluded(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") || "");
  const excluded = String(formData.get("excluded") || "false") === "true";
  if (id) {
    await db
      .update(transactions)
      .set({ excluded: !excluded })
      .where(eq(transactions.id, id));
  }
  revalidateAll();
}

export async function updateTransactionCategory(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") || "");
  const categoryId = String(formData.get("categoryId") || "") || null;
  if (id) {
    await db
      .update(transactions)
      .set({ categoryId })
      .where(eq(transactions.id, id));
  }
  revalidateAll();
}

export async function addManualTransaction(formData: FormData) {
  const db = getDb();
  const date = String(formData.get("date") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const amountRaw = String(formData.get("amount") || "").trim();
  const kind = String(formData.get("kind") || "expense").trim();
  const accountId = String(formData.get("accountId") || "").trim() || null;
  const categoryId = String(formData.get("categoryId") || "").trim() || null;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Date required");
  }
  if (!name) throw new Error("Description required");
  if (!amountRaw) throw new Error("Amount required");

  let amountCents = Math.abs(dollarsToCents(amountRaw));
  if (kind === "deposit") amountCents = -amountCents;

  await db.insert(transactions).values({
    accountId,
    categoryId: kind === "deposit" ? null : categoryId,
    date,
    name,
    merchantName: null,
    amountCents,
    excluded: false,
    source: "manual",
  });
  revalidateAll();
}

export async function renameAccount(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") || "");
  const displayName = String(formData.get("displayName") || "").trim() || null;
  if (!id) throw new Error("Account required");
  await db.update(accounts).set({ displayName }).where(eq(accounts.id, id));
  revalidateAll();
}

export async function createManualAccount(formData: FormData) {
  const db = getDb();
  const name = String(formData.get("name") || "").trim();
  const typeRaw = String(formData.get("accountType") || "credit").trim();
  const type = typeRaw === "depository" ? "depository" : "credit";
  const raw = String(formData.get("balance") || "").trim();
  const dueRaw = String(formData.get("dueDate") || "").trim();
  if (!name) throw new Error("Name required");

  const balanceCurrent = raw === "" ? "0" : raw.replace(/[$,]/g, "");
  if (!Number.isFinite(Number(balanceCurrent))) {
    throw new Error("Enter a valid balance");
  }
  const balanceDueDate =
    dueRaw && /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : null;

  await db.insert(accounts).values({
    name,
    displayName: name,
    type,
    subtype: type === "credit" ? "credit card" : "checking",
    source: "manual",
    balanceCurrent,
    balanceDueDate,
    lastImportedAt: new Date(),
  });
  revalidateAll();
}

export async function updateAccountDueDate(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") || "");
  const dueRaw = String(formData.get("dueDate") || "").trim();
  if (!id) throw new Error("Account required");
  const balanceDueDate =
    dueRaw && /^\d{4}-\d{2}-\d{2}$/.test(dueRaw) ? dueRaw : null;
  await db.update(accounts).set({ balanceDueDate }).where(eq(accounts.id, id));
  revalidateAll();
}

export async function updateAccountBalance(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") || "");
  const raw = String(formData.get("balance") || "").trim();
  if (!id) throw new Error("Account required");
  const balanceCurrent = raw === "" ? null : raw.replace(/[$,]/g, "");
  await db
    .update(accounts)
    .set({ balanceCurrent, lastImportedAt: new Date() })
    .where(eq(accounts.id, id));
  revalidateAll();
}

export async function adjustAccountBalance(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") || "");
  const direction = String(formData.get("direction") || "").trim();
  const raw = String(formData.get("amount") || "").trim();
  if (!id) throw new Error("Account required");
  if (direction !== "charge" && direction !== "pay") {
    throw new Error("Choose charge or pay");
  }

  const delta = Math.abs(dollarsToCents(raw) / 100);
  if (!Number.isFinite(delta) || delta <= 0) {
    throw new Error("Enter an amount");
  }

  const row = (await db.select().from(accounts).where(eq(accounts.id, id)))[0];
  if (!row) throw new Error("Account not found");

  const current = Number(row.balanceCurrent ?? 0);
  const next =
    direction === "charge" ? current + delta : Math.max(0, current - delta);

  await db
    .update(accounts)
    .set({
      balanceCurrent: next.toFixed(2),
      lastImportedAt: new Date(),
    })
    .where(eq(accounts.id, id));
  revalidateAll();
}

export async function hideAccount(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") || "");
  const hidden = String(formData.get("hidden") || "true") === "true";
  if (!id) throw new Error("Account required");
  await db.update(accounts).set({ hidden }).where(eq(accounts.id, id));
  revalidateAll();
}

export async function deleteAccount(formData: FormData) {
  const db = getDb();
  const id = String(formData.get("id") || "");
  if (!id) throw new Error("Account required");
  await db.delete(transactions).where(eq(transactions.accountId, id));
  await db.delete(accounts).where(eq(accounts.id, id));
  revalidateAll();
}

export async function matchPaychecksFromImports() {
  const { matchPaychecksFromDeposits } = await import("@/lib/paycheck-match");
  const result = await matchPaychecksFromDeposits();
  revalidateAll();
  return result;
}

export async function saveEmailReminderSettings(formData: FormData) {
  const emailRaw = String(formData.get("email") || "").trim();
  const enabled =
    formData.get("enabled") === "on" || formData.get("enabled") === "1";

  const { normalizeEmail } = await import("@/lib/email");
  const {
    setSetting,
    SETTING_REMINDER_EMAIL,
    SETTING_EMAIL_ENABLED,
  } = await import("@/lib/checkin-email");

  if (emailRaw) {
    const email = normalizeEmail(emailRaw);
    if (!email) {
      return { ok: false as const, error: "Enter a valid email address." };
    }
    await setSetting(SETTING_REMINDER_EMAIL, email);
  } else {
    await setSetting(SETTING_REMINDER_EMAIL, "");
  }
  await setSetting(SETTING_EMAIL_ENABLED, enabled ? "1" : "0");
  revalidatePath("/settings");
  return { ok: true as const };
}

export async function sendTestEmailReminder() {
  const { sendTestCheckinEmail } = await import("@/lib/checkin-email");
  return sendTestCheckinEmail();
}
