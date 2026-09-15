"use client";

import { useEffect, useId, useRef, useState } from "react";
import { CsvImportForm } from "@/components/csv-import";
import { PlaidConnectButton, SyncPlaidButton } from "@/components/plaid-connect";
import { buttonPrimaryClass } from "@/components/ui";

export function AddAccountButton({ plaidEnabled }: { plaidEnabled: boolean }) {
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
        className={buttonPrimaryClass}
        onClick={() => setOpen(true)}
      >
        Add account
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
                  Add an account
                </h2>
                <p className="mt-1 text-sm text-ink-muted">
                  Connect with Plaid or import a CSV statement.
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

            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-brand">Plaid</h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Link a bank or card, then sync transactions on demand.
                </p>
                <div className="mt-3 flex flex-wrap gap-3">
                  <PlaidConnectButton enabled={plaidEnabled} />
                  {plaidEnabled ? <SyncPlaidButton /> : null}
                </div>
              </div>
              <div className="border-t border-line pt-6">
                <h3 className="font-medium text-brand">CSV import</h3>
                <div className="mt-3">
                  <CsvImportForm defaultName="Apple Card" />
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
