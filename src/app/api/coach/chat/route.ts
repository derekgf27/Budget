import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { hasDatabase } from "@/db";
import {
  buildCoachChatInstructions,
  coachModel,
  hasCoachAi,
} from "@/lib/coach";
import { buildCoachSnapshot } from "@/lib/coach-snapshot";

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
    return new Response("Database is not configured.", { status: 503 });
  }
  if (!hasCoachAi()) {
    return new Response(
      "Add GOOGLE_GENERATIVE_AI_API_KEY to .env.local for the coach chat.",
      { status: 503 },
    );
  }

  const body = (await request.json()) as {
    messages?: UIMessage[];
    month?: string;
  };
  const messages = body.messages ?? [];
  const monthKey = resolveMonthKey(body.month);

  const snapshot = await buildCoachSnapshot(monthKey);
  const result = streamText({
    model: coachModel(),
    instructions: buildCoachChatInstructions(snapshot),
    messages: await convertToModelMessages(messages),
  });

  return result.toUIMessageStreamResponse();
}
