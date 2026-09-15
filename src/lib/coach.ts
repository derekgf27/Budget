import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { generateText, Output } from "ai";
import { z } from "zod";
import {
  formatSnapshotForPrompt,
  type CoachSnapshot,
} from "@/lib/coach-snapshot";
import { centsToDollars } from "@/lib/money";

export const coachTipSchema = z.object({
  headline: z
    .string()
    .describe("Short tip title, max ~12 words, specific to their numbers"),
  detail: z
    .string()
    .describe(
      "1–2 sentences that cite exact dollar amounts from the snapshot",
    ),
  evidence: z
    .string()
    .describe(
      "Key numbers used, e.g. Left $215.91 · Already spent $303.52 · 15 days left",
    ),
  tone: z.enum(["good", "watch", "urgent"]),
});

export const coachAdviceSchema = z.object({
  summary: z
    .string()
    .describe(
      "One sentence overview that cites at least one dollar amount from the snapshot",
    ),
  tips: z.array(coachTipSchema).min(2).max(5),
});

export type CoachAdvice = z.infer<typeof coachAdviceSchema> & {
  source: "ai" | "rules";
};

function geminiApiKey(): string | undefined {
  return (
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.GEMINI_API_KEY ||
    undefined
  );
}

export function hasCoachAi(): boolean {
  return Boolean(geminiApiKey());
}

export function coachModel() {
  const google = createGoogleGenerativeAI({ apiKey: geminiApiKey() });
  const id = process.env.AI_COACH_MODEL || "gemini-3.6-flash";
  return google(id);
}

const SYSTEM = `You are Splitbook's personal finance coach for ONE person with two paychecks.
You only advise from the SNAPSHOT numbers provided. Every tip must cite real dollar amounts from that snapshot (use $X.XX format).
Never give generic advice like "cook at home" or "make a budget" unless you name their category, merchant, or paycheck from the snapshot.
Be direct and practical for a dual-paycheck month: income → bills → savings → leftover.
If income is $0.00, say they need to log paychecks — do not invent income.
Tone: calm notebook coach, not a bank ad.`;

/** System instructions for the chat coach, with live numbers embedded. */
export function buildCoachChatInstructions(snapshot: CoachSnapshot): string {
  return `${SYSTEM}

You are chatting with the user. Keep replies concise (a few short paragraphs).
If they ask for something not in the snapshot, say you don't have that figure — do not invent it.
Open with concrete numbers when they ask for an overview.

CURRENT SNAPSHOT:
${formatSnapshotForPrompt(snapshot)}`;
}

function looksGrounded(text: string): boolean {
  return /\$\d/.test(text);
}

function filterGrounded(advice: z.infer<typeof coachAdviceSchema>) {
  const tips = advice.tips.filter(
    (t) => looksGrounded(t.detail) || looksGrounded(t.evidence),
  );
  return {
    summary: advice.summary,
    tips: tips.length >= 2 ? tips : advice.tips,
  };
}

