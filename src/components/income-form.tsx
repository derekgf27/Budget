"use client";

import { useMemo, useState } from "react";
import { upsertIncome } from "@/app/actions";
import {
  Field,
  buttonPrimaryClass,
  inputClass,
} from "@/components/ui";
import { JOB_COLOR_OPTIONS } from "@/lib/job-colors";
import { formatDisplayDate } from "@/lib/money";

type IncomeFormProps = {
  initial?: {
    id?: string;
    name?: string;
    amount?: string;
    cadence?: string;
    paydayDay?: number | null;
    nextPayday?: string;
    amountVaries?: boolean;
    colorKey?: string | null;
    depositMatch?: string | null;
  };
  submitLabel?: string;
  onSuccess?: () => void;
};

function suggestNextPayday(day: number): string {
  const safeDay = Math.min(Math.max(day, 1), 31);
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth();
  const today = new Date(year, month, now.getDate());
  let date = new Date(year, month, Math.min(safeDay, new Date(year, month + 1, 0).getDate()));
  if (date < today) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
    date = new Date(year, month, Math.min(safeDay, new Date(year, month + 1, 0).getDate()));
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function IncomeForm({
  initial,
  submitLabel = "Save job",
  onSuccess,
}: IncomeFormProps) {
  const [cadence, setCadence] = useState(initial?.cadence || "monthly");
  const [paydayDay, setPaydayDay] = useState(
    String(initial?.paydayDay || ""),
  );
  const [nextPayday, setNextPayday] = useState(initial?.nextPayday || "");
  const [amountVaries, setAmountVaries] = useState(
    initial?.amountVaries ?? true,
  );
  const [colorKey, setColorKey] = useState(
    initial?.colorKey || JOB_COLOR_OPTIONS[0]!.key,
  );

  const dayHint = useMemo(() => {
    const day = Number(paydayDay);
    if (cadence !== "monthly" || !day) return null;
    return suggestNextPayday(day);
  }, [cadence, paydayDay]);

  async function save(formData: FormData) {
    await upsertIncome(formData);
    onSuccess?.();
  }

  return (
    <form action={save} className="grid gap-3">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}

      <Field label="Job name">
        <input
          name="name"
          required
          className={inputClass}
          placeholder="e.g. Day job, Uber, Client contract"
          defaultValue={initial?.name}
        />
      </Field>

      <Field label="Dot color">
        <input type="hidden" name="colorKey" value={colorKey} />
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Dot color">
          {JOB_COLOR_OPTIONS.map((option) => {
            const selected = colorKey === option.key;
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={selected}
                aria-label={option.label}
                title={option.label}
                onClick={() => setColorKey(option.key)}
                className={`flex h-9 w-9 items-center justify-center rounded-md border ${
                  selected
                    ? "border-brand bg-paper ring-2 ring-brand/30"
                    : "border-line bg-paper/80 hover:border-brand-soft"
                }`}
              >
                <span
                  className="h-3.5 w-3.5 rounded-full"
                  style={{ backgroundColor: option.dot }}
                  aria-hidden
                />
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Deposit match">
        <input
          name="depositMatch"
          className={inputClass}
          placeholder="e.g. CIRACET or TIBER,PHSU"
          defaultValue={initial?.depositMatch ?? ""}
        />
        <span className="text-xs text-ink-muted">
          Keywords in imported deposit descriptions (comma-separated). Used to
          auto-log paychecks from statements.
        </span>
      </Field>

      <Field label="Pay schedule">
        <select
          name="cadence"
          className={inputClass}
          value={cadence}
          onChange={(e) => setCadence(e.target.value)}
        >
          <option value="monthly">Same date every month</option>
          <option value="semimonthly">Twice a month (1st &amp; 15th style)</option>
          <option value="biweekly">Every 2 weeks</option>
          <option value="weekly">Weekly</option>
        </select>
      </Field>

      {cadence === "monthly" ? (
        <Field label="Payday day of month (1–31)">
          <input
            name="paydayDay"
            type="number"
            min={1}
            max={31}
            required
            className={inputClass}
            placeholder="e.g. 1 or 15"
            value={paydayDay}
            onChange={(e) => {
              setPaydayDay(e.target.value);
              const day = Number(e.target.value);
              if (day >= 1 && day <= 31 && !initial?.nextPayday) {
                setNextPayday(suggestNextPayday(day));
              }
            }}
          />
        </Field>
      ) : (
        <input type="hidden" name="paydayDay" value="" />
      )}

      <Field label="Approx. next payday">
        <input
          name="nextPayday"
          type="date"
          required
          className={inputClass}
          value={nextPayday}
          onChange={(e) => setNextPayday(e.target.value)}
        />
        {dayHint && cadence === "monthly" ? (
          <span className="text-xs text-ink-muted">
            Suggested from day of month: {formatDisplayDate(dayHint)}. Advances
            automatically when a paycheck is logged.
          </span>
        ) : (
          <span className="text-xs text-ink-muted">
            Rough guide only — advances automatically when a paycheck hits.
          </span>
        )}
      </Field>

      <label className="flex items-start gap-2 text-sm">
        <input
          type="checkbox"
          name="amountVaries"
          checked={amountVaries}
          onChange={(e) => setAmountVaries(e.target.checked)}
          className="mt-1"
        />
        <span>
          <span className="font-medium">Amount varies each payday</span>
          <span className="block text-ink-muted">
            You’ll log the real take-home when paid. Optional estimate below is
            only for planning.
          </span>
        </span>
      </label>

      <Field
        label={
          amountVaries
            ? "Typical / estimate take-home ($) — optional"
            : "Net take-home ($)"
        }
      >
        <input
          name="amount"
          className={inputClass}
          placeholder={amountVaries ? "e.g. 2200 (estimate)" : "e.g. 2200"}
          defaultValue={initial?.amount}
          required={!amountVaries}
        />
      </Field>

      <button type="submit" className={buttonPrimaryClass}>
        {submitLabel}
      </button>
    </form>
  );
}
