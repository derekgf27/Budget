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
    <div className="mt-4">
      <div className="mb-3 flex gap-1 rounded-md border border-line bg-white/60 p-0.5 w-fit">
        <button
          type="button"
          onClick={() => setTab("overview")}
          className={`rounded px-3 py-1.5 text-xs font-medium transition ${
            tab === "overview"
              ? "bg-brand text-white"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          Overview
        </button>
        <button
          type="button"
          onClick={() => setTab("recent")}
          className={`rounded px-3 py-1.5 text-xs font-medium transition ${
            tab === "recent"
              ? "bg-brand text-white"
              : "text-ink-muted hover:text-ink"
          }`}
        >
          Recent
          {transfers.length > 0 ? ` (${transfers.length})` : ""}
        </button>
      </div>

      {tab === "overview" ? (
        overview
      ) : transfers.length === 0 ? (
        <p className="text-sm text-ink-muted">No activity yet for this item.</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line bg-white/70">
          {transfers.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm"
            >
              <div>
                <p className="text-ink-muted">
                  {formatDisplayDate(t.transferredOn)}
                  {t.amountCents >= 0 ? " · Deposit" : " · Withdrawal"}
                  {t.note ? ` · ${t.note}` : ""}
                </p>
              </div>
              <Money
                cents={t.amountCents}
                className={`font-medium ${
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
