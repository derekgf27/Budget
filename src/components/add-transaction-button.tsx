"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { addManualTransaction } from "@/app/actions";
import {
  Field,
  buttonGhostClass,
  buttonPrimaryClass,
  inputClass,
} from "@/components/ui";

type AccountOption = { id: string; label: string };
type CategoryOption = { id: string; name: string };

export function AddTransactionButton({
  accounts,
  categories,
}: {
  accounts: AccountOption[];
  categories: CategoryOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
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
    setBusy(true);
    setError("");
    try {
      await addManualTransaction(formData);
      setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save");
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
        Add transaction
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
            className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-line bg-bg-elevated p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id={titleId} className="display text-2xl text-brand">
                  Add transaction
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  For one-offs that aren’t on a statement yet.
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
              <Field label="Date">
                <input
                  name="date"
                  type="date"
                  className={inputClass}
                  defaultValue={today}
                  required
                />
              </Field>
              <Field label="Description">
                <input
                  name="name"
                  className={inputClass}
                  placeholder="e.g. Coffee or Venmo"
                  required
                />
              </Field>
              <Field label="Amount ($)">
                <input
                  name="amount"
                  className={inputClass}
                  placeholder="12.50"
                  inputMode="decimal"
                  required
                />
              </Field>
              <Field label="Type">
                <select name="kind" className={inputClass} defaultValue="expense">
                  <option value="expense">Expense</option>
                  <option value="deposit">Deposit / income</option>
                </select>
              </Field>
              {accounts.length > 0 ? (
                <Field label="Account (optional)">
                  <select name="accountId" className={inputClass} defaultValue="">
                    <option value="">None</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.label}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {categories.length > 0 ? (
                <Field label="Category (optional)">
                  <select
                    name="categoryId"
                    className={inputClass}
                    defaultValue=""
                  >
                    <option value="">Uncategorized</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <button
                type="submit"
                disabled={busy}
                className={buttonPrimaryClass}
              >
                {busy ? "Saving…" : "Save"}
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
