"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { markBillPaid, transferSavings } from "@/app/actions";
import { JobTag } from "@/components/job-tag";
import { Money } from "@/components/ui";

type ChecklistBill = {
  billId: string;
  name: string;
  date: string;
  amountCents: number;
  incomeSourceId?: string | null;
  incomeName?: string | null;
  incomeColorKey?: string | null;
};

type ChecklistSavings = {
  id: string;
  name: string;
  kind: "goal" | "fund";
  plannedCents: number;
  movedThisHalf: boolean;
};

const compactBtn =
  "rounded-sm bg-nav px-2.5 py-1 text-xs font-medium text-white hover:opacity-90";

function StepMark({ done, n }: { done: boolean; n: number }) {
  return (
    <span
      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${
        done
          ? "border-safe bg-safe text-white"
          : "border-brand/40 text-brand"
      }`}
      aria-hidden
    >
      {done ? "✓" : n}
    </span>
  );
}

export function MonthChecklist({
  halfLabel,
  importDone,
  hasCsvAccounts,
  uncategorizedCount,
  unpaidBills,
  savingsItems,
}: {
  halfLabel: string;
  /** A CSV statement was imported this half — not a manual balance edit. */
  importDone: boolean;
  hasCsvAccounts: boolean;
  uncategorizedCount: number;
  unpaidBills: ChecklistBill[];
  savingsItems: ChecklistSavings[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const showImport = hasCsvAccounts;
  const planned = savingsItems.filter((s) => s.plannedCents > 0);
  const showSavings = planned.length > 0;
  const categorizeDone = uncategorizedCount === 0;
  const billsDone = unpaidBills.length === 0;
  const savingsDone = planned.every((s) => s.movedThisHalf);

  const allDone =
    (!showImport || importDone) &&
    categorizeDone &&
    billsDone &&
    (!showSavings || savingsDone);

  let step = 1;

  async function payBill(formData: FormData) {
    await markBillPaid(formData);
    router.refresh();
  }

  async function moveSavings(formData: FormData) {
    await transferSavings(formData);
    router.refresh();
  }

  return (
    <section className="notebook-sheet notebook-margin px-5 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold text-brand">This check-in</h2>
          <p className="text-xs text-ink-muted">{halfLabel} · twice a month</p>
        </div>
        {allDone ? (
          <span className="text-xs font-medium text-safe">Complete ✓</span>
        ) : null}
      </div>

      <ol className="mt-4 divide-y divide-rule">
        {showImport ? (
          <li className="flex gap-3 py-3 first:pt-0">
            <StepMark done={importDone} n={step++} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Import statement</p>
              {importDone ? (
                <p className="mt-1 text-xs text-safe">
                  CSV imported for this half.
                </p>
              ) : (
                <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-ink-muted">
                    Pull a fresh CSV — saving a balance doesn’t count.
                  </p>
                  <Link href="/accounts" className={compactBtn}>
                    Import
                  </Link>
                </div>
              )}
            </div>
          </li>
        ) : null}

        <li className="flex gap-3 py-3 first:pt-0">
          <StepMark done={categorizeDone} n={step++} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Categorize spending</p>
            {categorizeDone ? (
              <p className="mt-1 text-xs text-safe">All expenses categorized.</p>
            ) : (
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-ink-muted">
                  {uncategorizedCount} left to categorize
                </p>
                <Link href="/transactions" className={compactBtn}>
                  Review
                </Link>
              </div>
            )}
          </div>
        </li>

        <li className="flex gap-3 py-3">
          <StepMark done={billsDone} n={step++} />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">Mark bills this month</p>
            {billsDone ? (
              <p className="mt-1 text-xs text-safe">No bills left this month.</p>
            ) : (
              <ul className="mt-1.5 space-y-2">
                {unpaidBills.map((bill) => (
                  <li
                    key={`${bill.billId}-${bill.date}`}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="text-xs font-medium">{bill.name}</p>
                      {bill.incomeSourceId && bill.incomeName ? (
                        <JobTag
                          id={bill.incomeSourceId}
                          name={bill.incomeName}
                          colorKey={bill.incomeColorKey}
                          className="text-[11px]"
                        />
                      ) : null}
                    </div>
                    <div className="flex items-center gap-2">
                      <Money
                        cents={bill.amountCents}
                        className="text-xs font-medium"
                      />
                      <form action={payBill}>
                        <input type="hidden" name="billId" value={bill.billId} />
                        <input type="hidden" name="dueDate" value={bill.date} />
                        <input type="hidden" name="paidOn" value={today} />
                        <button type="submit" className={compactBtn}>
                          Paid
                        </button>
                      </form>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </li>

        {showSavings ? (
          <li className="flex gap-3 py-3 last:pb-0">
            <StepMark done={savingsDone} n={step++} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Set aside savings</p>
              {savingsDone ? (
                <p className="mt-1 text-xs text-safe">
                  Savings moved for this half.
                </p>
              ) : (
                <ul className="mt-1.5 space-y-2">
                  {planned.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <p className="text-xs font-medium">{item.name}</p>
                      {item.movedThisHalf ? (
                        <span className="text-xs text-safe">Moved</span>
                      ) : (
                        <form action={moveSavings}>
                          <input type="hidden" name="savingsId" value={item.id} />
                          <input type="hidden" name="direction" value="deposit" />
                          <input
                            type="hidden"
                            name="amount"
                            value={(item.plannedCents / 100).toFixed(2)}
                          />
                          <input
                            type="hidden"
                            name="transferredOn"
                            value={today}
                          />
                          <input
                            type="hidden"
                            name="note"
                            value="Month check-in"
                          />
                          <button type="submit" className={compactBtn}>
                            Move <Money cents={item.plannedCents} />
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ) : null}
      </ol>
    </section>
  );
}
