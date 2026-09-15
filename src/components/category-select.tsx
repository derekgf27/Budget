"use client";

import { useRouter } from "next/navigation";
import { updateTransactionCategory } from "@/app/actions";
import { categoryColor } from "@/lib/category-colors";

export function CategorySelect({
  transactionId,
  categoryId,
  categories,
  emphasize = false,
}: {
  transactionId: string;
  categoryId: string | null;
  categories: { id: string; name: string; colorKey?: string | null }[];
  emphasize?: boolean;
}) {
  const router = useRouter();
  const selected = categories.find((c) => c.id === categoryId);
  const color = categoryColor(categoryId, selected?.name, selected?.colorKey);

  async function onChange(value: string) {
    const fd = new FormData();
    fd.set("id", transactionId);
    fd.set("categoryId", value);
    await updateTransactionCategory(fd);
    router.refresh();
  }

  return (
    <div
      className={`flex min-w-0 items-center gap-1.5 rounded-sm border px-2 py-1 ${
        emphasize ? "border-dashed border-accent" : "border-transparent"
      }`}
      style={{
        backgroundColor: emphasize
          ? "color-mix(in srgb, var(--accent-soft) 85%, white)"
          : color.bg,
      }}
    >
      <span
        className="h-2.5 w-2.5 shrink-0 rounded-full"
        style={{ backgroundColor: color.dot }}
        aria-hidden
      />
      <select
        key={categoryId ?? "none"}
        name="categoryId"
        value={categoryId ?? ""}
        className="notebook-select min-w-0 flex-1 border-0 bg-transparent py-0 text-sm font-semibold shadow-none"
        style={{
          color: color.text,
          borderBottomColor: "transparent",
          backgroundColor: "transparent",
          boxShadow: "none",
        }}
        onChange={(e) => void onChange(e.target.value)}
        aria-label="Category"
      >
        <option value="">Uncategorized</option>
        {categories.map((c) => {
          const cColor = categoryColor(c.id, c.name, c.colorKey);
          return (
            <option key={c.id} value={c.id} style={{ color: cColor.text }}>
              {c.name}
            </option>
          );
        })}
      </select>
    </div>
  );
}
