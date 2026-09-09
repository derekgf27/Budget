"use client";

import { useRouter } from "next/navigation";
import { markBillPaid, transferSavings } from "@/app/actions";
import { JobTag } from "@/components/job-tag";
import { LogPaycheckButton } from "@/components/log-paycheck-button";
import { Money, Panel } from "@/components/ui";

type JobOption = {
  id: string;
  name: string;
  nextPayday: string;
};

type FundingJob = {
  id: string;
  name: string;
  payday: string;
  amountCents: number;
  logged: boolean;
  colorKey?: string | null;
};

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
  movedThisWindow: boolean;
};

const compactBtn =
  "rounded-md bg-brand px-2.5 py-1 text-xs font-medium text-white hover:bg-brand-soft";
const compactGhost =
  "rounded-md border border-line px-2.5 py-1 text-xs text-ink hover:bg-white";

function StepBadge({ done, n }: { done: boolean; n: number }) {
  return (
    <span
      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[11px] font-medium ${
        done ? "bg-safe text-white" : "bg-brand text-white"
      }`}
      aria-hidden
    >
      {done ? "✓" : n}
    </span>
  );
}

export function PaydayChecklist({
  jobs,
  fundingJobs,
  unpaidBills,
  savingsItems,
}: {
  jobs: JobOption[];
  fundingJobs: FundingJob[];
  unpaidBills: ChecklistBill[];
  savingsItems: ChecklistSavings[];
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  const needsLog = fundingJobs.filter((j) => !j.logged);
  const logDone = needsLog.length === 0 && fundingJobs.length > 0;
  const logSkipped = fundingJobs.length === 0;

  const billsDone = unpaidBills.length === 0;
  const planned = savingsItems.filter((s) => s.plannedCents > 0);
  const savingsDone =
    planned.length === 0 || planned.every((s) => s.movedThisWindow);

  const allDone =
    (logDone || logSkipped) && billsDone && savingsDone && fundingJobs.length > 0;

  async function payBill(formData: FormData) {
    await markBillPaid(formData);
    router.refresh();
  }

  async function moveSavings(formData: FormData) {
    await transferSavings(formData);
    router.refresh();
  }

  return (
    <Panel className="mb-0 w-full !p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="display text-base text-brand">Payday checklist</h2>
        {allDone ? (
          <span className="rounded bg-safe/15 px-2 py-0.5 text-[11px] font-medium text-safe">
            Complete
          </span>
        ) : null}
      </div>

      <ol className="mt-2.5 space-y-1.5">
        <li className="rounded-md border border-line bg-white/60 px-2.5 py-2">
          <div className="flex gap-2">
            <StepBadge done={logDone || logSkipped} n={1} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">Log paycheck</p>
              {!logSkipped && logDone ? (
                <ul className="mt-1 space-y-1">
                  {fundingJobs.map((job) => (
                    <li
                      key={job.id}
                      className="flex flex-wrap items-center justify-between gap-2 text-xs"
                    >
                      <JobTag
                        id={job.id}
                        name={job.name}
                        colorKey={job.colorKey}
                        className="text-xs"
                      />
                      <Money cents={job.amountCents} className="font-medium" />
                    </li>
                  ))}
                </ul>
              ) : null}
              {!logSkipped && !logDone ? (
                <ul className="mt-1 space-y-1">
                  {fundingJobs.map((job) => (
                    <li
                      key={job.id}
                      className="flex flex-wrap items-center justify-between gap-2"
                    >
                      <JobTag
                        id={job.id}
                        name={job.name}
                        colorKey={job.colorKey}
                        className="text-xs"
                      />
                      {job.logged ? (
                        <Money cents={job.amountCents} className="text-xs font-medium" />
                      ) : (
                        <LogPaycheckButton
                          jobs={jobs}
                          label="Log"
                          variant="primary"
                          className={compactBtn}
                          defaultJobId={job.id}
                          defaultPaidOn={job.payday}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </li>

        <li className="rounded-md border border-line bg-white/60 px-2.5 py-2">
          <div className="flex gap-2">
            <StepBadge done={billsDone} n={2} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">Mark due bills</p>
              {billsDone ? (
                <p className="mt-1 text-xs text-safe">No unpaid bills in this window.</p>
              ) : (
                <ul className="mt-1 divide-y divide-line">
                  {unpaidBills.map((bill) => (
                    <li
                      key={`${bill.billId}-${bill.date}`}
                      className="flex flex-wrap items-center justify-between gap-2 py-1.5 first:pt-1"
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
                        <Money cents={bill.amountCents} className="text-xs font-medium" />
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
          </div>
        </li>

        <li className="rounded-md border border-line bg-white/60 px-2.5 py-2">
          <div className="flex gap-2">
            <StepBadge done={savingsDone} n={3} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-tight">Move savings</p>
              {savingsItems.length === 0 ? null : savingsDone && planned.length > 0 ? (
                <p className="mt-1 text-xs text-safe">Planned savings moved.</p>
              ) : (
                <ul className="mt-1 divide-y divide-line">
                  {savingsItems.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-2 py-1.5 first:pt-1"
                    >
                      <p className="text-xs font-medium">{item.name}</p>
                      {item.movedThisWindow && item.plannedCents > 0 ? (
                        <span className="text-xs text-safe">Moved</span>
                      ) : item.plannedCents > 0 ? (
                        <form action={moveSavings}>
                          <input type="hidden" name="savingsId" value={item.id} />
                          <input type="hidden" name="direction" value="deposit" />
                          <input
                            type="hidden"
                            name="amount"
                            value={(item.plannedCents / 100).toFixed(2)}
                          />
                          <input type="hidden" name="transferredOn" value={today} />
                          <input type="hidden" name="note" value="Payday checklist" />
                          <button type="submit" className={compactBtn}>
                            Move <Money cents={item.plannedCents} />
                          </button>
                        </form>
                      ) : (
                        <form action={moveSavings} className="flex items-center gap-1.5">
                          <input type="hidden" name="savingsId" value={item.id} />
                          <input type="hidden" name="direction" value="deposit" />
                          <input type="hidden" name="transferredOn" value={today} />
                          <input
                            name="amount"
                            required
                            placeholder="$"
                            className="w-16 rounded-md border border-line bg-white px-1.5 py-1 text-xs"
                          />
                          <button type="submit" className={compactGhost}>
                            Add
                          </button>
                        </form>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </li>
      </ol>
    </Panel>
  );
}
