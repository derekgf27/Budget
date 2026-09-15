import { and, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { billPayments, bills, transactions } from "@/db/schema";
import {
  addDays,
  formatDate,
  monthBounds,
  occurrencesInRange,
  parseDate,
  type Cadence,
} from "@/lib/money";
import {
  billNameMatchesTx,
  shouldAutoExcludeTransaction,
} from "@/lib/transaction-classify";

const DATE_SLACK_DAYS = 5;

type Due = {
  billId: string;
  name: string;
  amountCents: number;
  date: string;
};

/**
 * Auto-ignore credit-card payments / account transfers, and exclude
 * expenses that match this month’s bills so spend isn’t double-counted.
 *
 * Monthly bills match even when next_due already rolled to next month
 * (e.g. Cursor charged Sept 6, next due Oct 6).
 */
export async function tidyTransactionsForSpend(today = new Date()): Promise<{
  transfersExcluded: number;
  billsExcluded: number;
}> {
  const db = getDb();
  const { start, end } = monthBounds(today);
  const periodStart = formatDate(start);
  const periodEnd = formatDate(end);

  const [txs, billRows, payments] = await Promise.all([
    db.select().from(transactions),
    db.select().from(bills),
    db.select().from(billPayments),
  ]);

  let transfersExcluded = 0;
  let billsExcluded = 0;

  // 1) Credit card payments / transfers
  for (const tx of txs) {
    if (tx.amountCents <= 0) continue;
    if (tx.excluded) continue;
    const reason = shouldAutoExcludeTransaction(tx.name, tx.merchantName);
    if (!reason) continue;
    await db
      .update(transactions)
      .set({ excluded: true })
      .where(eq(transactions.id, tx.id));
    transfersExcluded += 1;
  }

  const openTxs = await db
    .select()
    .from(transactions)
    .where(
      and(
        gte(transactions.date, periodStart),
        lte(transactions.date, periodEnd),
        eq(transactions.excluded, false),
      ),
    );
  const freshTxs = openTxs.filter((t) => t.amountCents > 0);

  const dues: Due[] = [];

  for (const bill of billRows) {
    const dates = occurrencesInRange(
      bill.nextDueDate,
      bill.cadence as Cadence,
      start,
      end,
    );
    for (const date of dates) {
      dues.push({
        billId: bill.id,
        name: bill.name,
        amountCents: bill.amountCents,
        date,
      });
    }
  }

  for (const p of payments) {
    const bill = billRows.find((b) => b.id === p.billId);
    if (!bill) continue;
    const anchor =
      p.dueDate >= periodStart && p.dueDate <= periodEnd
        ? p.dueDate
        : p.paidOn >= periodStart && p.paidOn <= periodEnd
          ? p.paidOn
          : null;
    if (!anchor) continue;
    if (dues.some((d) => d.billId === p.billId && d.date === p.dueDate)) {
      continue;
    }
    dues.push({
      billId: bill.id,
      name: bill.name,
      amountCents: bill.amountCents,
      date: anchor,
    });
  }

  // Monthly bills with next_due already in a future month: still look for
  // a same-amount name match somewhere in this calendar month.
  for (const bill of billRows) {
    if (dues.some((d) => d.billId === bill.id)) continue;
    if ((bill.cadence as Cadence) !== "monthly") continue;
    // Anchor to day-of-month from next due, clamped into this month
    const dueDay = parseDate(bill.nextDueDate).getDate();
    const lastDay = end.getDate();
    const day = Math.min(dueDay, lastDay);
    const anchor = formatDate(
      new Date(start.getFullYear(), start.getMonth(), day),
    );
    dues.push({
      billId: bill.id,
      name: bill.name,
      amountCents: bill.amountCents,
      date: anchor,
    });
  }

  const claimedTx = new Set<string>();
  const claimedBill = new Set<string>();

  async function claimBest(
    due: Due,
    windowStart: string,
    windowEnd: string,
    requireName: boolean,
  ) {
    if (claimedBill.has(due.billId)) return false;
    const dueTime = parseDate(due.date).getTime();

    const candidates = freshTxs
      .filter((t) => !claimedTx.has(t.id))
      .filter((t) => t.amountCents === due.amountCents)
      .filter((t) => t.date >= windowStart && t.date <= windowEnd)
      .map((t) => ({
        tx: t,
        nameHit: billNameMatchesTx(due.name, t.name, t.merchantName),
        dateDist: Math.abs(parseDate(t.date).getTime() - dueTime),
      }))
      .filter((c) => (requireName ? c.nameHit : true))
      .sort((a, b) => {
        if (a.nameHit !== b.nameHit) return a.nameHit ? -1 : 1;
        return a.dateDist - b.dateDist;
      });

    const best =
      candidates.find((c) => c.nameHit) ||
      (!requireName && candidates.length === 1 ? candidates[0] : null);

    if (!best) return false;

    claimedTx.add(best.tx.id);
    claimedBill.add(due.billId);
    if (!best.tx.excluded) {
      await db
        .update(transactions)
        .set({ excluded: true })
        .where(eq(transactions.id, best.tx.id));
      billsExcluded += 1;
    }
    return true;
  }

  // Pass 1: tight window around due date
  for (const due of dues) {
    const windowStart = formatDate(
      addDays(parseDate(due.date), -DATE_SLACK_DAYS),
    );
    const windowEnd = formatDate(addDays(parseDate(due.date), DATE_SLACK_DAYS));
    await claimBest(due, windowStart, windowEnd, false);
  }

  // Pass 2: name + amount anywhere in the month (subscription charged early/late)
  for (const due of dues) {
    await claimBest(due, periodStart, periodEnd, true);
  }

  return { transfersExcluded, billsExcluded };
}
