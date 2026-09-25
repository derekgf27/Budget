import Link from "next/link";
import { formatDate, parseDate } from "@/lib/money";

export function currentMonthKey(d = new Date()): string {
  return formatDate(d).slice(0, 7);
}

/**
 * Date to treat as "today" when viewing a YYYY-MM month.
 * Current month uses the real calendar day so days-left / half are correct.
 * Past months use the last day (the month is already over).
 */
export function dateFromMonthKey(key: string, today = new Date()): Date {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return today;
  if (key === currentMonthKey(today)) {
    return new Date(today.getFullYear(), today.getMonth(), today.getDate());
  }
  return new Date(y, m, 0);
}

export function shiftMonthKey(key: string, delta: number): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return formatDate(d).slice(0, 7);
}

export function formatMonthKeyLabel(key: string): string {
  return parseDate(`${key}-01`).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Resolve ?month=YYYY-MM; ignore invalid or future months. */
export function resolveMonthKey(
  raw: string | string[] | undefined,
  today = new Date(),
): string {
  const cur = currentMonthKey(today);
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value || !/^\d{4}-\d{2}$/.test(value)) return cur;
  if (value > cur) return cur;
  return value;
}

export function MonthPicker({
  monthKey,
  basePath,
}: {
  monthKey: string;
  basePath: string;
}) {
  const cur = currentMonthKey();
  const prev = shiftMonthKey(monthKey, -1);
  const next = shiftMonthKey(monthKey, 1);
  const canGoNext = next <= cur;
  const label = formatMonthKeyLabel(monthKey);

  function hrefFor(key: string) {
    if (key === cur) return basePath;
    return `${basePath}?month=${key}`;
  }

  return (
    <nav
      className="inline-flex items-center gap-1 rounded-sm border border-line bg-paper px-1 py-0.5"
      aria-label="Month"
    >
      <Link
        href={hrefFor(prev)}
        className="rounded-sm px-2 py-1 text-sm text-ink hover:bg-bg-elevated"
        aria-label={`Previous month, ${formatMonthKeyLabel(prev)}`}
      >
        ←
      </Link>
      <span className="min-w-[9.5rem] text-center text-sm font-medium tabular-nums">
        {label}
      </span>
      {canGoNext ? (
        <Link
          href={hrefFor(next)}
          className="rounded-sm px-2 py-1 text-sm text-ink hover:bg-bg-elevated"
          aria-label={`Next month, ${formatMonthKeyLabel(next)}`}
        >
          →
        </Link>
      ) : (
        <span
          className="px-2 py-1 text-sm text-ink-muted/40"
          aria-hidden
        >
          →
        </span>
      )}
    </nav>
  );
}
