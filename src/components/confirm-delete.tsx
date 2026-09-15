"use client";

import { useId, useState, useTransition } from "react";
import { buttonDangerClass, buttonGhostClass } from "@/components/ui";

export function ConfirmDeleteForm({
  action,
  itemName,
  buttonLabel = "Delete",
  buttonClassName,
  confirmLabel,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  itemName: string;
  buttonLabel?: string;
  buttonClassName?: string;
  confirmLabel?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const titleId = useId();

  return (
    <>
      <button
        type="button"
        className={buttonClassName ?? buttonDangerClass}
        onClick={() => setOpen(true)}
      >
        {buttonLabel}
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
            className="relative z-10 w-full max-w-sm notebook-sheet p-5 shadow-xl"
          >
            <h2 id={titleId} className="display text-xl text-brand">
              Delete {itemName}?
            </h2>
            <p className="mt-2 text-sm text-ink">
              {confirmLabel ??
                "This can’t be undone. Related history may be removed too."}
            </p>
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                className={buttonGhostClass}
                onClick={() => setOpen(false)}
                disabled={pending}
              >
                Cancel
              </button>
              <form
                action={(fd) => {
                  startTransition(async () => {
                    await action(fd);
                    setOpen(false);
                  });
                }}
              >
                {children}
                <button
                  type="submit"
                  className={buttonDangerClass}
                  disabled={pending}
                >
                  {pending ? "Deleting…" : buttonLabel}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
