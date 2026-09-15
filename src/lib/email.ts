const RESEND_API = "https://api.resend.com/emails";

export type EmailConfig = {
  apiKey: string;
  from: string;
};

export function getEmailConfig(): EmailConfig | null {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) return null;
  const from =
    process.env.REMINDER_FROM_EMAIL?.trim() ||
    "Splitbook <onboarding@resend.dev>";
  return { apiKey, from };
}

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  return email;
}

export async function sendEmail({
  to,
  subject,
  text,
  html,
  config = getEmailConfig(),
}: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  config?: EmailConfig | null;
}): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  if (!config) {
    return {
      ok: false,
      error: "Email is not configured. Set RESEND_API_KEY.",
    };
  }
  const address = normalizeEmail(to);
  if (!address) {
    return { ok: false, error: "Email address looks invalid." };
  }

  try {
    const res = await fetch(RESEND_API, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
        "User-Agent": "splitbook/1.0",
      },
      body: JSON.stringify({
        from: config.from,
        to: [address],
        subject,
        text,
        html: html ?? `<p>${escapeHtml(text).replace(/\n/g, "<br/>")}</p>`,
      }),
    });
    const data = (await res.json()) as {
      id?: string;
      message?: string;
      name?: string;
    };
    if (!res.ok || !data.id) {
      return {
        ok: false,
        error: data.message || data.name || `Resend error (${res.status})`,
      };
    }
    return { ok: true, id: data.id };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Failed to send email",
    };
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}
