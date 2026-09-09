import { NextResponse } from "next/server";
import { getPlaidClient, hasPlaid, plaidCountries, plaidProducts } from "@/lib/plaid";

export async function POST() {
  if (!hasPlaid()) {
    return NextResponse.json(
      { error: "Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET." },
      { status: 400 },
    );
  }

  const client = getPlaidClient();
  const response = await client.linkTokenCreate({
    user: { client_user_id: "splitbook-owner" },
    client_name: "Splitbook",
    products: plaidProducts(),
    country_codes: plaidCountries(),
    language: "en",
    webhook: process.env.NEXT_PUBLIC_APP_URL
      ? `${process.env.NEXT_PUBLIC_APP_URL}/api/plaid/webhook`
      : undefined,
  });

  return NextResponse.json({ link_token: response.data.link_token });
}
