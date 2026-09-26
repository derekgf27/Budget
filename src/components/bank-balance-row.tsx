"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  deleteAccount,
  hideAccount,
  renameAccount,
  updateAccountBalance,
} from "@/app/actions";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import {
  Field,
  buttonGhostClass,
  buttonPrimaryClass,
  inputClass,
} from "@/components/ui";
import { formatImportedAt } from "@/lib/accounts";

export function BankBalanceRow({
  id,
  label,
  balance,
  updatedAt,
}: {
  id: string;
  label: string;
  balance: string;
  updatedAt: Date | string | null;
}) {
  const router = useRouter();
  const [more, setMore] = useState(false);
  const updated = formatImportedAt(updatedAt);

  async function save(formData: FormData) {
    await updateAccountBalance(formData);
    router.refresh();
  }

  return (
    <li className="px-4 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-lg font-medium">{label}</p>
          <p className="text-xs text-ink-muted">
            {updated ? `Updated ${updated}` : "Cash on hand — set anytime"}
          </p>
        </div>
        <p className="text-2xl font-semibold tabular-nums">${balance}</p>
      </div>

      <form action={save} className="mt-3 flex flex-wrap items-end gap-2">
        <input type="hidden" name="id" value={id} />
        <label className="min-w-[8rem] flex-1 text-xs text-ink-muted">
          Set balance
          <input
            name="balance"
            className={`${inputClass} mt-1 w-full`}
            defaultValue={balance}
            placeholder="0.00"
            inputMode="decimal"
            required
          />
        </label>
        <button type="submit" className={buttonPrimaryClass}>
          Save
        </button>
      </form>

      <button
        type="button"
        className="mt-3 text-xs text-brand-soft hover:underline"
        onClick={() => setMore((v) => !v)}
      >
        {more ? "Hide options" : "Rename or remove"}
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
          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <form action={hideAccount}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="hidden" value="true" />
              <button
                type="submit"
                className="text-sm text-ink-muted hover:text-ink"
              >
                Hide
              </button>
            </form>
            <ConfirmDeleteForm
              action={deleteAccount}
              itemName={label}
              buttonLabel="Remove"
              buttonClassName="text-sm text-danger/80 hover:text-danger"
              confirmLabel="This removes the bank account."
            >
              <input type="hidden" name="id" value={id} />
            </ConfirmDeleteForm>
          </div>
        </div>
      ) : null}
    </li>
  );
}
