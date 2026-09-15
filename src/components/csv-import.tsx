"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Field, buttonPrimaryClass, inputClass } from "@/components/ui";

export function CsvImportForm({
  accountId,
  defaultName = "Apple Card",
  onDone,
}: {
  accountId?: string;
  defaultName?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage("");
    const form = e.currentTarget;
    const body = new FormData(form);
    const res = await fetch("/api/csv/import", { method: "POST", body });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || "Import failed");
      return;
    }
    setMessage(
      `Imported ${data.imported} transactions (${data.skipped} skipped).`,
    );
    form.reset();
    router.refresh();
    onDone?.();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      {accountId ? (
        <input type="hidden" name="accountId" value={accountId} />
      ) : null}
      {!accountId ? (
        <Field label="Account name">
          <input
            name="accountName"
            className={inputClass}
            defaultValue={defaultName}
            required
          />
        </Field>
      ) : null}
      <Field label="Current balance (optional)">
        <input
          name="balance"
          className={inputClass}
          placeholder="e.g. 412.50"
          inputMode="decimal"
        />
      </Field>
      <Field label="CSV file">
        <input name="file" type="file" accept=".csv,text/csv" required />
      </Field>
      <button type="submit" disabled={busy} className={buttonPrimaryClass}>
        {busy ? "Importing…" : "Import CSV"}
      </button>
      {message ? <p className="text-sm text-ink-muted">{message}</p> : null}
      <p className="text-xs text-ink-muted">
        Use CSV from card.apple.com → Export Transactions (not the PDF
        statement). Columns like Date, Description, Amount.
      </p>
    </form>
  );
}
