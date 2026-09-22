"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { CsvExportGuide } from "@/components/csv-export-guide";
import { Field, buttonPrimaryClass, inputClass } from "@/components/ui";

export function CsvImportForm({
  accountId,
  defaultName = "",
  defaultType = "depository",
  onDone,
}: {
  accountId?: string;
  defaultName?: string;
  defaultType?: "credit" | "depository";
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
    const paycheckBits =
      data.paychecks?.logged || data.paychecks?.updated
        ? ` · ${data.paychecks.logged || 0} paycheck(s) matched`
        : "";
    setMessage(
      `Imported ${data.imported} transactions (${data.skipped} skipped)${paycheckBits}.`,
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
        <>
          <Field label="Account name">
            <input
              name="accountName"
              className={inputClass}
              defaultValue={defaultName}
              placeholder="e.g. Popular checking or Apple Card"
              required
            />
          </Field>
          <Field label="Account type">
            <select
              name="accountType"
              className={inputClass}
              defaultValue={defaultType}
            >
              <option value="depository">Bank (checking / savings)</option>
              <option value="credit">Card</option>
            </select>
          </Field>
        </>
      ) : null}
      <Field label="Balance as of this statement (optional)">
        <input
          name="balance"
          className={inputClass}
          placeholder="e.g. 412.50"
          inputMode="decimal"
        />
      </Field>
      <Field label="CSV file">
        <input
          name="file"
          type="file"
          accept=".csv"
          required
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            if (!file) return;
            if (!file.name.toLowerCase().endsWith(".csv")) {
              setMessage("Please choose a .csv file.");
              e.currentTarget.value = "";
            } else {
              setMessage("");
            }
          }}
        />
      </Field>
      <button type="submit" disabled={busy} className={buttonPrimaryClass}>
        {busy ? "Importing…" : "Import CSV"}
      </button>
      {message ? <p className="text-sm text-ink-muted">{message}</p> : null}
      <CsvExportGuide />
    </form>
  );
}
