import { describe, expect, it } from "vitest";
import { ruleBasedAdvice } from "./coach";
import type { CoachSnapshot } from "./coach-snapshot";

const base: CoachSnapshot = {
  monthKey: "2026-09",
  monthLabel: "September 2026",
  halfLabel: "2nd half",
  daysLeft: 15,
  incomeCents: 64074,
  billsCents: 12131,
  savingsCents: 0,
  spentCents: 30352,
  cardBalanceCents: 0,
  safeToSpendCents: 21591,
  incomeByJob: [
    { name: "Ciracet", amountCents: 24380, logged: true },
    { name: "PHSU", amountCents: 39694, logged: true },
  ],
  categories: [
    { name: "Food", spentCents: 18000, limitCents: 20000, pct: 90 },
  ],
  topMerchants: [{ name: "Costco", amountCents: 12000, count: 2 }],
  unpaidBills: [{ name: "Internet", amountCents: 6500, date: "2026-09-20" }],
  uncategorizedCount: 0,
  priorMonth: {
    monthLabel: "August 2026",
    incomeCents: 60000,
    spentCents: 25000,
    safeToSpendCents: 20000,
  },
};

describe("ruleBasedAdvice", () => {
  it("cites dollar amounts from the snapshot", () => {
    const advice = ruleBasedAdvice(base);
    expect(advice.source).toBe("rules");
    expect(advice.summary).toMatch(/\$/);
    expect(advice.tips.length).toBeGreaterThanOrEqual(2);
    for (const tip of advice.tips) {
      expect(tip.detail + tip.evidence).toMatch(/\$\d/);
    }
  });

  it("flags zero income without inventing pay", () => {
    const advice = ruleBasedAdvice({
      ...base,
      incomeCents: 0,
      safeToSpendCents: -12131,
      incomeByJob: [
        { name: "Ciracet", amountCents: 0, logged: false },
      ],
    });
    expect(advice.tips[0]?.tone).toBe("urgent");
    expect(advice.tips[0]?.detail).toMatch(/\$0\.00/);
  });
});
