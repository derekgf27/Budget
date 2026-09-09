import { describe, expect, it } from "vitest";
import { computeMoneySplit, type Cadence } from "./money";

describe("computeMoneySplit", () => {
  it("computes safe-to-spend across two incomes", () => {
    const today = new Date(2026, 8, 10); // Sep 10, 2026
    const split = computeMoneySplit(
      [
        {
          id: "1",
          name: "Job A",
          netAmountCents: 200_000,
          cadence: "biweekly" as Cadence,
          nextPayday: "2026-09-12",
        },
        {
          id: "2",
          name: "Job B",
          netAmountCents: 120_000,
          cadence: "biweekly" as Cadence,
          nextPayday: "2026-09-15",
        },
      ],
      [
        {
          id: "b1",
          name: "Rent",
          amountCents: 150_000,
          cadence: "monthly" as Cadence,
          nextDueDate: "2026-09-01",
        },
      ],
      [{ id: "s1", name: "Emergency", contributionPerPeriodCents: 20_000 }],
      [
        {
          date: "2026-09-05",
          amountCents: 4_500,
          excluded: false,
        },
      ],
      today,
    );

    // Most recent payday on/before Sep 10 is Job B's prior (Sep 1);
    // soonest future payday is Job A on Sep 12.
    expect(split.periodStart).toBe("2026-09-01");
    expect(split.periodEnd).toBe("2026-09-12");
    expect(split.incomeCents).toBe(120_000);
    expect(split.spentCents).toBe(4_500);
    expect(split.savingsCents).toBe(20_000);
    expect(split.billsCents).toBe(150_000);
    expect(split.safeToSpendCents).toBe(120_000 - 150_000 - 20_000 - 4_500);
    expect(split.daysLeft).toBe(2); // Sep 10 → Sep 12
    expect(split.incomeByJob.some((j) => j.fundsWindow && j.name === "Job B")).toBe(
      true,
    );
    expect(split.drivers.length).toBeGreaterThan(0);
  });

  it("returns zeros with no incomes", () => {
    const split = computeMoneySplit([], [], [], []);
    expect(split.incomeCents).toBe(0);
    expect(split.safeToSpendCents).toBe(0);
  });
});
