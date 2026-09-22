"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CategorySelect } from "@/components/category-select";
import { AddTransactionButton } from "@/components/add-transaction-button";
import { CsvImportForm } from "@/components/csv-import";
import { buttonGhostClass, buttonPrimaryClass, inputClass } from "@/components/ui";
import { categoryColor } from "@/lib/category-colors";
import { centsToDollars, formatDisplayDate, parseDate } from "@/lib/money";
import {
  exclusionStatusLabel,
  matchBillForTransaction,
} from "@/lib/transaction-classify";

export type TxRow = {
  id: string;
  accountId: string | null;
  categoryId: string | null;
  date: string;
  name: string;
  merchantName: string | null;
  amountCents: number;
  excluded: boolean;
  source: string;
  createdAt: string;
};

export type AccountFilter = {
  id: string;
  label: string;
};

export type CategoryOption = {
  id: string;
  name: string;
  colorKey?: string | null;
};

export type BillOption = {
  id: string;
  name: string;
  amountCents: number;
};

function shortAccountChip(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes("apple")) return "Apple Card";
  if (lower.includes("checking")) return "Checking";
  if (lower.includes("savings")) return "Savings";
  return label.replace(/\s*[—–-]\s*Credit$/i, "").replace(/\s*···.+$/, "");
}

function shortAccountMeta(label: string) {
  return shortAccountChip(label);
}

function TransactionAmount({ cents }: { cents: number }) {
  if (cents < 0) {
    return (
      <span className="block w-full text-right tabular-nums font-semibold text-safe">
        +{centsToDollars(Math.abs(cents))}
      </span>
    );
  }
  return (
    <span className="block w-full text-right tabular-nums font-semibold">
      {centsToDollars(cents)}
    </span>
  );
}

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function monthLabel(key: string) {
  const d = parseDate(`${key}-01`);
  return d.toLocaleString("en-US", { month: "long", year: "numeric" });
}

function needsCategory(tx: TxRow, bills: BillOption[] = []) {
  if (tx.excluded || tx.categoryId || tx.amountCents <= 0) return false;
  if (matchBillForTransaction(tx, bills)) return false;
  return true;
}

