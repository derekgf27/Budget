"use client";

import { updateTransactionCategory } from "@/app/actions";
import { inputClass } from "@/components/ui";

export function CategorySelect({
  transactionId,
  categoryId,
  categories,
}: {
  transactionId: string;
  categoryId: string | null;
  categories: { id: string; name: string }[];
}) {
  return (
    <form action={updateTransactionCategory} className="min-w-0">
      <input type="hidden" name="id" value={transactionId} />
      <select
        name="categoryId"
        defaultValue={categoryId ?? ""}
        className={`${inputClass} max-w-[11rem] py-1.5 text-sm`}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        aria-label="Category"
      >
        <option value="">Uncategorized</option>
        {categories.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
    </form>
  );
}
