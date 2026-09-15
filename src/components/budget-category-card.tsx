"use client";

import { useEffect, useId, useRef, useState } from "react";
import { deleteCategory } from "@/app/actions";
import { ConfirmDeleteForm } from "@/components/confirm-delete";
import { EditCategoryButton } from "@/components/edit-category-button";
import { Money, Panel } from "@/components/ui";
import { categoryColor } from "@/lib/category-colors";
import { formatDisplayDate } from "@/lib/money";

export type CategoryExpense = {
  id: string;
  date: string;
  name: string;
  merchantName: string | null;
  amountCents: number;
  accountLabel: string | null;
};

export function BudgetCategoryCard({
  category,
  spent,
  limit,
  remaining,
  over,
  barPct,
  monthLabel,
  expenses,
}: {
  category: {
    id: string;
    name: string;
    monthlyLimitCents: number;
    colorKey?: string | null;
  };
  spent: number;
  limit: number;
  remaining: number;
  over: boolean;
  barPct: number;
  monthLabel: string;
  expenses: CategoryExpense[];
}) {
  const [open, setOpen] = useState(false);
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const color = categoryColor(category.id, category.name, category.colorKey);

  useEffect(() => {
    if (!open) return;
    closeRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  return (
    <>
      <Panel className="h-full overflow-hidden !p-0">
        <div
          className="h-full border-l-[3px] p-5"
          style={{ borderLeftColor: color.dot }}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="min-w-0 flex-1 rounded-sm text-left transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              aria-haspopup="dialog"
            >
              <p className="flex items-center gap-2 text-lg font-semibold">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: color.dot }}
                  aria-hidden
                />
                <span style={{ color: color.text }}>{category.name}</span>
              </p>
              <p className="mt-1 text-sm text-ink">
                <Money cents={spent} /> of <Money cents={limit} />
              </p>
              <p
                className={`mt-1 text-sm font-semibold ${
                  over ? "text-danger" : ""
                }`}
                style={over ? undefined : { color: color.text }}
              >
                {over ? (
                  <>
                    <Money cents={Math.abs(remaining)} /> over
                  </>
                ) : (
                  <>
                    <Money cents={remaining} /> left
                  </>
                )}
              </p>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-line">
                <div
                  className={`h-full rounded-full ${over ? "bg-danger" : ""}`}
                  style={{
                    width: `${barPct}%`,
                    backgroundColor: over ? undefined : color.dot,
                  }}
                />
              </div>
              <p className="mt-2 text-xs" style={{ color: color.text }}>
                {expenses.length} expense{expenses.length === 1 ? "" : "s"} · tap
                to view
              </p>
            </button>
            <div className="flex flex-wrap items-center gap-2">
              <EditCategoryButton
                initial={{
                  id: category.id,
                  name: category.name,
                  limit: (category.monthlyLimitCents / 100).toFixed(2),
                  colorKey: category.colorKey,
                }}
              />
              <ConfirmDeleteForm
                action={deleteCategory}
                itemName={category.name}
                buttonClassName="px-1 text-sm text-danger/80 hover:text-danger"
                confirmLabel="Spending stays in transactions; they’ll just lose this category."
              >
                <input type="hidden" name="id" value={category.id} />
              </ConfirmDeleteForm>
            </div>
          </div>
        </div>
      </Panel>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="presentation"
        >
          <button
            type="button"
            aria-label="Close dialog"
            className="absolute inset-0 bg-brand/40 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden notebook-sheet shadow-xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-line p-5">
              <div>
                <h2
                  id={titleId}
                  className="flex items-center gap-2 display text-2xl"
                  style={{ color: color.text }}
                >
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: color.dot }}
                    aria-hidden
                  />
                  {category.name}
                </h2>
                <p className="mt-1 text-sm text-ink">
                  {monthLabel} · <Money cents={spent} /> spent
                </p>
              </div>
              <button
                ref={closeRef}
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-sm border border-line bg-paper px-2.5 py-1 text-sm hover:bg-bg-elevated"
              >
                Close
              </button>
            </div>

            <div className="overflow-y-auto p-2">
              {expenses.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-ink">
                  No expenses in this category yet this month.
                </p>
              ) : (
                <ul className="divide-y divide-rule">
                  {expenses.map((tx) => (
                    <li
                      key={tx.id}
                      className="flex items-start justify-between gap-3 px-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium leading-snug">
                          {tx.merchantName || tx.name}
                        </p>
                        <p className="mt-0.5 text-sm text-ink">
                          {formatDisplayDate(tx.date)}
                          {tx.accountLabel ? ` · ${tx.accountLabel}` : ""}
                        </p>
                      </div>
                      <Money
                        cents={tx.amountCents}
                        className="shrink-0 font-medium"
                      />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
