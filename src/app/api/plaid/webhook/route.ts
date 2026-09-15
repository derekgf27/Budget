import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { plaidItems } from "@/db/schema";
import { syncPlaidItem } from "@/lib/plaid-sync";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    webhook_code?: string;
    item_id?: string;
  };

  if (body.item_id && body.webhook_code) {
    const db = getDb();
    const items = await db
      .select()
      .from(plaidItems)
      .where(eq(plaidItems.itemId, body.item_id));
    if (items[0]) {
      await syncPlaidItem(items[0].id);
      const { matchPaychecksFromDeposits } = await import("@/lib/paycheck-match");
      await matchPaychecksFromDeposits();
    }
  }

  return NextResponse.json({ ok: true });
}
