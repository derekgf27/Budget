"use client";

import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function UnlockClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("That PIN didn’t work.");
      return;
    }
    const next = searchParams.get("next") || "/";
    router.replace(next);
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-2xl border border-line bg-bg-elevated p-8 shadow-sm"
      >
        <p className="display text-3xl text-brand">Splitbook</p>
        <p className="mt-2 text-ink-muted">
          Enter your PIN to unlock your budget.
        </p>
        <label className="mt-8 block">
          <span className="text-sm font-medium text-ink-muted">PIN</span>
          <input
            type="password"
            inputMode="numeric"
            autoFocus
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="mt-1.5 w-full rounded-md border border-line bg-white px-3 py-3 text-lg tracking-[0.3em]"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}
        <button
          type="submit"
          disabled={loading || !pin}
          className="mt-6 w-full rounded-md bg-brand px-4 py-3 font-medium text-white hover:bg-brand-soft disabled:opacity-50"
        >
          {loading ? "Unlocking…" : "Unlock"}
        </button>
      </form>
    </div>
  );
}
