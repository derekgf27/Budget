import { NextResponse } from "next/server";
import {
  createSessionToken,
  unlockCookie,
  verifyPin,
} from "@/lib/pin";

export async function POST(request: Request) {
  const body = (await request.json()) as { pin?: string };
  if (!body.pin || !verifyPin(body.pin)) {
    return NextResponse.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const token = await createSessionToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(unlockCookie.name, token, unlockCookie.options);
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(unlockCookie.name, "", {
    ...unlockCookie.options,
    maxAge: 0,
  });
  return response;
}
