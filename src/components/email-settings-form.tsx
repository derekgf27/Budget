"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  saveEmailReminderSettings,
  sendTestEmailReminder,
} from "@/app/actions";
import {
  Field,
  buttonGhostClass,
  buttonPrimaryClass,
  inputClass,
} from "@/components/ui";

export function EmailSettingsForm({
  initialEmail,
  initialEnabled,
  emailConfigured,
}: {
  initialEmail: string;
  initialEnabled: boolean;
  emailConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [email, setEmail] = useState(initialEmail);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function save() {
    setMessage(null);
    setError(null);
    const fd = new FormData();
    fd.set("email", email);
    if (enabled) fd.set("enabled", "1");
    startTransition(async () => {
      const result = await saveEmailReminderSettings(fd);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Saved.");
      router.refresh();
    });
  }

  function sendTest() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const saveFd = new FormData();
      saveFd.set("email", email);
      if (enabled) saveFd.set("enabled", "1");
      const saved = await saveEmailReminderSettings(saveFd);
      if (!saved.ok) {
        setError(saved.error);
        return;
      }
      const result = await sendTestEmailReminder();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Test email sent — check your inbox.");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {!emailConfigured ? (
        <p className="rounded-sm border border-line bg-paper/70 px-3 py-2 text-sm">
          Add <code className="text-brand">RESEND_API_KEY</code> in Vercel env
          (or <code className="text-brand">.env.local</code>), then redeploy.
          Free Resend accounts can email the address you signed up with until
          you verify a domain.
        </p>
      ) : null}

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="size-4 accent-[var(--brand)]"
        />
        <span>Send email check-in reminders</span>
      </label>

      <Field label="Email address">
        <input
          className={inputClass}
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>
      <p className="text-sm text-ink">
        Emails go out at 1pm Eastern on the Sunday after each payday.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={buttonPrimaryClass}
          disabled={pending}
          onClick={save}
        >
          Save
        </button>
        <button
          type="button"
          className={buttonGhostClass}
          disabled={pending || !emailConfigured}
          onClick={sendTest}
        >
          Send test email
        </button>
      </div>

      {message ? <p className="text-sm text-safe">{message}</p> : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
