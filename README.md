# Splitbook

Personal dual-paycheck budgeting app: bills, savings, category budgets, Plaid card sync, and CSV import — with a desktop-first money-split dashboard.

## Setup

1. **Clone / open** this folder and install:

```bash
npm install
```

2. **Copy env file** and fill values:

```bash
cp .env.example .env.local
```

Required:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string |

Optional (card linking):

| Variable | Purpose |
| --- | --- |
| `PLAID_CLIENT_ID` / `PLAID_SECRET` | From [Plaid Dashboard](https://dashboard.plaid.com) (sandbox) |
| `PLAID_ENV` | `sandbox` (default) or `production` |
| `NEXT_PUBLIC_APP_URL` | Public URL (needed for Plaid webhooks after deploy) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | Optional — free Gemini key from [Google AI Studio](https://aistudio.google.com/apikey) for the AI coach |

3. **Create a Neon database** (free tier is fine), paste the connection string into `DATABASE_URL`, then:

```bash
npm run db:push
npm run db:seed
```

4. **Run locally:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deploy (phone access)

1. Push the repo and import the project in [Vercel](https://vercel.com).
2. Add a Neon integration / set `DATABASE_URL` and Plaid vars in the Vercel project env.
3. Set `NEXT_PUBLIC_APP_URL` to your Vercel URL (e.g. `https://your-app.vercel.app`).
4. Deploy. Open that URL on your phone.

## Features

- Two job paychecks with cadence + next payday
- Recurring bills and savings goals
- Budget categories with monthly progress
- Money-split chart + **safe to spend** for the current paycheck window
- Plaid Link + on-demand / webhook sync
- CSV statement import with basic dedupe
- Email check-in reminders (Resend)
- Home **Coach** chat — ask about your income, bills, and spend (Gemini optional)

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Local Next.js server |
| `npm run db:push` | Push Drizzle schema to Neon |
| `npm run db:seed` | Seed demo jobs, bills, categories, savings |
| `npm test` | Allocation engine unit tests |

## Security

There is no login. Keep the Vercel URL private if you deploy a personal budget.