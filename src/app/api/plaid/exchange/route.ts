import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { accounts, plaidItems } from "@/db/schema";
import { getPlaidClient, hasPlaid } from "@/lib/plaid";
import { syncPlaidItem } from "@/lib/plaid-sync";

export async function POST(request: Request) {
  if (!hasPlaid()) {
    return NextResponse.json({ error: "Plaid is not configured" }, { status: 400 });
  }

  const body = (await request.json()) as {
    public_token?: string;
    institution?: { institution_id?: string; name?: string };
  };

  if (!body.public_token) {
    return NextResponse.json({ error: "public_token required" }, { status: 400 });
  }

  const client = getPlaidClient();
  const exchange = await client.itemPublicTokenExchange({
    public_token: body.public_token,
  });

  const accessToken = exchange.data.access_token;
  const itemId = exchange.data.item_id;

  const db = getDb();
  const existing = await db
    .select()
    .from(plaidItems)
    .where(eq(plaidItems.itemId, itemId));

  let itemRow = existing[0];
  if (itemRow) {
    await db
      .update(plaidItems)
      .set({
        accessToken,
        institutionId: body.institution?.institution_id,
        institutionName: body.institution?.name,
      })
      .where(eq(plaidItems.id, itemRow.id));
  } else {
    const inserted = await db
      .insert(plaidItems)
      .values({
        itemId,
        accessToken,
        institutionId: body.institution?.institution_id,
        institutionName: body.institution?.name,
      })
      .returning();
    itemRow = inserted[0];
  }

  const accountsRes = await client.accountsGet({ access_token: accessToken });
  for (const acct of accountsRes.data.accounts) {
    const found = await db
      .select()
      .from(accounts)
      .where(eq(accounts.plaidAccountId, acct.account_id));

    const values = {
      name: acct.name,
      officialName: acct.official_name ?? null,
      type: acct.type,
      mask: acct.mask ?? null,
      balanceCurrent: acct.balances.current?.toString() ?? null,
      balanceLimit: acct.balances.limit?.toString() ?? null,
      plaidAccountId: acct.account_id,
      plaidItemId: itemRow.id,
      source: "plaid" as const,
    };

    if (found[0]) {
      await db.update(accounts).set(values).where(eq(accounts.id, found[0].id));
    } else {
      await db.insert(accounts).values(values);
    }
  }

  await syncPlaidItem(itemRow.id);

  return NextResponse.json({ ok: true });
}
