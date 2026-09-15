/** Detect non-spend outflows that should not hit “Already spent”. */

export function isCreditCardPayment(
  name: string,
  merchantName?: string | null,
): boolean {
  const hay = `${merchantName || ""} ${name}`.toLowerCase();
  if (hay.includes("applecard") || hay.includes("apple card")) {
    if (
      hay.includes("payment") ||
      hay.includes("pmt") ||
      hay.includes("eft pmt")
    ) {
      return true;
    }
  }
  if (hay.includes("payment thank you")) return true;
  if (/\beft pmt\b/.test(hay) && hay.includes("payment")) return true;
  if (hay.includes("credit card payment")) return true;
  if (hay.includes("card payment")) return true;
  return false;
}

/**
 * Own-account / non-spend transfers.
 * ATH Móvil (TRANF ATHM …) to merchants/people is often real spend — do not blanket-exclude.
 */
export function isAccountTransfer(
  name: string,
  merchantName?: string | null,
): boolean {
  const hay = `${merchantName || ""} ${name}`.toLowerCase();
  if (hay.includes("online transfer")) return true;
  if (hay.includes("transfer to savings")) return true;
  if (hay.includes("transfer from")) return true;
  if (hay.includes("internal transfer")) return true;
  if (/\bach\b/.test(hay) && hay.includes("transfer")) return true;
  return false;
}

export type AutoExcludeReason = "credit_card_payment" | "transfer";

export function shouldAutoExcludeTransaction(
  name: string,
  merchantName?: string | null,
): AutoExcludeReason | null {
  if (isCreditCardPayment(name, merchantName)) return "credit_card_payment";
  if (isAccountTransfer(name, merchantName)) return "transfer";
  return null;
}

/** Status chip for excluded txs — more specific than “Ignored”. */
export function exclusionStatusLabel(
  name: string,
  merchantName?: string | null,
  matchedBillName?: string | null,
): string {
  if (matchedBillName) return `Bill · ${matchedBillName}`;
  const reason = shouldAutoExcludeTransaction(name, merchantName);
  if (reason === "credit_card_payment") return "Credit card payment";
  if (reason === "transfer") return "Transfer";
  return "Not counted";
}

export function normalizeBillMatchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compact(value: string): string {
  return normalizeBillMatchText(value).replace(/\s+/g, "");
}

/** Loose name overlap for bill ↔ merchant matching. */
export function billNameMatchesTx(
  billName: string,
  txName: string,
  merchantName?: string | null,
): boolean {
  const bill = normalizeBillMatchText(billName);
  const hay = normalizeBillMatchText(`${merchantName || ""} ${txName}`);
  if (!bill || !hay) return false;

  if (hay.includes(bill) || bill.includes(hay)) return true;

  const billCompact = compact(billName);
  const hayCompact = compact(`${merchantName || ""} ${txName}`);
  if (hayCompact.includes(billCompact) || billCompact.includes(hayCompact)) {
    return true;
  }

  // Token overlap (ignore tiny tokens)
  const billTokens = bill.split(" ").filter((t) => t.length >= 3);
  if (billTokens.length === 0) return false;
  const hits = billTokens.filter(
    (t) => hay.includes(t) || hayCompact.includes(t),
  );
  // Single strong token (tmobile, spotify, icloud, chatgpt, cursor, gym)
  if (hits.length >= 1 && billTokens.some((t) => t.length >= 5 && hits.includes(t))) {
    return true;
  }
  return hits.length >= Math.min(2, billTokens.length);
}

/** Find which bill a transaction maps to (for UI labels / tidy). */
export function matchBillForTransaction(
  tx: {
    name: string;
    merchantName?: string | null;
    amountCents: number;
  },
  billRows: {
    id: string;
    name: string;
    amountCents: number;
  }[],
): { id: string; name: string } | null {
  const hits = billRows
    .filter((b) => b.amountCents === tx.amountCents)
    .filter((b) => billNameMatchesTx(b.name, tx.name, tx.merchantName));
  if (hits.length === 0) return null;
  hits.sort((a, b) => b.name.length - a.name.length);
  return { id: hits[0]!.id, name: hits[0]!.name };
}
