/** Friendly account titles and visibility helpers. */

export type AccountLike = {
  id: string;
  name: string;
  displayName?: string | null;
  type: string;
  subtype?: string | null;
  source: string;
  balanceCurrent?: string | number | null;
  hidden?: boolean | null;
};

export function accountLabel(account: AccountLike): string {
  if (account.displayName?.trim()) return account.displayName.trim();

  const blob = `${account.name}`.toLowerCase();

  if (blob.includes("apple")) return "Apple Card";

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

export function visibleAccounts<T extends AccountLike>(all: T[]): T[] {
  return all.filter((a) => !a.hidden);
}

export function formatImportedAt(
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
