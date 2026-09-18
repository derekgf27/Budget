import {
  boolean,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const incomeSources = pgTable("income_sources", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  /** Planning estimate when amount varies; used if no log exists for the period. */
  netAmountCents: integer("net_amount_cents").notNull().default(0),
  cadence: text("cadence").notNull(), // weekly | biweekly | semimonthly | monthly
  /** For monthly fixed-date jobs: day of month (1-31). */
  paydayDay: integer("payday_day"),
  nextPayday: text("next_payday").notNull(), // YYYY-MM-DD
  amountVaries: boolean("amount_varies").notNull().default(true),
  /** Palette key from JOB_COLOR_OPTIONS (forest, blue, …). */
  colorKey: text("color_key"),
  /** Comma-separated keywords to match bank deposit descriptions (e.g. CIRACET,TIBER). */
  depositMatch: text("deposit_match"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Actual take-home amounts received (for variable paychecks). */
export const paycheckLogs = pgTable("paycheck_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  incomeSourceId: uuid("income_source_id")
    .notNull()
    .references(() => incomeSources.id, { onDelete: "cascade" }),
  paidOn: text("paid_on").notNull(), // YYYY-MM-DD
  amountCents: integer("amount_cents").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bills = pgTable("bills", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  amountCents: integer("amount_cents").notNull(),
  cadence: text("cadence").notNull(), // monthly | biweekly | weekly | yearly
  dueDay: integer("due_day"), // 1-31 for monthly; null for relative cadences
  nextDueDate: text("next_due_date").notNull(), // YYYY-MM-DD
  incomeSourceId: uuid("income_source_id").references(() => incomeSources.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Marks a specific bill due-date as paid. */
export const billPayments = pgTable("bill_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  billId: uuid("bill_id")
    .notNull()
    .references(() => bills.id, { onDelete: "cascade" }),
  dueDate: text("due_date").notNull(), // YYYY-MM-DD occurrence that was paid
  paidOn: text("paid_on").notNull(), // YYYY-MM-DD when marked paid
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  monthlyLimitCents: integer("monthly_limit_cents").notNull().default(0),
  colorKey: text("color_key"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const savingsGoals = pgTable("savings_goals", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  /** goal = target + planned contribution; fund = open pot you top up anytime */
  kind: text("kind").notNull().default("goal"), // goal | fund
  targetCents: integer("target_cents").notNull().default(0),
  currentCents: integer("current_cents").notNull().default(0),
  contributionPerPeriodCents: integer("contribution_per_period_cents").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Deposits / withdrawals into a savings goal or fund. */
export const savingsTransfers = pgTable("savings_transfers", {
  id: uuid("id").defaultRandom().primaryKey(),
  savingsId: uuid("savings_id")
    .notNull()
    .references(() => savingsGoals.id, { onDelete: "cascade" }),
  amountCents: integer("amount_cents").notNull(), // positive = deposit, negative = withdraw
  transferredOn: text("transferred_on").notNull(), // YYYY-MM-DD
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  displayName: text("display_name"),
  officialName: text("official_name"),
  type: text("type").notNull().default("credit"), // credit | depository | other
  subtype: text("subtype"), // checking | savings | credit card | …
  mask: text("mask"),
  balanceCurrent: numeric("balance_current", { precision: 12, scale: 2 }),
  balanceLimit: numeric("balance_limit", { precision: 12, scale: 2 }),
  source: text("source").notNull().default("csv"), // csv | manual
  hidden: boolean("hidden").notNull().default(false),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const transactions = pgTable("transactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  accountId: uuid("account_id").references(() => accounts.id, {
    onDelete: "set null",
  }),
  categoryId: uuid("category_id").references(() => categories.id, {
    onDelete: "set null",
  }),
  /** Optional dedupe key from statement import. */
  importId: text("import_id"),
  date: text("date").notNull(), // YYYY-MM-DD
  name: text("name").notNull(),
  merchantName: text("merchant_name"),
  amountCents: integer("amount_cents").notNull(), // positive = expense
  pending: boolean("pending").notNull().default(false),
  excluded: boolean("excluded").notNull().default(false),
  source: text("source").notNull().default("csv"), // csv | manual
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Key/value app prefs (reminder email, toggles). */
export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

/** Dedupes outbound check-in reminders (one row per sent day+kind). */
export const reminderLog = pgTable("reminder_log", {
  id: uuid("id").defaultRandom().primaryKey(),
  sentOn: text("sent_on").notNull(), // YYYY-MM-DD in reminder TZ
  kind: text("kind").notNull(), // payday | half-checkin | test
  jobId: text("job_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export type IncomeSource = typeof incomeSources.$inferSelect;
export type PaycheckLog = typeof paycheckLogs.$inferSelect;
export type Bill = typeof bills.$inferSelect;
export type BillPayment = typeof billPayments.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type SavingsGoal = typeof savingsGoals.$inferSelect;
export type SavingsTransfer = typeof savingsTransfers.$inferSelect;
export type Account = typeof accounts.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
export type ReminderLog = typeof reminderLog.$inferSelect;
