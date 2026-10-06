# Dream 911 Chaser

Spec a 991 or 992 Porsche 911 and see what it trades for on the used market, which options pay you back at resale, and which listings are priced under market.

**Live:** https://dream-911-chaser.vercel.app
**Demo login:** `demo@dream911chaser.com` / `FlatSix911!` (or create your own account, no email confirmation)

## Works

- Email/password auth (Supabase). `/garage` is protected; each user only sees their own builds (row-level security).
- **Configurator** (`/build`): generation, model, body, gearbox and paint, with impossible combos disabled (no manual Turbo, Targa is AWD only). The car recolors live.
- **Market estimate** for the exact spec, with a p25-p75 range and a confidence label.
- **Option payback**: every option ranked as Value Holder / Neutral / Money Pit by how much of its sticker price it recovers at resale.
- **Depreciation curve** for the selected model.
- **Garage**: save, rename, delete, and reopen builds. Data lives in Postgres and survives refresh.
- **Deals** (`/deals`): for-sale cars for your spec, ranked by how far under the model's expected price they're listed.
- **Leaderboard** on the landing page: horsepower per $1K of market price.

## How the numbers work

`src/lib/engine/` is plain TypeScript with unit tests (`npm test`).

1. Group comparable cars by generation + model.
2. Fit price against mileage and model year (OLS) per group, then restate every car at 15K miles and the group's median year.
3. Option premium = median adjusted price **with** the option minus **without**, pooled across groups using each car's residual from its group median. Fewer than 5 cars on either side is flagged low confidence.
4. Payback = premium / option MSRP. 80%+ is a Value Holder, under 30% is a Money Pit.
5. Estimate = strip known premiums from each comparable to get a "bare" price distribution, then add back the premiums your spec has.
6. Deal score = (expected price for that exact car - asking) / expected.

## Data

The 3,000 listings in `src/data/listings.json` are **modeled, not scraped**. `scripts/generate-seed.ts` builds them from a deterministic RNG using approximate MSRPs, a depreciation curve, a mileage penalty and planted per-option resale effects. The engine has no knowledge of those planted values; the tests check that it recovers them.

The engine is data-agnostic: a real Bring a Trailer export in the same `Listing` shape would drive every screen unchanged.

## Not done (deliberately cut for the 2-hour limit)

- Side-by-side compare of two saved builds
- Watchlist for individual listings
- Deal filters beyond generation/model (mileage, year)
- Real market data ingestion
- GT cars (GT3, GT2 RS, S/T, Dakar), which trade in a different market

## Run locally

```bash
npm install
cp .env.example .env.local   # add your Supabase URL + anon/publishable key
# run supabase/schema.sql in the Supabase SQL editor
npm run dev
npm test
```

Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Turn off "Confirm email" under Supabase Auth settings so new accounts can sign in immediately.

Stack: Next.js 15 (App Router), TypeScript, Tailwind, Supabase, Recharts, Vitest, Vercel.
