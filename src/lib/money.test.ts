import { describe, expect, it } from "vitest";
import { computeMoneySplit, halfMonthBounds, type Cadence } from "./money";

describe("halfMonthBounds", () => {
  it("uses 1st half on the 12th", () => {
    const half = halfMonthBounds(new Date(2026, 8, 12));
    expect(half.half).toBe("early");
    expect(half.start).toBe("2026-09-01");
    expect(half.end).toBe("2026-09-15");
  });

  it("uses 2nd half on the 20th", () => {
    const half = halfMonthBounds(new Date(2026, 8, 20));
    expect(half.half).toBe("late");
    expect(half.start).toBe("2026-09-16");
    expect(half.end).toBe("2026-09-30");
  });
});

describe("computeMoneySplit", () => {
  it("uses the calendar month for income, bills, and spend", () => {
    const today = new Date(2026, 8, 12); // Sep 12, 2026
    const split = computeMoneySplit(
      [
        {
          id: "1",
          name: "Job A",
          netAmountCents: 200_000,
          cadence: "biweekly" as Cadence,
          nextPayday: "2026-09-25",
        },
        {
          id: "2",
          name: "Job B",
          netAmountCents: 120_000,
          cadence: "biweekly" as Cadence,
          nextPayday: "2026-09-25",
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
      [
        {
          incomeSourceId: "1",
          paidOn: "2026-09-10",
          amountCents: 200_000,
        },
        {
          incomeSourceId: "2",
          paidOn: "2026-09-11",
          amountCents: 120_000,
        },
      ],
    );

    expect(split.periodStart).toBe("2026-09-01");
    expect(split.periodEnd).toBe("2026-09-30");
    expect(split.half).toBe("early");
    expect(split.incomeCents).toBe(320_000);
    expect(split.spentCents).toBe(4_500);
    expect(split.savingsCents).toBe(40_000);
    expect(split.billsCents).toBe(150_000);
    expect(split.safeToSpendCents).toBe(320_000 - 150_000 - 40_000 - 4_500);
    expect(split.incomeByJob.every((j) => j.logged && j.fundsWindow)).toBe(true);
  });

  it("returns zeros with no incomes", () => {
    const split = computeMoneySplit([], [], [], [], new Date(2026, 8, 12));
    expect(split.incomeCents).toBe(0);
    expect(split.safeToSpendCents).toBe(0);
    expect(split.periodStart).toBe("2026-09-01");
  });
});
