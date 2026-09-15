import { Money, Panel } from "@/components/ui";

export function MonthReview({
  monthLabel,
  incomeCents,
  billsCents,
  billsPaidCount,
  billsTotalCount,
  spentCents,
  savingsMovedCents,
  safeToSpendCents,
}: {
  monthLabel: string;
  incomeCents: number;
  billsCents: number;
  billsPaidCount: number;
  billsTotalCount: number;
  spentCents: number;
  savingsMovedCents: number;
  safeToSpendCents: number;
}) {
  const rows = [
    {
      label: "Made",
      hint: "Paychecks logged",
      cents: incomeCents,
      tone: "neutral" as const,
    },
    {
      label: "Bills",
      hint:
        billsTotalCount === 0
          ? "None this month"
          : `${billsPaidCount} of ${billsTotalCount} marked paid`,
      cents: -billsCents,
      tone: "neutral" as const,
    },
    {
      label: "Spent",
      hint: "Cards (after ignored transfers/bills)",
      cents: -spentCents,
      tone: "neutral" as const,
    },
    {
      label: "Saved",
      hint: "Moved to savings",
      cents: -savingsMovedCents,
      tone: "neutral" as const,
    },
    {
      label: "Left",
      hint: "Safe to spend",
      cents: safeToSpendCents,
      tone: safeToSpendCents < 0 ? ("bad" as const) : ("good" as const),
    },
  ];

  return (
    <Panel className="mt-4">
      <div className="mb-4">
        <p className="text-sm uppercase tracking-[0.14em] text-ink-muted">
          Month review
        </p>
        <p className="mt-1 text-sm text-ink-muted">{monthLabel}</p>
      </div>
      <ul className="divide-y divide-line">
        {rows.map((row) => (
          <li
            key={row.label}
            className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
          >
            <div>
              <p
                className={`font-medium ${
                  row.tone === "good"
                    ? "text-safe"
                    : row.tone === "bad"
                      ? "text-danger"
                      : ""
                }`}
              >
                {row.label}
              </p>
              <p className="text-xs text-ink-muted">{row.hint}</p>
            </div>
            <p
              className={`text-lg font-medium ${
                row.tone === "good"
                  ? "text-safe"
                  : row.tone === "bad"
                    ? "text-danger"
                    : row.cents < 0
                      ? "text-ink"
                      : ""
              }`}
            >
              {row.cents < 0 ? "−" : ""}
              <Money cents={Math.abs(row.cents)} />
            </p>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
