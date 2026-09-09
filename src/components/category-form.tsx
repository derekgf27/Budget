"use client";

import { useRouter } from "next/navigation";
import { upsertCategory } from "@/app/actions";
import {
  Field,
  buttonPrimaryClass,
  inputClass,
} from "@/components/ui";

type CategoryFormProps = {
  initial?: {
    id?: string;
    name?: string;
    limit?: string;
  };
  submitLabel?: string;
  onSuccess?: () => void;
};

export function CategoryForm({
  initial,
  submitLabel = "Save category",
  onSuccess,
}: CategoryFormProps) {
  const router = useRouter();

  async function save(formData: FormData) {
    await upsertCategory(formData);
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
          placeholder="Groceries"
          defaultValue={initial?.name}
        />
      </Field>
      <Field label="Monthly limit ($)">
        <input
          name="limit"
          required
          className={inputClass}
          placeholder="500"
          defaultValue={initial?.limit}
        />
      </Field>
      <button type="submit" className={buttonPrimaryClass}>
        {submitLabel}
      </button>
    </form>
  );
}
