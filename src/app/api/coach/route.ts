import { NextResponse } from "next/server";
import { generateCoachAdvice } from "@/lib/coach";
import { buildCoachSnapshot } from "@/lib/coach-snapshot";
import { hasDatabase } from "@/db";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function resolveMonthKey(raw: unknown): string {
  if (typeof raw === "string" && /^\d{4}-\d{2}$/.test(raw)) return raw;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function POST(request: Request) {
  if (!hasDatabase()) {
    return NextResponse.json(
      { error: "Database is not configured." },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    month?: string;
  };
  const monthKey = resolveMonthKey(body.month);

  try {
    const snapshot = await buildCoachSnapshot(monthKey);
    const advice = await generateCoachAdvice(snapshot);
    return NextResponse.json({
      monthKey,
      monthLabel: snapshot.monthLabel,
      advice,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Could not generate coaching";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
