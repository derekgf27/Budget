import { markBillPaid, markBillUnpaid } from "@/app/actions";
import { JobTag } from "@/components/job-tag";
import { Money, buttonGhostClass, buttonPrimaryClass } from "@/components/ui";
import { formatDisplayDate, type BillThisMonth } from "@/lib/money";

const statusStyles: Record<
  BillThisMonth["status"],
  { label: string; className: string }
> = {
  paid: {
    label: "Paid",
    className: "bg-safe/15 text-safe",
  },
  upcoming: {
    label: "Upcoming",
    className: "bg-accent-soft text-brand",
  },
  overdue: {
    label: "Overdue",
    className: "bg-danger/10 text-danger",
  },
};

export function BillsThisMonth({
  monthLabel,
  bills,
  incomes = [],
}: {
  monthLabel: string;
  bills: BillThisMonth[];
  incomes?: { id: string; name: string; colorKey?: string | null }[];
}) {
  const incomeName = new Map(incomes.map((i) => [i.id, i.name]));
  const incomeColor = new Map(incomes.map((i) => [i.id, i.colorKey]));

  return (
    <section className="mt-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="display text-xl text-brand">Bills this month</h2>
          <p className="text-sm text-ink-muted">{monthLabel}</p>
        </div>
      </div>

      {bills.length === 0 ? (
        <div className="rounded-xl border border-line bg-bg-elevated/90 p-5 text-sm text-ink-muted">
          No bills scheduled this month.
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg-elevated/90">
          {bills.map((bill) => {
            const style = statusStyles[bill.status];
            const jobName = bill.incomeSourceId
              ? incomeName.get(bill.incomeSourceId)
              : null;
            const jobColorKey = bill.incomeSourceId
              ? incomeColor.get(bill.incomeSourceId)
              : null;
            return (
              <li
                key={`${bill.billId}-${bill.date}`}
                className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{bill.name}</p>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium ${style.className}`}
                    >
                      {style.label}
                    </span>
                  </div>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
                    <span>Due {formatDisplayDate(bill.date)}</span>
                    {bill.incomeSourceId && jobName ? (
                      <JobTag
                        id={bill.incomeSourceId}
                        name={jobName}
                        colorKey={jobColorKey}
                        className="text-sm"
                      />
                    ) : null}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Money cents={bill.amountCents} className="font-medium" />
                  {bill.status === "paid" ? (
                    <form action={markBillUnpaid}>
                      <input type="hidden" name="billId" value={bill.billId} />
                      <input type="hidden" name="dueDate" value={bill.date} />
                      <button type="submit" className={buttonGhostClass}>
                        Undo
                      </button>
                    </form>
                  ) : (
                    <form action={markBillPaid}>
                      <input type="hidden" name="billId" value={bill.billId} />
                      <input type="hidden" name="dueDate" value={bill.date} />
                      <button type="submit" className={buttonPrimaryClass}>
                        Paid
                      </button>
                    </form>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
