import { NextResponse } from "next/server";
import { syncAllPlaidItems } from "@/lib/plaid-sync";
import { hasPlaid } from "@/lib/plaid";

export async function POST() {
  if (!hasPlaid()) {
    return NextResponse.json({ error: "Plaid is not configured" }, { status: 400 });
  }
  const results = await syncAllPlaidItems();
  return NextResponse.json({ ok: true, results });
}
