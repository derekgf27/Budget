"use client";

import { useRouter } from "next/navigation";
import { transferSavings } from "@/app/actions";
import {
  Field,
  buttonGhostClass,
  buttonPrimaryClass,
  inputClass,
} from "@/components/ui";

export function SavingsTransferForm({
  savingsId,
  direction,
}: {
  savingsId: string;
  direction: "deposit" | "withdraw";
}) {
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);

  async function save(formData: FormData) {
    await transferSavings(formData);
    router.refresh();
  }

  return (
    <form action={save} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="savingsId" value={savingsId} />
      <input type="hidden" name="direction" value={direction} />
      <Field label="Amount ($)">
        <input
          name="amount"
          required
          className={inputClass}
          placeholder="100"
        />
      </Field>
      <Field label="Date">
        <input
          name="transferredOn"
          type="date"
          required
          className={inputClass}
          defaultValue={today}
        />
      </Field>
      <Field label="Note (optional)">
        <input
          name="note"
          className={inputClass}
          placeholder={direction === "deposit" ? "From paycheck…" : "Used for…"}
        />
      </Field>
      <div className="flex items-end">
        <button
          type="submit"
          className={
            direction === "deposit" ? buttonPrimaryClass : buttonGhostClass
          }
        >
          {direction === "deposit" ? "Add money" : "Withdraw"}
        </button>
      </div>
    </form>
  );
}