export function TransactionsClient({
  transactions: txs,
  categories: cats,
  accounts,
  bills = [],
  appleAccountId,
}: {
  transactions: TxRow[];
  categories: CategoryOption[];
  accounts: AccountFilter[];
  bills?: BillOption[];
  appleAccountId?: string | null;
}) {
  const router = useRouter();
  const [accountFilter, setAccountFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"date" | "category">("date");
  const [uncategorizedOnly, setUncategorizedOnly] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [triageDismissed, setTriageDismissed] = useState(false);
  const [query, setQuery] = useState("");

  const currentMonth = useMemo(() => {
    const now = new Date();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    return `${now.getFullYear()}-${m}`;
  }, []);

  const triageStorageKey = `splitbook:triage-dismissed:${currentMonth}`;

  useEffect(() => {
    try {
      setTriageDismissed(localStorage.getItem(triageStorageKey) === "1");
    } catch {
      setTriageDismissed(false);
    }
  }, [triageStorageKey]);

  function dismissTriage() {
    setTriageDismissed(true);
    try {
      localStorage.setItem(triageStorageKey, "1");
    } catch {
      /* ignore */
    }
  }
  const categoryNameById = useMemo(
    () => new Map(cats.map((c) => [c.id, c.name])),
    [cats],
  );

  // This check-in page only shows the current calendar month
  const thisMonthTxs = useMemo(
    () => txs.filter((t) => monthKey(t.date) === currentMonth),
    [txs, currentMonth],
  );

  const filtered = useMemo(() => {
    let list = thisMonthTxs;
    if (accountFilter !== "all") {
      list = list.filter((t) => t.accountId === accountFilter);
    }
    if (uncategorizedOnly) {
      list = list.filter((t) => needsCategory(t, bills));
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((t) => {
        const hay = `${t.merchantName || ""} ${t.name}`.toLowerCase();
        return hay.includes(q);
      });
    }
    return list;
  }, [thisMonthTxs, accountFilter, uncategorizedOnly, bills, query]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    if (sortBy === "category") {
      list.sort((a, b) => {
        const aName = a.categoryId
          ? categoryNameById.get(a.categoryId) || "zzz"
          : "Uncategorized";
        const bName = b.categoryId
          ? categoryNameById.get(b.categoryId) || "zzz"
          : "Uncategorized";
        const byCat = aName.localeCompare(bName);
        if (byCat !== 0) return byCat;
        return b.date.localeCompare(a.date);
      });
      return list;
    }
    list.sort((a, b) => {
      const byDate = b.date.localeCompare(a.date);
      if (byDate !== 0) return byDate;
      return b.createdAt.localeCompare(a.createdAt);
    });
    return list;
  }, [filtered, sortBy, categoryNameById]);

  const labelById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a.label])),
    [accounts],
  );

  const needsTriage = useMemo(() => {
    const base =
      accountFilter === "all"
        ? thisMonthTxs
        : thisMonthTxs.filter((t) => t.accountId === accountFilter);
    return base.filter((t) => needsCategory(t, bills)).length;
  }, [thisMonthTxs, accountFilter, bills]);

  const accountCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of accounts) map.set(a.id, 0);
    for (const t of thisMonthTxs) {
      if (!t.accountId) continue;
      map.set(t.accountId, (map.get(t.accountId) || 0) + 1);
    }
    return map;
  }, [thisMonthTxs, accounts]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search merchant or name…"
            className={`${inputClass} w-full max-w-xs`}
            aria-label="Search transactions"
          />
          <FilterChip
            active={accountFilter === "all"}
            onClick={() => setAccountFilter("all")}
            label={`All (${thisMonthTxs.length})`}
          />
          {accounts.map((a) => (
            <FilterChip
              key={a.id}
              active={accountFilter === a.id}
              onClick={() => setAccountFilter(a.id)}
              label={`${shortAccountChip(a.label)} (${accountCounts.get(a.id) || 0})`}
            />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            active={sortBy === "date"}
            onClick={() => setSortBy("date")}
            label="Date"
          />
          <FilterChip
            active={sortBy === "category"}
            onClick={() => setSortBy("category")}
            label="Category"
          />
          <AddTransactionButton accounts={accounts} categories={cats} />
          <div className="relative">
            <button
              type="button"
              className={buttonGhostClass}
              onClick={() => setToolsOpen((v) => !v)}
              aria-expanded={toolsOpen}
            >
              Tools
            </button>
            {toolsOpen ? (
              <div className="absolute right-0 z-20 mt-1 min-w-[12rem] notebook-sheet py-1">
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm hover:bg-brand/5"
                  onClick={() => {
                    setImportOpen(true);
                    setToolsOpen(false);
                  }}
                >
                  Import CSV
                </button>
                <a
                  href="https://card.apple.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block px-3 py-2 text-sm hover:bg-brand/5"
                  onClick={() => setToolsOpen(false)}
                >
                  Open Apple Card
                </a>
                <Link
                  href="/accounts"
                  className="block px-3 py-2 text-sm hover:bg-brand/5"
                  onClick={() => setToolsOpen(false)}
                >
                  Manage accounts
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {thisMonthTxs.length > 0 && needsTriage > 0 && !triageDismissed ? (
        <div className="sticky top-[3.25rem] z-10 mb-4 notebook-sheet notebook-margin flex flex-wrap items-center justify-between gap-3 bg-paper/95 px-4 py-3 backdrop-blur">
          <div>
            <p className="text-sm font-semibold">
              {needsTriage} need{needsTriage === 1 ? "s" : ""} a category
            </p>
            <p className="text-xs text-ink">
              Clear these for this check-in — deposits and transfers can wait.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={
                uncategorizedOnly ? buttonGhostClass : buttonPrimaryClass
              }
              onClick={() => setUncategorizedOnly((v) => !v)}
            >
              {uncategorizedOnly ? "Show all" : "Show uncategorized only"}
            </button>
            <button
              type="button"
              className="text-sm underline-offset-2 hover:underline"
              onClick={dismissTriage}
            >
              Dismiss
            </button>
          </div>
        </div>
      ) : null}

      {uncategorizedOnly && needsTriage === 0 ? (
        <div className="mb-4 notebook-sheet px-4 py-3 text-sm">
          All caught up — nothing left to categorize.
          <button
            type="button"
            className="ml-2 font-medium text-brand underline-offset-2 hover:underline"
            onClick={() => setUncategorizedOnly(false)}
          >
            Show all
          </button>
        </div>
      ) : null}

      {importOpen ? (
        <div className="mb-4 notebook-sheet p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-sm font-medium">Import CSV</p>
            <button
              type="button"
              className="text-sm text-ink underline-offset-2 hover:underline"
              onClick={() => setImportOpen(false)}
            >
              Close
            </button>
          </div>
          <CsvImportForm
            accountId={
              accountFilter !== "all"
                ? accountFilter
                : appleAccountId || undefined
            }
            defaultName={
              accountFilter !== "all"
                ? labelById.get(accountFilter) || ""
                : "Apple Card"
            }
            defaultType={
              (accountFilter !== "all"
                ? labelById.get(accountFilter)
                : "Apple Card"
              )
                ?.toLowerCase()
                .includes("card")
                ? "credit"
                : "depository"
            }
            onDone={() => {
              setImportOpen(false);
              const nextId =
                accountFilter !== "all" ? accountFilter : appleAccountId;
              if (nextId) setAccountFilter(nextId);
              router.refresh();
            }}
          />
        </div>
      ) : null}

      {txs.length === 0 ? (
        <div className="notebook-sheet py-10 text-center">
          <p>
            No transactions yet — import a CSV statement from Accounts.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className={buttonPrimaryClass}
              onClick={() => setImportOpen(true)}
            >
              Import CSV
            </button>
            <Link href="/accounts" className={buttonGhostClass}>
              Go to Accounts
            </Link>
          </div>
        </div>
      ) : thisMonthTxs.length === 0 ? (
        <div className="notebook-sheet py-10 text-center">
          <p>No transactions in {monthLabel(currentMonth)} yet.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="notebook-sheet py-10 text-center">
          <p>No transactions match these filters.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              className={buttonPrimaryClass}
              onClick={() => setImportOpen(true)}
            >
              Import CSV
            </button>
            <button
              type="button"
              className="text-sm font-medium text-brand underline-offset-2 hover:underline"
              onClick={() => {
                setUncategorizedOnly(false);
                setAccountFilter("all");
              }}
            >
              Clear filters
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-3 text-sm">
            {uncategorizedOnly
              ? "Showing uncategorized only"
              : `${monthLabel(currentMonth)} · ${sorted.length} transaction${sorted.length === 1 ? "" : "s"}`}
          </div>

          <section className="overflow-hidden notebook-sheet">
            <ul className="divide-y divide-rule">
              {sorted.map((tx, index) => {
                const isDeposit = tx.amountCents < 0;
                const needsCat = needsCategory(tx, bills);
                const accountLabel = tx.accountId
                  ? labelById.get(tx.accountId)
                  : null;
                const catName = tx.categoryId
                  ? categoryNameById.get(tx.categoryId) || "Category"
                  : "Uncategorized";
                const prev = sorted[index - 1];
                const prevCat = prev?.categoryId
                  ? categoryNameById.get(prev.categoryId) || "Category"
                  : prev
                    ? "Uncategorized"
                    : null;
                const showCatHeader =
                  sortBy === "category" &&
                  (index === 0 || catName !== prevCat);
                const matchedBill = matchBillForTransaction(tx, bills);
                const status = tx.excluded
                  ? exclusionStatusLabel(
                      tx.name,
                      tx.merchantName,
                      matchedBill?.name,
                    )
                  : matchedBill
                    ? `Bill · ${matchedBill.name}`
                    : null;
                const treatAsBill = Boolean(matchedBill) || tx.excluded;
                const headerColor = showCatHeader
                  ? categoryColor(
                      catName === "Uncategorized" ? null : tx.categoryId,
                      catName === "Uncategorized" ? null : catName,
                      catName === "Uncategorized"
                        ? null
                        : cats.find((c) => c.id === tx.categoryId)?.colorKey,
                    )
                  : null;

                return (
                  <li key={tx.id}>
                    {showCatHeader && headerColor ? (
                      <p
                        className="flex items-center gap-2 border-b border-rule px-4 py-1.5 text-xs font-semibold uppercase tracking-wide"
                        style={{
                          backgroundColor: headerColor.bg,
                          color: headerColor.text,
                        }}
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ backgroundColor: headerColor.dot }}
                          aria-hidden
                        />
                        {catName}
                      </p>
                    ) : null}
                    <div
                      className={`grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7.25rem_13.5rem] sm:items-center sm:gap-x-5 ${
                        needsCat && !matchedBill ? "bg-accent-soft/40" : ""
                      } ${tx.excluded || matchedBill ? "bg-rule/25" : ""}`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-baseline justify-between gap-3 sm:block">
                          <p
                            className={`truncate font-medium leading-snug ${
                              treatAsBill ? "text-ink/80" : ""
                            }`}
                          >
                            {tx.merchantName || tx.name}
                          </p>
                          <span className="sm:hidden">
                            <TransactionAmount cents={tx.amountCents} />
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-xs text-ink">
                          {formatDisplayDate(tx.date)}
                          {accountLabel
                            ? ` · ${shortAccountMeta(accountLabel)}`
                            : ""}
                          {isDeposit ? " · Deposit" : ""}
                        </p>
                      </div>

                      <div className="hidden w-full justify-end sm:flex">
                        <TransactionAmount cents={tx.amountCents} />
                      </div>

                      <div className="col-span-2 min-w-0 sm:col-span-1">
                        {treatAsBill && status ? (
                          <span className="block truncate text-right text-xs font-semibold text-brand">
                            {status}
                          </span>
                        ) : isDeposit ? (
                          <span className="block text-right text-xs font-semibold text-safe">
                            Income
                          </span>
                        ) : (
                          <CategorySelect
                            transactionId={tx.id}
                            categoryId={tx.categoryId}
                            categories={cats}
                            emphasize={!tx.categoryId}
                          />
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        </>
      )}
    </>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-sm border px-3 py-1.5 text-sm ${
        active
          ? "border-brand bg-brand text-white"
          : "border-line bg-paper text-ink hover:border-brand-soft"
      }`}
    >
      {label}
    </button>
  );
}
