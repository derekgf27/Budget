/** Friendly account titles and visibility helpers. */

export type AccountLike = {
  id: string;
  name: string;
  displayName?: string | null;
  officialName?: string | null;
  type: string;
  subtype?: string | null;
  source: string;
  mask?: string | null;
  balanceCurrent?: string | number | null;
  hidden?: boolean | null;
  institutionName?: string | null;
};

export function accountLabel(account: AccountLike): string {
  if (account.displayName?.trim()) return account.displayName.trim();

  const blob = `${account.name} ${account.officialName || ""} ${account.institutionName || ""}`.toLowerCase();

  if (account.source === "csv" && blob.includes("apple")) {
    return "Apple Card";
  }

  if (blob.includes("popular")) {
    if (
      account.subtype === "savings" ||
      blob.includes("ahorros") ||
      blob.includes("savings")
    ) {
      return "Popular savings";
    }
    if (account.type === "credit") return "Popular card";
    return "Popular checking";
  }

  return account.name;
}

export function isEmptyDuplicateAccount(
  _account: AccountLike,
  _all: AccountLike[],
): boolean {
  return false;
}

export function visibleAccounts<T extends AccountLike>(all: T[]): T[] {
  return all.filter((a) => !a.hidden && !isEmptyDuplicateAccount(a, all));
}

export function formatSyncedAt(
  value: Date | string | null | undefined,
): string | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
