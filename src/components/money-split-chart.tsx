"use client";

import { JobTag } from "@/components/job-tag";
import { LogPaycheckButton } from "@/components/log-paycheck-button";
import { Money, Panel } from "@/components/ui";
import { jobColor } from "@/lib/job-colors";
import type { MoneySplit } from "@/lib/money";

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
  monthLabel,
}: {
  split: MoneySplit;
  jobs: JobOption[];
  monthLabel?: string;
}) {
  const pocketCents = split.safeToSpendCents;
  const fundingJobs = split.incomeByJob.filter((j) => j.fundsWindow);
  const colorById = new Map(jobs.map((j) => [j.id, j.colorKey]));

  const incomeBar = fundingJobs
    .filter((job) => job.logged && job.amountCents > 0)
    .map((job) => {
      const color = jobColor(job.id, colorById.get(job.id) ?? null);
      return {
        key: job.id,
        label: job.name,
        cents: job.amountCents,
        color: color.dot,
      };
    });

  const barJobs =
    incomeBar.length > 0
      ? incomeBar
      : fundingJobs.map((job) => {
          const color = jobColor(job.id, colorById.get(job.id) ?? null);
          return {
            key: job.id,
            label: job.name,
            cents: job.amountCents,
            color: color.dot,
          };
        });

  const slices: Slice[] = [
    {
      key: "bills",
      label: "Bills",
      hint: "Reserved this month",
      cents: split.billsCents,
      color: "#243d34",
    },
    {
      key: "savings",
      label: "Savings",
      hint: "Both check-ins",
      cents: split.savingsCents,
      color: "#8a6d2e",
    },
    {
      key: "spent",
      label: "Already spent",
      hint: "After transfers & bill matches",
      cents: split.spentCents,
      color: "#6e7f76",
    },
    {
      key: "pocket",
      label: "Left",
      hint: "Safe to spend",
      cents: Math.max(pocketCents, 0),
      color: "#2a6b4a",
      emphasize: true,
    },
  ];

  const barTotal = Math.max(
    barJobs.reduce((sum, s) => sum + Math.max(s.cents, 0), 0),
    split.incomeCents,
    1,
  );

  const shortfall = pocketCents < 0 ? Math.abs(pocketCents) : 0;

  return (
    <Panel className="notebook-margin">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-brand">
            Where this month goes
          </h2>
          {monthLabel ? (
            <p className="mt-0.5 text-xs text-ink-muted">{monthLabel}</p>
          ) : null}
        </div>
        <div className="text-right">
          <p className="text-xs text-ink-muted">Made</p>
          <p className="text-lg font-semibold tabular-nums">
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

      <div className="mt-5 overflow-hidden rounded-sm bg-rule">
        <div className="flex h-2.5 w-full">
          {barJobs
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

      <ul className="mt-4 divide-y divide-rule">
        {slices.map((s) => (
          <li
            key={s.key}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
                aria-hidden
              />
              <div>
                <p
                  className={`text-sm font-medium ${s.emphasize ? "text-safe" : ""}`}
                >
                  {s.label}
                </p>
                <p className="text-xs text-ink-muted">{s.hint}</p>
              </div>
            </div>
            <p
              className={`text-base font-semibold tabular-nums ${
                s.emphasize ? "text-safe" : ""
              }`}
            >
              <Money cents={s.cents} />
            </p>
          </li>
        ))}
      </ul>

      {shortfall > 0 ? (
        <p className="mt-4 text-sm text-danger">
          Plans exceed income by <Money cents={shortfall} /> — log a paycheck or
          lower savings/bills for this month.
        </p>
      ) : null}

      {split.incomeCents === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          Log paychecks this month to see a real split.
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
