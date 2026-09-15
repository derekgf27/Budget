import { and, desc, eq, gte, lte } from "drizzle-orm";
import { getDb } from "@/db";
import { incomeSources, paycheckLogs, transactions } from "@/db/schema";
import {
  addDays,
  advanceToOnOrAfter,
  formatDate,
  nextPaydayAfter,
  parseDate,
  retreatToOnOrBefore,
  type Cadence,
} from "@/lib/money";

export type PaycheckMatchResult = {
  logged: number;
  updated: number;
  skipped: number;
  matches: { jobName: string; date: string; amountCents: number }[];
};

const SNAP_DAYS = 3;

function keywordsFor(job: {
  name: string;
  depositMatch: string | null;
}): string[] {
  const raw = job.depositMatch?.trim() || job.name;
  return raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter((s) => s.length >= 2);
}

function findJob(
  description: string,
  jobs: { id: string; name: string; depositMatch: string | null }[],
) {
  const hay = description.toLowerCase();
  let best: { id: string; name: string; score: number } | null = null;

  for (const job of jobs) {
    for (const keyword of keywordsFor(job)) {
      if (!hay.includes(keyword)) continue;
      const score = keyword.length;
      if (!best || score > best.score) {
        best = { id: job.id, name: job.name, score };
      }
    }
  }
  return best;
}

/** Prefer the job's scheduled payday when the bank posts within a few days. */
function snapToPayday(
  depositDate: string,
  job: { nextPayday: string; cadence: string },
): string {
  const deposit = parseDate(depositDate);
  const cadence = job.cadence as Cadence;
  const last = retreatToOnOrBefore(job.nextPayday, cadence, deposit);
  const next = advanceToOnOrAfter(job.nextPayday, cadence, deposit);
  const candidates = [last, next];
  let best = depositDate;
  let bestDist = Infinity;
  const maxMs = SNAP_DAYS * 24 * 60 * 60 * 1000;
  for (const iso of candidates) {
    const dist = Math.abs(parseDate(iso).getTime() - deposit.getTime());
    if (dist <= maxMs && dist < bestDist) {
      best = iso;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Match bank deposits (negative amountCents) to jobs and upsert paycheck logs.
 */
export async function matchPaychecksFromDeposits(): Promise<PaycheckMatchResult> {
  const db = getDb();
  const [jobs, txs] = await Promise.all([
    db.select().from(incomeSources),
    db
      .select()
      .from(transactions)
      .where(eq(transactions.excluded, false))
      .orderBy(desc(transactions.date))
      .limit(500),
  ]);

  const result: PaycheckMatchResult = {
    logged: 0,
    updated: 0,
    skipped: 0,
    matches: [],
  };

  if (jobs.length === 0) return result;

  const jobsById = new Map(jobs.map((j) => [j.id, j]));
  const deposits = txs.filter((t) => t.amountCents < 0);
  // One deposit per job+payday — prefer largest amount if multiples
  const claimed = new Set<string>();

  for (const tx of deposits) {
    const description = `${tx.merchantName || ""} ${tx.name}`;
    const matched = findJob(description, jobs);
    if (!matched) {
      result.skipped += 1;
      continue;
    }

    const jobRow = jobsById.get(matched.id)!;
    const paidOn = snapToPayday(tx.date, jobRow);
    const key = `${matched.id}:${paidOn}`;
    if (claimed.has(key)) {
      result.skipped += 1;
      continue;
    }
    claimed.add(key);

    const amountCents = Math.abs(tx.amountCents);
    const note = `Auto from bank · ${tx.merchantName || tx.name}`.slice(0, 180);

    const windowStart = formatDate(addDays(parseDate(paidOn), -SNAP_DAYS));
    const windowEnd = formatDate(addDays(parseDate(paidOn), SNAP_DAYS));
    const nearby = await db
      .select()
      .from(paycheckLogs)
      .where(
        and(
          eq(paycheckLogs.incomeSourceId, matched.id),
          gte(paycheckLogs.paidOn, windowStart),
          lte(paycheckLogs.paidOn, windowEnd),
        ),
      );

    const existing = nearby.sort(
      (a, b) =>
        Math.abs(parseDate(a.paidOn).getTime() - parseDate(paidOn).getTime()) -
        Math.abs(parseDate(b.paidOn).getTime() - parseDate(paidOn).getTime()),
    )[0];

    if (existing) {
      // Don't overwrite manually entered paycheck logs
      if (!existing.note?.startsWith("Auto from bank")) {
        result.skipped += 1;
        continue;
      }
      await db
        .update(paycheckLogs)
        .set({ amountCents, note, paidOn })
        .where(eq(paycheckLogs.id, existing.id));
      result.updated += 1;
    } else {
      await db.insert(paycheckLogs).values({
        incomeSourceId: matched.id,
        paidOn,
        amountCents,
        note,
      });
      result.logged += 1;
    }

    await db
      .update(incomeSources)
      .set({ netAmountCents: amountCents })
      .where(eq(incomeSources.id, matched.id));

    result.matches.push({
      jobName: matched.name,
      date: paidOn,
      amountCents,
    });
  }

  // Advance each job's next payday from its latest log — schedule follows money
  for (const job of jobs) {
    const latest = await db
      .select()
      .from(paycheckLogs)
      .where(eq(paycheckLogs.incomeSourceId, job.id))
      .orderBy(desc(paycheckLogs.paidOn))
      .limit(1);
    if (!latest[0]) continue;
    const paidOn = latest[0].paidOn;
    const advanced = nextPaydayAfter(
      paidOn,
      job.cadence as Cadence,
      job.nextPayday,
    );
    const nextPayday =
      advanced > job.nextPayday || job.nextPayday <= paidOn
        ? advanced
        : job.nextPayday;
    if (nextPayday !== job.nextPayday) {
      await db
        .update(incomeSources)
        .set({ nextPayday })
        .where(eq(incomeSources.id, job.id));
    }
  }

  return result;
}
