import { deleteBill, markBillPaid } from "@/app/actions";
import { AddBillButton } from "@/components/add-bill-button";
import { BillForm } from "@/components/bill-form";
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
              <li key={bill.id} className="px-4 py-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{bill.name}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-sm text-ink-muted">
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
                        <span className="text-safe">Next due paid</span>
                      ) : null}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Money cents={bill.amountCents} className="font-medium" />
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
                    <form action={deleteBill}>
                      <input type="hidden" name="id" value={bill.id} />
                      <button type="submit" className={buttonDangerClass}>
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
                <details className="mt-2 group">
                  <summary className="cursor-pointer text-sm text-brand-soft hover:underline">
                    Edit
                  </summary>
                  <div className="mt-2 rounded-lg border border-line bg-white/70 p-3">
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
