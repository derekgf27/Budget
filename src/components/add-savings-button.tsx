"use client";

import { useEffect, useId, useRef, useState } from "react";
import { SavingsForm } from "@/components/savings-form";
import { buttonGhostClass, buttonPrimaryClass } from "@/components/ui";

export function AddSavingsButton() {
  const [open, setOpen] = useState<"goal" | "fund" | null>(null);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
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
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonGhostClass}
          onClick={() => setOpen("fund")}
        >
          Add fund
        </button>
        <button
          type="button"
          className={buttonPrimaryClass}
          onClick={() => setOpen("goal")}
        >
          Add goal
        </button>
      </div>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-brand/40 backdrop-blur-[2px]"
            onClick={() => setOpen(null)}
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
                  {open === "fund" ? "Add a savings fund" : "Add a savings goal"}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {open === "fund"
                    ? "A flexible pot — deposit any amount whenever you want."
                    : "Track a target and planned contribution each paycheck window."}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(null)}
                className="rounded-md border border-line px-2.5 py-1 text-sm text-ink-muted hover:bg-white"
              >
                Close
              </button>
            </div>
            <SavingsForm
              forcedKind={open}
              onSuccess={() => setOpen(null)}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
