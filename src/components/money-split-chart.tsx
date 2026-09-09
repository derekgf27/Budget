"use client";

import { JobTag } from "@/components/job-tag";
import { LogPaycheckButton } from "@/components/log-paycheck-button";
import { Money, Panel } from "@/components/ui";
import type { MoneySplit } from "@/lib/money";
import { formatDisplayDate } from "@/lib/money";

type JobOption = {
  id: string;
  name: string;
  nextPayday: string;
  colorKey?: string | null;
};

type Slice = {
  key: string;
  label: string;
  hint: string;
  cents: number;
  color: string;
  emphasize?: boolean;
};

export function MoneySplitChart({
  split,
  jobs,
}: {
  split: MoneySplit;
  jobs: JobOption[];
}) {
  const pocketCents = split.safeToSpendCents;
  const daysLabel =
    split.daysLeft === 0
      ? "Last day"
      : split.daysLeft === 1
        ? "1 day left"
        : `${split.daysLeft} days left`;

  const fundingJobs = split.incomeByJob.filter((j) => j.fundsWindow);
  const colorById = new Map(jobs.map((j) => [j.id, j.colorKey]));

  const slices: Slice[] = [
    {
      key: "bills",
      label: "Bills",
      hint: "Due this window",
      cents: split.billsCents,
      color: "#0b3d34",
    },
    {
      key: "savings",
      label: "Savings",
      hint: "Planned this window",
      cents: split.savingsCents,
      color: "#2f6fed",
    },
    {
      key: "spent",
      label: "Already spent",
      hint: "Cards so far",
      cents: split.spentCents,
      color: "#7a8f86",
    },
    {
      key: "pocket",
      label: "In your pocket",
      hint: "Safe to spend",
      cents: Math.max(pocketCents, 0),
      color: "#1f7a4c",
      emphasize: true,
    },
  ];

  const barTotal = Math.max(
    split.incomeCents,
    slices.reduce((sum, s) => sum + Math.max(s.cents, 0), 0),
    1,
  );

  const shortfall = pocketCents < 0 ? Math.abs(pocketCents) : 0;

  return (
    <Panel>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.14em] text-ink-muted">
            Where this paycheck goes
          </p>
          <p className="mt-1 text-sm text-ink-muted">
            {formatDisplayDate(split.periodStart)} →{" "}
            {formatDisplayDate(split.periodEnd)} · {daysLabel}
          </p>
        </div>
        <div className="text-right">
          <p className="text-sm text-ink-muted">Income</p>
          <p className="text-xl font-medium">
            <Money cents={split.incomeCents} />
          </p>
        </div>
      </div>

      {fundingJobs.length > 0 ? (
        <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-sm">
          {fundingJobs.map((job) => (
            <li key={job.id} className="flex items-center gap-2">
              <JobTag
                id={job.id}
                name={job.name}
                colorKey={colorById.get(job.id)}
              />
              {!job.logged ? (
                <LogPaycheckButton
                  jobs={jobs}
                  label="Log"
                  variant="ghost"
                  defaultJobId={job.id}
                  defaultPaidOn={job.payday}
                />
              ) : (
                <Money cents={job.amountCents} className="font-medium" />
              )}
            </li>
          ))}
        </ul>
      ) : null}

      <div className="mt-6 overflow-hidden rounded-full bg-line">
        <div className="flex h-3 w-full">
          {slices
            .filter((s) => s.cents > 0)
            .map((s) => (
              <div
                key={s.key}
                title={`${s.label}: ${centsLabel(s.cents)}`}
                style={{
                  width: `${(s.cents / barTotal) * 100}%`,
                  backgroundColor: s.color,
                }}
              />
            ))}
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {slices.map((s) => (
          <li
            key={s.key}
            className={`flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 ${
              s.emphasize ? "bg-safe/10" : "bg-white/50"
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              <div>
                <p className={`font-medium ${s.emphasize ? "text-safe" : ""}`}>
                  {s.label}
                </p>
                <p className="text-xs text-ink-muted">{s.hint}</p>
              </div>
            </div>
            <p
              className={`text-lg font-medium ${s.emphasize ? "text-safe" : ""}`}
            >
              <Money cents={s.cents} />
            </p>
          </li>
        ))}
      </ul>

      {shortfall > 0 ? (
        <p className="mt-4 text-sm text-danger">
          Plans exceed income by <Money cents={shortfall} /> — log a paycheck or
          lower savings/bills for this window.
        </p>
      ) : null}

      {split.incomeCents === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          Log the paycheck that started this window to see a real split.
        </p>
      ) : null}
    </Panel>
  );
}

function centsLabel(cents: number) {
  return (cents / 100).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  });
}
