"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  adjustAccountBalance,
  deleteAccount,
  hideAccount,
  renameAccount,
  updateAccountBalance,
  updateAccountDueDate,
} from "@/app/actions";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { CsvImportForm } from "@/components/csv-import";
import {
  Field,
  buttonGhostClass,
  buttonPrimaryClass,
  inputClass,
} from "@/components/ui";
import { formatDueDate, formatImportedAt } from "@/lib/accounts";

export function CardBalanceRow({
  id,
  label,
  balance,
  updatedAt,
  dueDate,
  source,
}: {
  id: string;
  label: string;
  balance: string;
  updatedAt: Date | string | null;
  dueDate?: string | null;
  source?: string;
}) {
  const router = useRouter();
  const [more, setMore] = useState(false);
  const updated = formatImportedAt(updatedAt);
  const due = formatDueDate(dueDate);

  async function adjust(formData: FormData) {
    await adjustAccountBalance(formData);
    router.refresh();
  }

  return (
    <li className="px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-medium">{label}</p>
          {due ? (
            <p className={`text-xs ${due.overdue ? "text-danger" : "text-ink-muted"}`}>
              {due.overdue ? `Overdue ${due.label}` : `Due ${due.label}`}
            </p>
          ) : updated ? (
            <p className="text-xs text-ink-muted">Updated {updated}</p>
          ) : (
            <p className="text-xs text-ink-muted">Set aside from safe to spend</p>
          )}
        </div>
        <p className="text-2xl font-semibold tabular-nums">${balance}</p>
      </div>

      <form action={adjust} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={id} />
        <label className="min-w-[8rem] flex-1 text-xs text-ink-muted">
          Amount
          <input
            name="amount"
            className={`${inputClass} mt-1 w-full`}
            placeholder="25.00"
            inputMode="decimal"
            required
          />
        </label>
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
      </form>

      <button
        type="button"
        className="mt-3 text-xs text-brand-soft hover:underline"
        onClick={() => setMore((v) => !v)}
      >
        {more ? "Hide options" : "Rename, set, or remove"}
      </button>

      {more ? (
        <div className="mt-3 grid gap-3 border-t border-line pt-3 sm:grid-cols-2">
          <form
            action={async (fd) => {
              await renameAccount(fd);
              router.refresh();
            }}
            className="grid gap-2"
          >
            <input type="hidden" name="id" value={id} />
            <Field label="Name">
              <input
                name="displayName"
                className={inputClass}
                defaultValue={label}
                required
              />
            </Field>
            <button type="submit" className={buttonGhostClass}>
              Save name
            </button>
          </form>
          <form
            action={async (fd) => {
              await updateAccountBalance(fd);
              router.refresh();
            }}
            className="grid gap-2"
          >
            <input type="hidden" name="id" value={id} />
            <Field label="Set exact balance">
              <input
                name="balance"
                className={inputClass}
                defaultValue={balance}
                required
              />
            </Field>
            <button type="submit" className={buttonGhostClass}>
              Set
            </button>
          </form>
          <form
            action={async (fd) => {
              await updateAccountDueDate(fd);
              router.refresh();
            }}
            className="grid gap-2 sm:col-span-2"
          >
            <input type="hidden" name="id" value={id} />
            <Field label="Due date">
              <input
                name="dueDate"
                type="date"
                className={inputClass}
                defaultValue={dueDate ?? ""}
                required
              />
            </Field>
            <button type="submit" className={buttonGhostClass}>
              Save due date
            </button>
          </form>
          {source !== "manual" ? (
            <div className="sm:col-span-2">
              <CsvImportForm accountId={id} defaultName={label} />
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <form action={hideAccount}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="hidden" value="true" />
              <button type="submit" className="text-sm text-ink-muted hover:text-ink">
                Hide
              </button>
            </form>
            <ConfirmDeleteForm
              action={deleteAccount}
              itemName={label}
              buttonLabel="Remove"
              buttonClassName="text-sm text-danger/80 hover:text-danger"
              confirmLabel="This removes the card and its imported transactions."
            >
              <input type="hidden" name="id" value={id} />
            </ConfirmDeleteForm>
          </div>
        </div>
      ) : null}
    </li>
  );
}
