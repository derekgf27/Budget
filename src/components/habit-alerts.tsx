"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { LogPaycheckButton } from "@/components/log-paycheck-button";
import { Money } from "@/components/ui";
import { formatDisplayDate } from "@/lib/money";
import type {
  CategoryGuardrail,
  PaydayReminder,
  SafeSpendGuardrail,
} from "@/lib/habits";

type JobOption = {
  id: string;
  name: string;
  nextPayday: string;
};

function useDismissed(key: string) {
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(key) === "1");
    } catch {
      setDismissed(false);
    }
    setReady(true);
  }, [key]);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* ignore */
    }
  }

  return { dismissed, dismiss, ready };
}

function AlertRow({
  title,
  body,
  tone,
  storageKey,
  actions,
}: {
  title: string;
  body: ReactNode;
  tone: "payday" | "warn";
  storageKey: string;
  actions?: ReactNode;
}) {
  const { dismissed, dismiss, ready } = useDismissed(storageKey);

  // Wait for localStorage before deciding — avoids flash / false empty state
  if (!ready || dismissed) return null;

  return (
    <li
      className={`flex flex-wrap items-start justify-between gap-2 border-t border-line px-1 py-2 first:border-t-0 first:pt-0 ${
        tone === "warn" ? "border-l-[3px] border-l-danger pl-3" : ""
      }`}
    >
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{title}</p>
        <div className="mt-1 text-sm text-ink">{body}</div>
        {actions ? <div className="mt-2 flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      <button
        type="button"
        className="shrink-0 text-sm underline-offset-2 hover:underline"
        onClick={dismiss}
      >
        Dismiss
      </button>
    </li>
  );
}

/** Bottom-of-home alerts: payday nudges + budget guardrails. */
export function HomeAlerts({
  reminders,
  jobs,
  safe,
  categories,
  monthKey,
}: {
  reminders: PaydayReminder[];
  jobs: JobOption[];
  safe: SafeSpendGuardrail | null;
  categories: CategoryGuardrail[];
  monthKey: string;
}) {
  const hasAnyAlert =
    reminders.length > 0 || safe != null || categories.length > 0;
  if (!hasAnyAlert) return null;

  return (
    <section
      className="notebook-sheet hidden px-4 py-3 has-[li]:block"
      aria-label="Alerts"
    >
      <p className="text-xs font-medium uppercase tracking-[0.14em] text-ink-muted">
        Alerts
      </p>
      <ul className="mt-3">
        {reminders.map((r) => {
          const when =
            r.daysUntil === 0
              ? "today"
              : r.daysUntil === 1
                ? "tomorrow"
                : formatDisplayDate(r.date);
          return (
            <AlertRow
              key={`payday-${r.jobId}`}
              storageKey={`splitbook:home-alert:payday:${monthKey}:${r.jobId}:${r.date}`}
              tone="payday"
              title={`${r.jobName} payday ${r.daysUntil === 0 ? "is today" : r.daysUntil === 1 ? "is tomorrow" : `· ${when}`}`}
              body={
                <>Log pay · clear transactions · mark bills · move savings.</>
              }
              actions={
                <>
                  <LogPaycheckButton
                    jobs={jobs}
                    label="Log paycheck"
                    defaultJobId={r.jobId}
                    defaultPaidOn={r.date}
                  />
                  <Link
                    href="/transactions"
                    className="rounded-sm border border-line px-3 py-2 text-sm hover:bg-bg-elevated"
                  >
                    Review transactions
                  </Link>
                </>
              }
            />
          );
        })}

        {safe ? (
          <AlertRow
            key={`safe-${safe.kind}`}
            storageKey={`splitbook:home-alert:safe:${monthKey}:${safe.kind}`}
            tone="warn"
            title={
              safe.kind === "negative"
                ? "Safe to spend is underwater"
                : "Safe to spend is running low"
            }
            body={
              safe.kind === "negative" ? (
                <>
                  Plans and spending exceed income by{" "}
                  <Money cents={Math.abs(safe.safeToSpendCents)} />. Trim bills,
                  savings, or hold off discretionary spend.
                </>
              ) : (
                <>
                  Only <Money cents={safe.safeToSpendCents} /> left with{" "}
                  {safe.daysLeft} days in the month — go easy until the next
                  paycheck.
                </>
              )
            }
          />
        ) : null}

        {categories.length > 0 ? (
          <AlertRow
            storageKey={`splitbook:home-alert:cats:${monthKey}:${categories
              .map((c) => `${c.categoryId}:${c.over ? "o" : "w"}`)
              .join(",")}`}
            tone="warn"
            title={
              categories.filter((c) => c.over).length === categories.length
                ? `${categories.length} ${
                    categories.length === 1 ? "category is" : "categories are"
                  } over budget`
                : `${categories.length} ${
                    categories.length === 1 ? "category" : "categories"
                  } near or over limit`
            }
            body={
              <>
                {categories
                  .map((c) => `${c.name} ${c.pct}%`)
                  .join(" · ")}
                . Pause or reallocate on Budget.
              </>
            }
            actions={
              <Link
                href="/budget"
                className="rounded-sm border border-line px-3 py-2 text-sm hover:bg-bg-elevated"
              >
                Open Budget
              </Link>
            }
          />
        ) : null}
      </ul>
    </section>
  );
}
