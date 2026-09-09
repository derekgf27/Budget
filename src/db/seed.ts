import { config } from "dotenv";
config({ path: ".env.local" });

import { getDb } from "./index";
import {
  bills,
  categories,
  incomeSources,
  savingsGoals,
} from "./schema";

async function seed() {
  const db = getDb();

  await db.delete(bills);
  await db.delete(savingsGoals);
  await db.delete(categories);
  await db.delete(incomeSources);

  const [jobA, jobB] = await db
    .insert(incomeSources)
    .values([
      {
        name: "Job 1",
        netAmountCents: 220_000,
        cadence: "monthly",
        paydayDay: 1,
        nextPayday: "2026-10-01",
        amountVaries: true,
      },
      {
        name: "Job 2",
        netAmountCents: 140_000,
        cadence: "biweekly",
        paydayDay: null,
        nextPayday: "2026-09-18",
        amountVaries: true,
      },
    ])
    .returning();

  await db.insert(bills).values([
    {
      name: "Rent",
      amountCents: 160_000,
      cadence: "monthly",
      dueDay: 1,
      nextDueDate: "2026-10-01",
      incomeSourceId: jobA.id,
    },
    {
      name: "Car insurance",
      amountCents: 18_500,
      cadence: "monthly",
      dueDay: 15,
      nextDueDate: "2026-09-15",
      incomeSourceId: jobB.id,
    },
    {
      name: "Phone",
      amountCents: 8_500,
      cadence: "monthly",
      dueDay: 20,
      nextDueDate: "2026-09-20",
    },
    {
      name: "Utilities",
      amountCents: 14_000,
      cadence: "monthly",
      dueDay: 10,
      nextDueDate: "2026-10-10",
    },
  ]);

  await db.insert(categories).values([
    { name: "Groceries", monthlyLimitCents: 50_000 },
    { name: "Gas", monthlyLimitCents: 20_000 },
    { name: "Dining", monthlyLimitCents: 25_000 },
    { name: "Entertainment", monthlyLimitCents: 15_000 },
  ]);

  await db.insert(savingsGoals).values([
    {
      name: "Emergency fund",
      kind: "goal",
      targetCents: 1_000_000,
      currentCents: 250_000,
      contributionPerPeriodCents: 25_000,
    },
    {
      name: "Vacation",
      kind: "goal",
      targetCents: 300_000,
      currentCents: 40_000,
      contributionPerPeriodCents: 10_000,
    },
    {
      name: "General savings",
      kind: "fund",
      targetCents: 0,
      currentCents: 150_000,
      contributionPerPeriodCents: 0,
    },
  ]);

  console.log("Seeded demo incomes, bills, categories, and savings goals.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
