import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

export function getPlaidClient() {
  const clientId = process.env.PLAID_CLIENT_ID;
  const secret = process.env.PLAID_SECRET;
  const env = process.env.PLAID_ENV || "sandbox";

  if (!clientId || !secret) {
    throw new Error("PLAID_CLIENT_ID and PLAID_SECRET are required");
  }

  const configuration = new Configuration({
    basePath: PlaidEnvironments[env as keyof typeof PlaidEnvironments],
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": clientId,
        "PLAID-SECRET": secret,
      },
    },
  });

  return new PlaidApi(configuration);
}

export function hasPlaid() {
  return Boolean(process.env.PLAID_CLIENT_ID && process.env.PLAID_SECRET);
}

export function plaidProducts(): Products[] {
  const raw = process.env.PLAID_PRODUCTS || "transactions";
  return raw.split(",").map((p) => p.trim() as Products);
}

export function plaidCountries(): CountryCode[] {
  const raw = process.env.PLAID_COUNTRY_CODES || "US";
  return raw.split(",").map((c) => c.trim() as CountryCode);
}
