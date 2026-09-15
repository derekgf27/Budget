"use client";

import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { useRouter } from "next/navigation";
import { buttonPrimaryClass } from "@/components/ui";

export function PlaidConnectButton({ enabled }: { enabled: boolean }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const loadToken = useCallback(async () => {
    setError("");
    const res = await fetch("/api/plaid/create-link-token", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Could not start Plaid Link");
      return;
    }
    setToken(data.link_token);
  }, []);

  useEffect(() => {
    if (enabled) void loadToken();
  }, [enabled, loadToken]);

  const onSuccess = useCallback(
    async (publicToken: string, metadata: { institution?: { institution_id: string; name: string } | null }) => {
      setBusy(true);
      const res = await fetch("/api/plaid/exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          public_token: publicToken,
          institution: metadata.institution,
        }),
      });
      setBusy(false);
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Exchange failed");
        return;
      }
      router.refresh();
    },
    [router],
  );

  const { open, ready } = usePlaidLink({
    token,
    onSuccess,
  });

  if (!enabled) {
    return (
      <p className="text-sm text-ink-muted">
        Add <code>PLAID_CLIENT_ID</code> and <code>PLAID_SECRET</code> to
        .env.local to connect cards.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        className={buttonPrimaryClass}
        disabled={!ready || busy || !token}
        onClick={() => open()}
      >
        {busy ? "Linking…" : "Connect with Plaid"}
      </button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}

export function SyncPlaidButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function sync() {
    setBusy(true);
    setMessage("");
    const res = await fetch("/api/plaid/sync", { method: "POST" });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) {
      setMessage(data.error || "Sync failed");
      return;
    }
    setMessage(
      data.paychecks?.logged || data.paychecks?.updated
        ? `Synced · ${data.paychecks.logged || 0} paycheck(s) logged`
        : "Synced latest transactions",
    );
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={sync}
        disabled={busy}
        className="rounded-md border border-line px-4 py-2 text-sm hover:bg-bg-elevated disabled:opacity-50"
      >
        {busy ? "Syncing…" : "Sync transactions"}
      </button>
      {message ? <p className="text-sm text-ink-muted">{message}</p> : null}
    </div>
  );
}
