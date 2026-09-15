import { deleteBill, markBillPaid } from "@/app/actions";
import { AddBillButton } from "@/components/add-bill-button";
import { BillForm } from "@/components/bill-form";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { JobTag } from "@/components/job-tag";
import {
  Money,
  PageHeader,
  Panel,
  buttonDangerClass,
  buttonPrimaryClass,
} from "@/components/ui";
import { getDb, hasDatabase } from "@/db";
import { billPayments, bills, incomeSources } from "@/db/schema";
import { formatDisplayDate } from "@/lib/money";

export const dynamic = "force-dynamic";

function cadenceLabel(cadence: string) {
  const map: Record<string, string> = {
    weekly: "Weekly",
    biweekly: "Every 2 weeks",
    monthly: "Monthly",
    yearly: "Yearly",
  };
  return map[cadence] || cadence;
}

export default async function BillsPage() {
  if (!hasDatabase()) {
    return (
      <PageHeader title="Bills" description="Add DATABASE_URL to continue." />
    );
  }

  const db = getDb();
  const [billRows, incomes, payments] = await Promise.all([
    db.select().from(bills),
    db.select().from(incomeSources),
    db.select().from(billPayments),
  ]);

  const incomeOptions = incomes.map((i) => ({ id: i.id, name: i.name }));
  const paid = new Set(payments.map((p) => `${p.billId}:${p.dueDate}`));
  const today = new Date().toISOString().slice(0, 10);

  const sorted = [...billRows].sort((a, b) =>
    a.nextDueDate.localeCompare(b.nextDueDate),
  );

  return (
    <div>
      <PageHeader
        title="Bills"
        description="Your recurring bills and which paycheck usually covers them."
        action={<AddBillButton incomes={incomeOptions} />}
      />

      {sorted.length === 0 ? (
        <Panel>
          <div className="py-10 text-center">
            <p className="text-ink-muted">No bills yet.</p>
            <div className="mt-4 flex justify-center">
              <AddBillButton incomes={incomeOptions} />
            </div>
          </div>
        </Panel>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-bg-elevated/90">
          {sorted.map((bill) => {
            const income = incomes.find((i) => i.id === bill.incomeSourceId);
            const nextPaid = paid.has(`${bill.id}:${bill.nextDueDate}`);
            return (
              <li
                key={bill.id}
                className={`px-4 py-3 ${
                  nextPaid ? "bg-rule/30" : ""
                }`}
              >
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 sm:grid-cols-[minmax(0,1fr)_7.25rem_11.5rem] sm:items-center sm:gap-x-5">
                  <div className={`min-w-0 ${nextPaid ? "opacity-70" : ""}`}>
                    <div className="flex items-baseline justify-between gap-3 sm:block">
                      <p
                        className={`truncate font-medium leading-snug ${
                          nextPaid ? "text-ink-muted" : ""
                        }`}
                      >
                        {bill.name}
                      </p>
                      <span className="sm:hidden">
                        <span
                          className={`block text-right tabular-nums font-semibold ${
                            nextPaid ? "text-ink-muted" : ""
                          }`}
                        >
                          <Money cents={bill.amountCents} />
                        </span>
                      </span>
                    </div>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-muted sm:text-sm">
                      <span>
                        {cadenceLabel(bill.cadence)} · due{" "}
                        {formatDisplayDate(bill.nextDueDate)}
                      </span>
                      {income ? (
                        <JobTag
                          id={income.id}
                          name={income.name}
                          colorKey={income.colorKey}
                        />
                      ) : null}
                      {nextPaid ? (
                        <span className="font-medium text-safe">Paid</span>
                      ) : null}
                    </p>
                  </div>

                  <div
                    className={`hidden w-full justify-end sm:flex ${
                      nextPaid ? "opacity-70" : ""
                    }`}
                  >
                    <span className="block w-full text-right tabular-nums font-semibold">
                      <Money cents={bill.amountCents} />
                    </span>
                  </div>

                  <div className="col-span-2 flex flex-wrap items-center justify-end gap-2 sm:col-span-1">
                    {!nextPaid ? (
                      <form action={markBillPaid}>
                        <input type="hidden" name="billId" value={bill.id} />
                        <input
                          type="hidden"
                          name="dueDate"
                          value={bill.nextDueDate}
                        />
                        <input type="hidden" name="paidOn" value={today} />
                        <button type="submit" className={buttonPrimaryClass}>
                          Paid
                        </button>
                      </form>
                    ) : null}
                    <ConfirmDeleteForm
                      action={deleteBill}
                      itemName={bill.name}
                      buttonClassName={buttonDangerClass}
                      confirmLabel="This removes the bill and its payment history."
                    >
                      <input type="hidden" name="id" value={bill.id} />
                    </ConfirmDeleteForm>
                  </div>
                </div>
                <details className="mt-2 group">
                  <summary className="cursor-pointer text-sm text-brand-soft hover:underline">
                    Edit
                  </summary>
                  <div className="mt-2 rounded-lg border border-line bg-paper/80 p-3">
                    <BillForm
                      incomes={incomeOptions}
                      submitLabel="Update bill"
                      initial={{
                        id: bill.id,
                        name: bill.name,
                        amount: (bill.amountCents / 100).toFixed(2),
                        cadence: bill.cadence,
                        nextDueDate: bill.nextDueDate,
                        incomeSourceId: bill.incomeSourceId,
                      }}
                    />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
