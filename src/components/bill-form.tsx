"use client";

import { useRouter } from "next/navigation";
import { upsertBill } from "@/app/actions";
import {
  Field,
  buttonPrimaryClass,
  inputClass,
} from "@/components/ui";

type IncomeOption = { id: string; name: string };

type BillFormProps = {
  incomes: IncomeOption[];
  initial?: {
    id?: string;
    name?: string;
    amount?: string;
    cadence?: string;
    nextDueDate?: string;
    incomeSourceId?: string | null;
  };
  submitLabel?: string;
  onSuccess?: () => void;
};

export function BillForm({
  incomes,
  initial,
  submitLabel = "Save bill",
  onSuccess,
}: BillFormProps) {
  const router = useRouter();

  async function save(formData: FormData) {
    await upsertBill(formData);
    onSuccess?.();
    router.refresh();
  }

  return (
    <form action={save} className="grid gap-3">
      {initial?.id ? <input type="hidden" name="id" value={initial.id} /> : null}
      <Field label="Name">
        <input
          name="name"
          required
          className={inputClass}
          placeholder="Rent"
          defaultValue={initial?.name}
        />
      </Field>
      <Field label="Amount ($)">
        <input
          name="amount"
          required
          className={inputClass}
          placeholder="1600"
          defaultValue={initial?.amount}
        />
      </Field>
      <Field label="Cadence">
        <select
          name="cadence"
          className={inputClass}
          defaultValue={initial?.cadence || "monthly"}
        >
          <option value="weekly">Weekly</option>
          <option value="biweekly">Biweekly</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>
      </Field>
      <Field label="Next due date">
        <input
          name="nextDueDate"
          type="date"
          required
          className={inputClass}
          defaultValue={initial?.nextDueDate}
        />
      </Field>
      <Field label="Usually paid from">
        <select
          name="incomeSourceId"
          className={inputClass}
          defaultValue={initial?.incomeSourceId || ""}
        >
          <option value="">Either / unspecified</option>
          {incomes.map((i) => (
            <option key={i.id} value={i.id}>
              {i.name}
            </option>
          ))}
        </select>
      </Field>
      <button type="submit" className={buttonPrimaryClass}>
        {submitLabel}
      </button>
    </form>
  );
}
