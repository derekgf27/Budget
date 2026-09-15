import { NextResponse } from "next/server";
import { getPlaidClient, hasPlaid, plaidCountries, plaidProducts } from "@/lib/plaid";

export async function POST() {
  if (!hasPlaid()) {
    return NextResponse.json(
      { error: "Plaid is not configured. Add PLAID_CLIENT_ID and PLAID_SECRET." },
      { status: 400 },
    );
  }

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(
    /\/$/,
    "",
  );

  // Production OAuth banks require HTTPS redirect URIs. Skip on localhost.
  const redirectUri = appUrl.startsWith("https://")
    ? `${appUrl}/accounts`
    : undefined;

  try {
    const client = getPlaidClient();
    const response = await client.linkTokenCreate({
      user: { client_user_id: "splitbook-owner" },
      client_name: "Splitbook",
      products: plaidProducts(),
      country_codes: plaidCountries(),
      language: "en",
      ...(redirectUri ? { redirect_uri: redirectUri } : {}),
      webhook: `${appUrl}/api/plaid/webhook`,
    });

    return NextResponse.json({ link_token: response.data.link_token });
  } catch (err: unknown) {
    const message =
      err && typeof err === "object" && "response" in err
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (err as any).response?.data?.error_message || "Could not create link token"
        : err instanceof Error
          ? err.message
          : "Could not create link token";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
