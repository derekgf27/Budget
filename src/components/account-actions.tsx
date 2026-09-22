"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
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
};

export function AccountActions({
  id,
  label,
  balance,
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
        <button
          type="button"
          className={buttonGhostClass}
          onClick={() => setMode("import")}
        >
          Import CSV
        </button>
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
                    ? "Set balance"
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
              <form
                action={async (fd) => {
                  await updateAccountBalance(fd);
                  setMode(null);
                  router.refresh();
                }}
                className="grid gap-3"
              >
                <input type="hidden" name="id" value={id} />
                <Field label="Current balance ($)">
                  <input
                    name="balance"
                    className={inputClass}
                    defaultValue={balance ?? ""}
                    placeholder="0.00"
                    required
                  />
                </Field>
                <p className="text-xs text-ink-muted">
                  Not live — set from your statement or bank app. Next CSV
                  import can overwrite this if you include a balance.
                </p>
                <button type="submit" className={buttonPrimaryClass}>
                  Save balance
                </button>
              </form>
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
