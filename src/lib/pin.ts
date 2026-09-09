const COOKIE_NAME = "splitbook_unlock";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

function getSecrets() {
  const pin = process.env.APP_PIN;
  const secret = process.env.SESSION_SECRET;
  if (!pin || !secret) {
    throw new Error("APP_PIN and SESSION_SECRET must be set in .env.local");
  }
  return { pin, secret };
}

function toHex(buffer: ArrayBuffer): string {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i += 1) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

async function sign(payload: string, secret: string, pin: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${payload}:${pin}`),
  );
  return toHex(sig);
}

export async function createSessionToken(): Promise<string> {
  const { pin, secret } = getSecrets();
  const expires = Date.now() + MAX_AGE_SECONDS * 1000;
  const payload = `${expires}`;
  const sig = await sign(payload, secret, pin);
  return `${payload}.${sig}`;
}

export async function isValidSessionToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  try {
    const { pin, secret } = getSecrets();
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return false;
    const expires = Number(payload);
    if (!Number.isFinite(expires) || Date.now() > expires) return false;
    const expected = await sign(payload, secret, pin);
    return timingSafeEqualHex(sig, expected);
  } catch {
    return false;
  }
}

export function verifyPin(input: string): boolean {
  try {
    const { pin } = getSecrets();
    if (input.length !== pin.length) return false;
    let out = 0;
    for (let i = 0; i < pin.length; i += 1) {
      out |= input.charCodeAt(i) ^ pin.charCodeAt(i);
    }
    return out === 0;
  } catch {
    return false;
  }
}

export const unlockCookie = {
  name: COOKIE_NAME,
  maxAge: MAX_AGE_SECONDS,
  options: {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  },
};
