import { EmailSettingsForm } from "@/components/email-settings-form";
import { PageHeader, Panel } from "@/components/ui";
import { hasDatabase } from "@/db";
import {
  getReminderEmail,
  isEmailRemindersEnabled,
} from "@/lib/checkin-email";
import { getEmailConfig } from "@/lib/email";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!hasDatabase()) {
    return (
      <PageHeader title="Settings" description="Add DATABASE_URL to continue." />
    );
  }

  const [email, enabled] = await Promise.all([
    getReminderEmail(),
    isEmailRemindersEnabled(),
  ]);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Email check-in reminders via Resend."
      />
      <Panel>
        <h2 className="display mb-4 text-xl text-brand">Email reminders</h2>
        <EmailSettingsForm
          initialEmail={email ?? ""}
          initialEnabled={enabled}
          emailConfigured={Boolean(getEmailConfig())}
        />
      </Panel>
    </div>
  );
}
