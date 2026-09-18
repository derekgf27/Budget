import { desc } from "drizzle-orm";
import { deleteIncome, deletePaycheckLog } from "@/app/actions";
import { AddJobButton } from "@/components/add-job-button";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { EditJobButton } from "@/components/edit-job-button";
import { JobDot } from "@/components/job-tag";
import { LogPaycheckButton } from "@/components/log-paycheck-button";
import { ScanPaychecksButton } from "@/components/scan-paychecks-button";
import { Money, PageHeader, Panel } from "@/components/ui";
import { getDb, hasDatabase } from "@/db";
import { incomeSources, paycheckLogs } from "@/db/schema";
import { formatDisplayDate } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function PaychecksPage() {
  if (!hasDatabase()) {
    return (
      <PageHeader title="Paychecks" description="Add DATABASE_URL to continue." />
    );
  }

  const db = getDb();
  const incomes = await db.select().from(incomeSources);
  const logs = await db
    .select()
    .from(paycheckLogs)
    .orderBy(desc(paycheckLogs.paidOn))
    .limit(40);

  const today = new Date().toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Paychecks"
        description="Jobs can auto-log from imported deposit matches."
        action={
          <div className="flex flex-wrap items-start justify-end gap-2">
            <ScanPaychecksButton />
            <AddJobButton />
          </div>
        }
      />

      {incomes.length === 0 ? (
        <Panel>
          <div className="py-10 text-center">
            <p className="text-ink-muted">No jobs yet.</p>
            <div className="mt-4 flex justify-center">
              <AddJobButton />
            </div>
          </div>
        </Panel>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {incomes.map((inc) => {
            const jobLogs = logs.filter((l) => l.incomeSourceId === inc.id);
            const latest = jobLogs[0];

            return (
              <li key={inc.id}>
                <Panel className="h-full !p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-lg font-medium">
                        <JobDot id={inc.id} colorKey={inc.colorKey} />
                        {inc.name}
                      </p>
                      {inc.depositMatch ? (
                        <p className="mt-0.5 text-xs text-ink-muted">
                          Bank match: {inc.depositMatch}
                        </p>
                      ) : (
                        <p className="mt-0.5 text-xs text-amber-800/80">
                          Set a bank match keyword in Edit
                        </p>
                      )}
                      {latest ? (
                        <p className="mt-1.5 text-base">
                          <span className="text-xs text-ink-muted">Last paid</span>
                          <span className="mt-0.5 block font-medium">
                            <Money cents={latest.amountCents} />
                            <span className="ml-2 text-sm font-normal text-ink-muted">
                              {formatDisplayDate(latest.paidOn)}
                            </span>
                          </span>
                        </p>
                      ) : (
                        <p className="mt-1.5 text-sm text-ink-muted">
                          No paycheck logged yet
                        </p>
                      )}
                      <p className="mt-1 text-xs text-ink-muted">
                        Approx. next · {formatDisplayDate(inc.nextPayday)}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {inc.amountVaries ? (
                        <LogPaycheckButton
                          jobs={[
                            {
                              id: inc.id,
                              name: inc.name,
                              nextPayday: inc.nextPayday,
                            },
                          ]}
                          label="Log paycheck"
                          variant="primary"
                          defaultJobId={inc.id}
                          defaultPaidOn={inc.nextPayday || today}
                        />
                      ) : null}
                      <EditJobButton
                        initial={{
                          id: inc.id,
                          name: inc.name,
                          amount:
                            inc.netAmountCents > 0
                              ? (inc.netAmountCents / 100).toFixed(2)
                              : "",
                          cadence: inc.cadence,
                          paydayDay: inc.paydayDay,
                          nextPayday: inc.nextPayday,
                          amountVaries: inc.amountVaries,
                          colorKey: inc.colorKey,
                          depositMatch: inc.depositMatch,
                        }}
                      />
                      <ConfirmDeleteForm
                        action={deleteIncome}
                        itemName={inc.name}
                        buttonClassName="px-1 text-sm text-danger/80 hover:text-danger"
                        confirmLabel="This removes the job and its paycheck history."
                      >
                        <input type="hidden" name="id" value={inc.id} />
                      </ConfirmDeleteForm>
                    </div>
                  </div>

                  {jobLogs.length > 0 ? (
                    <details className="mt-3 group">
                      <summary className="cursor-pointer text-sm text-brand-soft hover:underline">
                        History ({jobLogs.length})
                      </summary>
                      <ul className="mt-2 space-y-2 rounded-lg border border-line bg-paper/80 p-3">
                        {jobLogs.slice(0, 8).map((log) => (
                          <li
                            key={log.id}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <span>
                              {formatDisplayDate(log.paidOn)}
                              {log.note ? (
                                <span className="text-ink-muted">
                                  {" "}
                                  · {log.note}
                                </span>
                              ) : null}
                            </span>
                            <span className="flex items-center gap-2">
                              <Money
                                cents={log.amountCents}
                                className="font-medium"
                              />
                              <ConfirmDeleteForm
                                action={deletePaycheckLog}
                                itemName={`paycheck on ${formatDisplayDate(log.paidOn)}`}
                                buttonLabel="Remove"
                                buttonClassName="text-xs text-danger/70 hover:text-danger"
                                confirmLabel="This removes that paycheck log only."
                              >
                                <input type="hidden" name="id" value={log.id} />
                              </ConfirmDeleteForm>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  ) : null}
                </Panel>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
