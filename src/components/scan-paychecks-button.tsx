"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { scanPaychecksFromBank } from "@/app/actions";
import { buttonGhostClass } from "@/components/ui";
import { centsToDollars } from "@/lib/money";

export function ScanPaychecksButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function scan() {
    setBusy(true);
    setMessage("");
    try {
      const result = await scanPaychecksFromBank();
      const parts = [];
      if (result.logged) parts.push(`${result.logged} new`);
      if (result.updated) parts.push(`${result.updated} updated`);
      if (parts.length === 0) {
        setMessage("No new paycheck deposits matched. Check match keywords on each job.");
      } else {
        const sample = result.matches
          .slice(0, 3)
          .map(
            (m) =>
              `${m.jobName} ${centsToDollars(m.amountCents)}`,
          )
          .join(" · ");
        setMessage(`Logged ${parts.join(", ")}: ${sample}`);
      }
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Scan failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <button
        type="button"
        className={buttonGhostClass}
        disabled={busy}
        onClick={() => void scan()}
      >
        {busy ? "Scanning…" : "Scan bank for paychecks"}
      </button>
      {message ? <p className="max-w-xs text-xs text-ink-muted">{message}</p> : null}
    </div>
  );
}
