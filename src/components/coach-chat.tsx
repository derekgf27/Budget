"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useMemo, useState } from "react";
import {
  Panel,
  buttonGhostClass,
  buttonPrimaryClass,
  inputClass,
} from "@/components/ui";

const SUGGESTIONS = [
  "How am I doing this month?",
  "Why is Left where it is?",
  "What’s driving my spending?",
  "Any bills or categories to watch?",
];

function messageText(message: {
  parts?: { type: string; text?: string }[];
}): string {
  if (!message.parts?.length) return "";
  return message.parts
    .filter((p) => p.type === "text" && p.text)
    .map((p) => p.text!)
    .join("");
}

export function CoachChat({
  monthKey,
  aiEnabled,
}: {
  monthKey: string;
  aiEnabled: boolean;
}) {
  const [input, setInput] = useState("");

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/coach/chat",
        body: { month: monthKey },
      }),
    [monthKey],
  );

  const { messages, sendMessage, status, error, setMessages } = useChat({
    id: `coach-${monthKey}`,
    transport,
  });

  const busy = status === "submitted" || status === "streaming";

  function ask(text: string) {
    const trimmed = text.trim();
    if (!trimmed || busy || !aiEnabled) return;
    void sendMessage({ text: trimmed });
    setInput("");
  }

  if (!aiEnabled) {
    return (
      <Panel className="notebook-margin">
        <p className="text-sm text-ink">
          Add a free Gemini key to chat with the coach.
        </p>
        <p className="mt-2 text-sm text-ink-muted">
          Set{" "}
          <code className="text-brand">GOOGLE_GENERATIVE_AI_API_KEY</code> in{" "}
          <code className="text-brand">.env.local</code> from{" "}
          <a
            href="https://aistudio.google.com/apikey"
            className="underline underline-offset-2"
            target="_blank"
            rel="noreferrer"
          >
            Google AI Studio
          </a>
          , then restart the server.
        </p>
      </Panel>
    );
  }

  return (
    <Panel className="notebook-margin flex min-h-[28rem] flex-col">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-rule pb-3">
        <div>
          <h2 className="text-base font-semibold text-brand">Chat</h2>
          <p className="mt-0.5 text-xs text-ink-muted">
            Answers use this month’s paychecks, bills, and spend only.
          </p>
        </div>
        {messages.length > 0 ? (
          <button
            type="button"
            className={buttonGhostClass}
            disabled={busy}
            onClick={() => setMessages([])}
          >
            Clear
          </button>
        ) : null}
      </div>

      <div className="mt-4 flex flex-1 flex-col gap-3 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-ink-muted">
              Ask anything about this month’s money. Try one:
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className={buttonGhostClass}
                  disabled={busy}
                  onClick={() => ask(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const text = messageText(message);
            if (!text) return null;
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={`max-w-[92%] whitespace-pre-wrap text-sm leading-relaxed ${
                  isUser
                    ? "ml-auto rounded-sm bg-nav px-3 py-2 text-white"
                    : "mr-auto text-ink"
                }`}
              >
                {!isUser ? (
                  <p className="mb-1 text-xs font-medium uppercase tracking-[0.12em] text-ink-muted">
                    Coach
                  </p>
                ) : null}
                {text}
              </div>
            );
          })
        )}
        {busy ? (
          <p className="text-sm text-ink-muted">Reading your numbers…</p>
        ) : null}
        {error ? (
          <p className="text-sm text-danger">
            {error.message || "Something went wrong. Try again."}
          </p>
        ) : null}
      </div>

      <form
        className="mt-4 flex gap-2 border-t border-rule pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
      >
        <input
          className={`${inputClass} min-w-0 flex-1`}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={busy}
          placeholder="Ask about Left, bills, categories…"
          aria-label="Message the coach"
        />
        <button
          type="submit"
          className={buttonPrimaryClass}
          disabled={busy || !input.trim()}
        >
          Send
        </button>
      </form>
    </Panel>
  );
}
