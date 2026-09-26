"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createManualAccount } from "@/app/actions";
import {
  Field,
  buttonGhostClass,
  buttonPrimaryClass,
  inputClass,
} from "@/components/ui";
import { defaultCardDueDate } from "@/lib/accounts";

export function AddManualAccountButton({
  kind = "credit",
}: {
  kind?: "credit" | "depository";
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
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

  async function save(formData: FormData) {
    setBusy(true);
    setError("");
    try {
      await createManualAccount(formData);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={buttonGhostClass}
        onClick={() => setOpen(true)}
      >
        {kind === "depository" ? "Track bank" : "Track card"}
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
                  {kind === "depository" ? "Track a bank" : "Track a card"}
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  {kind === "depository"
                    ? "Cash on hand you can update whenever the bank app changes."
                    : "What you still owe this cycle — due date is when it must be paid."}
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md border border-line px-2.5 py-1 text-sm text-ink-muted hover:bg-bg-elevated"
              >
                Close
              </button>
            </div>

            <form action={save} className="grid gap-3">
              <input type="hidden" name="accountType" value={kind} />
              <Field label={kind === "depository" ? "Bank name" : "Card name"}>
                <input
                  name="name"
                  className={inputClass}
                  placeholder={
                    kind === "depository"
                      ? "e.g. Popular checking"
                      : "e.g. Store card"
                  }
                  defaultValue={
                    kind === "depository" ? "Popular checking" : ""
                  }
                  required
                />
              </Field>
              <Field
                label={
                  kind === "depository"
                    ? "Balance now ($)"
                    : "What you owe this cycle ($)"
                }
              >
                <input
                  name="balance"
                  className={inputClass}
                  placeholder="0.00"
                  inputMode="decimal"
                  defaultValue="0"
                />
              </Field>
              {kind === "credit" ? (
                <Field label="Due date">
                  <input
                    name="dueDate"
                    type="date"
                    className={inputClass}
                    defaultValue={defaultCardDueDate()}
                    required
                  />
                </Field>
              ) : null}
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className={buttonPrimaryClass}
              >
                {busy
                  ? "Saving…"
                  : kind === "depository"
                    ? "Add bank"
                    : "Add card"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