/** Deterministic, number-specific tips when AI is unavailable. */
export function ruleBasedAdvice(snapshot: CoachSnapshot): CoachAdvice {
  const $ = centsToDollars;
  const tips: z.infer<typeof coachTipSchema>[] = [];

  if (snapshot.incomeCents === 0) {
    tips.push({
      headline: "Log paychecks to unlock real Left",
      detail: `Income is ${$(0)} this month, so Left ${$(snapshot.safeToSpendCents)} is not usable yet. Log PHSU/Ciracet (or your jobs) first.`,
      evidence: `Income ${$(snapshot.incomeCents)} · Left ${$(snapshot.safeToSpendCents)}`,
      tone: "urgent",
    });
  } else if (snapshot.safeToSpendCents < 0) {
    tips.push({
      headline: "Plans exceed what you made",
      detail: `You logged ${$(snapshot.incomeCents)} but bills ${$(snapshot.billsCents)} + savings ${$(snapshot.savingsCents)} + spent ${$(snapshot.spentCents)} leave you at ${$(snapshot.safeToSpendCents)}. Trim savings/bills or log more pay.`,
      evidence: `Income ${$(snapshot.incomeCents)} · Bills ${$(snapshot.billsCents)} · Savings ${$(snapshot.savingsCents)} · Spent ${$(snapshot.spentCents)} · Left ${$(snapshot.safeToSpendCents)}`,
      tone: "urgent",
    });
  } else {
    tips.push({
      headline: `${$(snapshot.safeToSpendCents)} left · ${snapshot.daysLeft} days`,
      detail: `After bills ${$(snapshot.billsCents)} and savings ${$(snapshot.savingsCents)}, you have ${$(snapshot.safeToSpendCents)} left from ${$(snapshot.incomeCents)} income. Already spent ${$(snapshot.spentCents)}.`,
      evidence: `Left ${$(snapshot.safeToSpendCents)} · ${snapshot.daysLeft} days · Spent ${$(snapshot.spentCents)}`,
      tone:
        snapshot.daysLeft > 7 && snapshot.safeToSpendCents < 10_000
          ? "watch"
          : "good",
    });
  }

  const hot = snapshot.categories.find((c) => c.pct >= 80 && c.limitCents > 0);
  if (hot) {
    tips.push({
      headline: `${hot.name} is at ${hot.pct}% of its limit`,
      detail: `You spent ${$(hot.spentCents)} of ${$(hot.limitCents)} on ${hot.name}. Pace the rest of ${snapshot.monthLabel} against that limit.`,
      evidence: `${hot.name} ${$(hot.spentCents)} / ${$(hot.limitCents)} (${hot.pct}%)`,
      tone: hot.pct >= 100 ? "urgent" : "watch",
    });
  }

  const top = snapshot.topMerchants[0];
  if (top && snapshot.spentCents > 0) {
    const share = Math.round((top.amountCents / snapshot.spentCents) * 100);
    tips.push({
      headline: `${top.name} is ${share}% of spend`,
      detail: `${top.name} is ${$(top.amountCents)} across ${top.count} charge(s) out of ${$(snapshot.spentCents)} already spent.`,
      evidence: `${top.name} ${$(top.amountCents)} · Spent ${$(snapshot.spentCents)} (${share}%)`,
      tone: share >= 35 ? "watch" : "good",
    });
  }

  if (snapshot.unpaidBills.length > 0) {
    const due = snapshot.unpaidBills.reduce((s, b) => s + b.amountCents, 0);
    tips.push({
      headline: `${snapshot.unpaidBills.length} bill(s) still unpaid`,
      detail: `${$(due)} in unpaid bills is already reserved in Left — mark them paid when the money leaves so the checklist stays honest.`,
      evidence: `Unpaid ${$(due)} · Bills reserved ${$(snapshot.billsCents)}`,
      tone: "watch",
    });
  }

  if (
    snapshot.priorMonth &&
    snapshot.priorMonth.spentCents > 0 &&
    snapshot.spentCents > snapshot.priorMonth.spentCents
  ) {
    const delta = snapshot.spentCents - snapshot.priorMonth.spentCents;
    tips.push({
      headline: `Spending up vs ${snapshot.priorMonth.monthLabel}`,
      detail: `Already spent ${$(snapshot.spentCents)} this month vs ${$(snapshot.priorMonth.spentCents)} last month (+${$(delta)}).`,
      evidence: `This month spent ${$(snapshot.spentCents)} · Prior ${$(snapshot.priorMonth.spentCents)}`,
      tone: "watch",
    });
  }

  const incomeBits = snapshot.incomeByJob
    .filter((j) => j.logged)
    .map((j) => `${j.name} ${$(j.amountCents)}`)
    .join(" + ");

  return {
    source: "rules",
    summary: incomeBits
      ? `${snapshot.monthLabel}: ${incomeBits} → Left ${$(snapshot.safeToSpendCents)} after bills/savings/spend.`
      : `${snapshot.monthLabel}: income ${$(snapshot.incomeCents)}, Left ${$(snapshot.safeToSpendCents)}.`,
    tips: tips.slice(0, 5),
  };
}

export async function generateCoachAdvice(
  snapshot: CoachSnapshot,
): Promise<CoachAdvice> {
  if (!hasCoachAi()) {
    return ruleBasedAdvice(snapshot);
  }

  try {
    const { output } = await generateText({
      model: coachModel(),
      output: Output.object({ schema: coachAdviceSchema }),
      system: SYSTEM,
      prompt: `Write coaching for this exact snapshot. Cite numbers only from here.\n\nSNAPSHOT:\n${formatSnapshotForPrompt(snapshot)}`,
    });

    if (!output) {
      return ruleBasedAdvice(snapshot);
    }

    const grounded = filterGrounded(output);
    return { ...grounded, source: "ai" };
  } catch {
    return ruleBasedAdvice(snapshot);
  }
}
