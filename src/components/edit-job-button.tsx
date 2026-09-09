"use client";

import { useEffect, useId, useRef, useState } from "react";
import { IncomeForm } from "@/components/income-form";
import { buttonGhostClass } from "@/components/ui";

type JobInitial = {
  id: string;
  name: string;
  amount: string;
  cadence: string;
  paydayDay: number | null;
  nextPayday: string;
  amountVaries: boolean;
  colorKey?: string | null;
};

export function EditJobButton({ initial }: { initial: JobInitial }) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

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

  return (
    <>
      <button
        type="button"
        className={buttonGhostClass}
        onClick={() => setOpen(true)}
      >
        Edit
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
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-line bg-bg-elevated p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id={titleId} className="display text-2xl text-brand">
                  Edit schedule
                </h2>
                <p className="mt-1 text-sm text-ink-muted">{initial.name}</p>
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
            <IncomeForm
              submitLabel="Update job"
              initial={initial}
              onSuccess={() => setOpen(false)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
