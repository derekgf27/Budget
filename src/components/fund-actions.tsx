"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { transferSavings } from "@/app/actions";
import {
  Field,
  Money,
  buttonGhostClass,
  buttonPrimaryClass,
  inputClass,
} from "@/components/ui";

export function FundActions({
  savingsId,
  name,
  balanceCents,
}: {
  savingsId: string;
  name: string;
  balanceCents: number;
}) {
  const [mode, setMode] = useState<"deposit" | "withdraw" | null>(null);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (!mode) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMode(null);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [mode]);

  async function save(formData: FormData) {
    await transferSavings(formData);
    setMode(null);
    router.refresh();
  }

  return (
    <>
      <div className="mt-1 flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonPrimaryClass}
          onClick={() => setMode("deposit")}
        >
          Add money
        </button>
        <button
          type="button"
          className={buttonGhostClass}
          onClick={() => setMode("withdraw")}
        >
          Withdraw
        </button>
      </div>

      {mode ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-brand/40 backdrop-blur-[2px]"
            onClick={() => setMode(null)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 w-full max-w-md notebook-sheet notebook-margin p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id={titleId} className="display text-2xl text-brand">
                  {mode === "deposit" ? "Add money" : "Withdraw"}
                </h2>
                <p className="mt-1 text-sm text-ink">
                  {name} · balance <Money cents={balanceCents} />
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setMode(null)}
                className="rounded-sm border border-line px-2.5 py-1 text-sm hover:bg-bg-elevated"
              >
                Close
              </button>
            </div>
            <form action={save} className="grid gap-3">
              <input type="hidden" name="savingsId" value={savingsId} />
              <input type="hidden" name="direction" value={mode} />
              <Field label="Amount ($)">
                <input
                  name="amount"
                  required
                  autoFocus
                  className={inputClass}
                  placeholder="100"
                />
              </Field>
              <Field label="Date">
                <input
                  name="transferredOn"
                  type="date"
                  required
                  className={inputClass}
                  defaultValue={today}
                />
              </Field>
              <Field label="Note (optional)">
                <input
                  name="note"
                  className={inputClass}
                  placeholder={
                    mode === "deposit" ? "From paycheck…" : "Used for…"
                  }
                />
              </Field>
              <button
                type="submit"
                className={
                  mode === "deposit" ? buttonPrimaryClass : buttonGhostClass
                }
              >
                {mode === "deposit" ? "Add money" : "Withdraw"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
