import { desc } from "drizzle-orm";
import { deleteIncome, deletePaycheckLog } from "@/app/actions";
import { AddJobButton } from "@/components/add-job-button";
import { EditJobButton } from "@/components/edit-job-button";
import { JobDot } from "@/components/job-tag";
import { LogPaycheckButton } from "@/components/log-paycheck-button";
import { Money, PageHeader, Panel } from "@/components/ui";
import { getDb, hasDatabase } from "@/db";
import { incomeSources, paycheckLogs } from "@/db/schema";
import { formatDisplayDate, parseDate } from "@/lib/money";

export const dynamic = "force-dynamic";

function paydayCue(iso: string, today = new Date()): string | null {
  const payday = parseDate(iso);
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const days = Math.round(
    (payday.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return null;
}

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
        description="Your jobs and next paydays."
        action={<AddJobButton />}
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
            const cue = paydayCue(inc.nextPayday);

            return (
              <li key={inc.id}>
                <Panel className="h-full !p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-lg font-medium">
                        <JobDot id={inc.id} colorKey={inc.colorKey} />
                        {inc.name}
                      </p>
                      <p className="mt-1.5">
                        <span className="text-xs text-ink-muted">Next</span>
                        <span className="mt-0.5 flex flex-wrap items-baseline gap-2">
                          <span className="text-base font-medium text-ink">
                            {formatDisplayDate(inc.nextPayday)}
                          </span>
                          {cue ? (
                            <span className="text-xs font-medium text-brand-soft">
                              {cue}
                            </span>
                          ) : null}
                        </span>
                      </p>
                      {latest ? (
                        <p className="mt-1 text-sm text-ink">
                          Last · <Money cents={latest.amountCents} className="font-medium" />
                        </p>
                      ) : null}
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
                        }}
                      />
                      <form action={deleteIncome}>
                        <input type="hidden" name="id" value={inc.id} />
                        <button
                          type="submit"
                          className="px-1 text-sm text-danger/80 hover:text-danger"
                        >
                          Delete
                        </button>
                      </form>
                    </div>
                  </div>

                  {jobLogs.length > 0 ? (
                    <details className="mt-3 group">
                      <summary className="cursor-pointer text-sm text-brand-soft hover:underline">
                        History ({jobLogs.length})
                      </summary>
                      <ul className="mt-2 space-y-2 rounded-lg border border-line bg-white/70 p-3">
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
                              <form action={deletePaycheckLog}>
                                <input type="hidden" name="id" value={log.id} />
                                <button
                                  type="submit"
                                  className="text-xs text-danger/70 hover:text-danger"
                                >
                                  Remove
                                </button>
                              </form>
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
