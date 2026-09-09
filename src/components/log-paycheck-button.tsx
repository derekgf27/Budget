"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { logPaycheck } from "@/app/actions";
import {
  Field,
  buttonGhostClass,
  buttonPrimaryClass,
  inputClass,
} from "@/components/ui";

type JobOption = {
  id: string;
  name: string;
  nextPayday: string;
};

export function LogPaycheckButton({
  jobs,
  label = "Log paycheck",
  defaultJobId,
  defaultPaidOn,
  variant = "primary",
  className,
}: {
  jobs: JobOption[];
  label?: string;
  defaultJobId?: string;
  defaultPaidOn?: string;
  variant?: "primary" | "ghost" | "nav";
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [jobId, setJobId] = useState(defaultJobId || jobs[0]?.id || "");
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  const selected = jobs.find((j) => j.id === jobId) ?? jobs[0];
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  async function save(formData: FormData) {
    await logPaycheck(formData);
    setOpen(false);
    router.refresh();
  }

  if (jobs.length === 0) {
    return null;
  }

  const buttonClass =
    className ||
    (variant === "ghost"
      ? buttonGhostClass
      : variant === "nav"
        ? "flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-brand"
        : buttonPrimaryClass);

  return (
    <>
      <button
        type="button"
        className={buttonClass}
        onClick={() => {
          setJobId(defaultJobId || jobs[0]?.id || "");
          setOpen(true);
        }}
      >
        {variant === "nav" ? (
          <>
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-brand text-sm text-white">
              +
            </span>
            <span>{label}</span>
          </>
        ) : (
          label
        )}
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-brand/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md rounded-2xl border border-line bg-bg-elevated p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id={titleId} className="display text-2xl text-brand">
                  Log paycheck
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Enter the take-home amount you just received.
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-line px-2.5 py-1 text-sm text-ink-muted hover:bg-white"
              >
                Close
              </button>
            </div>

            <form action={save} className="grid gap-3">
              <Field label="Job">
                <select
                  name="incomeSourceId"
                  required
                  className={inputClass}
                  value={jobId}
                  onChange={(e) => setJobId(e.target.value)}
                >
                  {jobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Paid on">
                <input
                  key={`${selected?.id}-${defaultPaidOn || ""}`}
                  name="paidOn"
                  type="date"
                  required
                  className={inputClass}
                  defaultValue={
                    defaultPaidOn || selected?.nextPayday || today
                  }
                />
              </Field>
              <Field label="Actual take-home ($)">
                <input
                  name="amount"
                  required
                  autoFocus
                  className={inputClass}
                  placeholder="e.g. 2147.32"
                />
              </Field>
              <Field label="Note (optional)">
                <input
                  name="note"
                  className={inputClass}
                  placeholder="Overtime, tips…"
                />
              </Field>
              <button type="submit" className={buttonPrimaryClass}>
                Save amount
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
