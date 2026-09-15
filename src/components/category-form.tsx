"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { upsertCategory } from "@/app/actions";
import {
  Field,
  buttonPrimaryClass,
  inputClass,
} from "@/components/ui";
import {
  CATEGORY_COLOR_OPTIONS,
  categoryColor,
} from "@/lib/category-colors";

type CategoryFormProps = {
  initial?: {
    id?: string;
    name?: string;
    limit?: string;
    colorKey?: string | null;
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
  const defaultColor =
    initial?.colorKey ||
    (initial?.id
      ? categoryColor(initial.id, initial.name, initial.colorKey).key
      : CATEGORY_COLOR_OPTIONS[0]!.key);
  const [colorKey, setColorKey] = useState(defaultColor);

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
      <Field label="Color">
        <input type="hidden" name="colorKey" value={colorKey} />
        <div
          className="flex flex-wrap gap-2"
          role="radiogroup"
          aria-label="Category color"
        >
          {CATEGORY_COLOR_OPTIONS.map((option) => {
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
                className={`flex h-9 w-9 items-center justify-center rounded-sm border ${
                  selected
                    ? "border-brand bg-paper ring-2 ring-brand/30"
                    : "border-line bg-paper hover:border-brand-soft"
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
      <button type="submit" className={buttonPrimaryClass}>
        {submitLabel}
      </button>
    </form>
  );
}
