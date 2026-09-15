"use client";

import { useState } from "react";
import { Money } from "@/components/ui";
import { formatDisplayDate } from "@/lib/money";

type Transfer = {
  id: string;
  amountCents: number;
  transferredOn: string;
  note: string | null;
};

export function ItemTabs({
  overview,
  transfers,
}: {
  overview: React.ReactNode;
  transfers: Transfer[];
}) {
  const [tab, setTab] = useState<"overview" | "recent">("overview");

  return (
    <div className="mt-5">
      <div
        className="mb-4 flex gap-5 border-b border-rule"
        role="tablist"
        aria-label="Item sections"
      >
        {(
          [
            ["overview", "Overview"],
            [
              "recent",
              transfers.length > 0
                ? `Recent (${transfers.length})`
                : "Recent",
            ],
          ] as const
        ).map(([key, label]) => {
          const active = tab === key;
          return (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setTab(key)}
              className={`relative pb-2 text-sm transition ${
                active
                  ? "font-semibold text-brand"
                  : "text-ink hover:text-brand"
              }`}
            >
              {label}
              {active ? (
                <span
                  className="absolute inset-x-0 -bottom-px h-0.5 bg-brand"
                  aria-hidden
                />
              ) : null}
            </button>
          );
        })}
      </div>

      {tab === "overview" ? (
        overview
      ) : transfers.length === 0 ? (
        <p className="text-sm text-ink">No activity yet for this item.</p>
      ) : (
        <ul className="divide-y divide-rule border-t border-rule">
          {transfers.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"
            >
              <div>
                <p className="font-medium">
                  {t.amountCents >= 0 ? "Deposit" : "Withdrawal"}
                </p>
                <p className="mt-0.5 text-xs text-ink">
                  {formatDisplayDate(t.transferredOn)}
                  {t.note ? ` · ${t.note}` : ""}
                </p>
              </div>
              <Money
                cents={t.amountCents}
                className={`font-semibold tabular-nums ${
                  t.amountCents >= 0 ? "text-safe" : "text-danger"
                }`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
