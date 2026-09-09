import { Suspense } from "react";
import UnlockClient from "./unlock-client";

export default function UnlockPage() {
  return (
    <Suspense fallback={<div className="p-8 text-ink-muted">Loading…</div>}>
      <UnlockClient />
    </Suspense>
  );
}
