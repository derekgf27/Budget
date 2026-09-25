"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adjustAccountBalance,
  deleteAccount,
  hideAccount,
  renameAccount,
  updateAccountBalance,
} from "@/app/actions";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { CsvImportForm } from "@/components/csv-import";
import {
  Field,
  buttonGhostClass,
  buttonPrimaryClass,
  inputClass,
} from "@/components/ui";

type AccountActionsProps = {
  id: string;
  label: string;
  balance: string | null;
  source?: string;
};

export function AccountActions({
  id,
  label,
  balance,
  source,
}: AccountActionsProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"rename" | "balance" | "import" | null>(null);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

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

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {source !== "manual" ? (
          <button
            type="button"
            className={buttonGhostClass}
            onClick={() => setMode("import")}
          >
            Import CSV
          </button>
        ) : null}
        <button
          type="button"
          className={buttonGhostClass}
          onClick={() => setMode("rename")}
        >
          Rename
        </button>
        <button
          type="button"
          className={buttonGhostClass}
          onClick={() => setMode("balance")}
        >
          Balance
        </button>
        <form action={hideAccount}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="hidden" value="true" />
          <button
            type="submit"
            className="px-1 text-sm text-ink-muted hover:text-ink"
          >
            Hide
          </button>
        </form>
        <ConfirmDeleteForm
          action={deleteAccount}
          itemName={label}
          buttonLabel="Remove"
          buttonClassName="px-1 text-sm text-danger/80 hover:text-danger"
          confirmLabel="This removes the account and its imported transactions."
        >
          <input type="hidden" name="id" value={id} />
        </ConfirmDeleteForm>
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
            className="relative z-10 w-full max-w-md rounded-2xl border border-line bg-bg-elevated p-6 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id={titleId} className="display text-2xl text-brand">
                {mode === "rename"
                  ? "Rename account"
                  : mode === "balance"
                    ? "Update balance"
                    : "Import CSV"}
              </h2>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setMode(null)}
                className="rounded-md border border-line px-2.5 py-1 text-sm text-ink-muted hover:bg-bg-elevated"
              >
                Close
              </button>
            </div>

            {mode === "rename" ? (
              <form
                action={async (fd) => {
                  await renameAccount(fd);
                  setMode(null);
                  router.refresh();
                }}
                className="grid gap-3"
              >
                <input type="hidden" name="id" value={id} />
                <Field label="Display name">
                  <input
                    name="displayName"
                    className={inputClass}
                    defaultValue={label}
                    required
                  />
                </Field>
                <button type="submit" className={buttonPrimaryClass}>
                  Save name
                </button>
              </form>
            ) : null}

            {mode === "balance" ? (
              <div className="grid gap-5">
                <p className="text-sm text-ink-muted">
                  Now{" "}
                  <span className="font-medium text-ink">
                    ${balance ?? "0.00"}
                  </span>
                  . Charge adds to what you owe; Pay subtracts a payment.
                </p>
                <form
                  action={async (fd) => {
                    await adjustAccountBalance(fd);
                    setMode(null);
                    router.refresh();
                  }}
                  className="grid gap-3"
                >
                  <input type="hidden" name="id" value={id} />
                  <Field label="Amount ($)">
                    <input
                      name="amount"
                      className={inputClass}
                      placeholder="25.00"
                      inputMode="decimal"
                      required
                    />
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      name="direction"
                      value="charge"
                      className={buttonPrimaryClass}
                    >
                      Charge
                    </button>
                    <button
                      type="submit"
                      name="direction"
                      value="pay"
                      className={buttonGhostClass}
                    >
                      Pay
                    </button>
                  </div>
                </form>
                <form
                  action={async (fd) => {
                    await updateAccountBalance(fd);
                    setMode(null);
                    router.refresh();
                  }}
                  className="grid gap-3 border-t border-line pt-4"
                >
                  <input type="hidden" name="id" value={id} />
                  <Field label="Or set exact balance ($)">
                    <input
                      name="balance"
                      className={inputClass}
                      defaultValue={balance ?? ""}
                      placeholder="0.00"
                      required
                    />
                  </Field>
                  <button type="submit" className={buttonGhostClass}>
                    Set balance
                  </button>
                </form>
              </div>
            ) : null}

            {mode === "import" ? (
              <CsvImportForm
                accountId={id}
                defaultName={label}
                onDone={() => setMode(null)}
              />
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
