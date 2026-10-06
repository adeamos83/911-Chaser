# Dream 911 Chaser

I don't own a Porsche 911 yet. I want one. This app is for people like me who are chasing that dream and want to buy the *right* 911 when the day comes.

You pick the 911 you want, and the app tells you what it costs on the used market today, which options are worth paying for, and which real cars for sale are good deals.

**Try it:** https://dream-911-chaser.vercel.app
**Demo login:** `demo@dream911chaser.com` / `FlatSix911!` (or click "Use demo account" on the sign-in page)

---

## What you can do

- **Build your dream 911.** Pick the generation, model, body style, gearbox and paint. The car changes color as you click. Combos Porsche never made (like a manual Turbo) are blocked.
- **See what it costs.** Get a price range for your exact car, based on real cars for sale right now. Slide the mileage to see how the price moves.
- **See how it loses value.** A chart shows prices by model year, plus how much each extra year and each 10,000 miles cost you.
- **Find out which options pay off.** Options are sorted into Value Holders, Neutral, and Money Pits.
- **Find deals.** Real cars for sale, ranked by how far under the expected price they're listed, with a link to each dealer's page.
- **Save your builds.** Sign in to save, rename, and delete builds in your Garage. Only you can see your builds.
- **Best value 911.** The home page ranks models by horsepower per $1,000 of price.

---

## Where the data comes from

**Prices are real.** The app uses 2,898 used 911s (2012 and newer, Carrera through Turbo S) from the [MarketCheck API](https://www.marketcheck.com/apis/). These are **asking prices** from dealers, not final sale prices.

**Option values are estimated.** Most dealer listings don't say which options a car has. If a car has an option but the listing doesn't mention it, the math gets thrown off. So for now, option values come from a model built on 911 market knowledge, and the app labels them as "modeled."

Race-focused cars (GT3, GT2 RS, Dakar and others) are left out. They sell in a different market.

---

## How the data stays fresh

The app pulls new data **once a month**, on the 1st, and stops at **400 API calls**.

Why it works this way:

1. **We only get 500 free API calls a month.** Stopping at 400 means we can never go over, even if something goes wrong.
2. **We don't need to pull more often.** One pull gets thousands of cars, which is plenty to price any build. Used 911 prices move slowly, so monthly data stays useful all month.

Each month the pull does three things:

- Searches for used 911s for sale (about 100 calls, 50 cars per call). MarketCheck returns up to 500 cars per model year, so the newest years (2024 to 2026, which have more) are a large sample, not every car.
- Uses the rest of the calls to get option lists for cars we don't have yet. Over time, more and more cars will have real option data.
- Saves a snapshot of that month's prices. Later, we can compare months to see which cars dropped in price and which ones sold.

---

## How the numbers work

1. **Group similar cars.** For example, every 992.1 Carrera S goes in one group.
2. **Make them fair to compare.** Older cars and higher-mileage cars cost less. The app measures how much, then adjusts every car to the same mileage and year.
3. **Value each option.** Compare the typical price of cars *with* an option to cars *without* it. If either side has fewer than 5 cars, the result is marked low confidence.
4. **Score payback.** Option value divided by what it cost new. 80% or more is a Value Holder. Under 30% is a Money Pit.
5. **Estimate your build.** Start from similar cars, add the value of your options, then adjust for your mileage.
6. **Score deals.** Compare each car's asking price to what the app expects that exact car to cost.

All of this math lives in `src/lib/engine/` and has automated tests.

---

## Not done yet

- **Real option values.** MarketCheck has Porsche factory option codes for each car. Decoding them would replace the modeled option values with real ones.
- **Price history charts.** The monthly snapshots are being saved now. A chart of how prices move month to month comes next.
- **Sold prices.** The free plan only covers sold cars in one region.
- **Compare builds side by side**, a watchlist for listings, and more filters on the Deals page.
- **GT cars** (GT3, GT2 RS, S/T, Dakar).

---

## Run it on your computer

You need [Node.js](https://nodejs.org) and a free [Supabase](https://supabase.com) project.

```bash
npm install
cp .env.example .env.local   # then add your Supabase URL and key
npm run dev                  # open http://localhost:3000
npm test                     # run the tests
```

In Supabase:

1. Run `supabase/schema.sql` in the SQL editor. This creates the table for saved builds.
2. Under Auth settings, turn off "Confirm email" so new accounts can sign in right away.

You only need a `MARKETCHECK_API_KEY` if you want to pull fresh data yourself (`npm run pull -- monthly`). The app works without it, using the data already in the repo.

---

## Built with

Next.js, TypeScript, Tailwind CSS, Supabase (logins and saved builds), Recharts (charts), Vitest (tests), Vercel (hosting), MarketCheck (car data), and GitHub Actions (monthly data pull).
