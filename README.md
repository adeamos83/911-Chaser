# 911 Chaser

I don't own a Porsche 911 yet. I want one. This app is for people like me who are chasing that dream and want to buy the *right* 911 when the day comes.

You pick the 911 you want, and the app tells you what it costs on the used market today, which options are worth paying for, and which real cars for sale are good deals.

**Try it:** https://dream-911-chaser.vercel.app
**Demo login:** `demo@dream911chaser.com` / `FlatSix911!` (or click "Try the demo account" on the login card)

---

## What you can do

The app has four pages.

**Home.** See what the app does, then log in or create a free account.

**Configure.** Build the 911 you want.

- Pick the generation, model, body, gearbox, paint and options. The car changes color as you click.
- Combos Porsche never made (like a manual Turbo) are blocked.
- Slide the model year and mileage to see how the price moves.
- See the estimated price, and a line-by-line list of what each choice adds or takes away.
- A chart shows prices by model year, or by mileage.

**Garage.** Save your builds and keep an eye on them.

- Each build shows today's value and how much it has moved since you saved it.
- Each build links to the deals that match it.
- Only you can see your builds.

**Deals.** Real cars for sale, compared to our estimate for that exact car.

- Green means priced under our estimate. Red means over.
- Filter by model and generation, or show only models in your Garage.
- Sort by best deal, newest, or price.
- Every car links to the dealer's page.

---

## Where the data comes from

**Prices are real.** The app uses 2,898 used 911s (2012 and newer, Carrera through Turbo S) from the [MarketCheck API](https://www.marketcheck.com/apis/). These are **asking prices** from dealers, not final sale prices.

**Which options a car has is real.** MarketCheck gives us Porsche's factory option codes for each car (like `8LH` for Sport Chrono). The app turns those codes into option names using a table built from Porsche's own lists, then adds anything the dealer mentions in the listing.

**What each option is worth is modeled.** We only have option lists for about 300 cars so far, which is too few to measure option values fairly. So for now, the dollar values come from a model built on 911 market knowledge, and the app labels them as "modeled."

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
4. **Score payback.** Option value divided by what it cost new. Hover over an option in Configure to see how much of its cost it gets back.
5. **Estimate your build.** Start from similar cars, add the value of your paint, gearbox and options, then adjust for your model year and mileage. Each of these parts is shown on its own line, and they add up to the price.
6. **Score deals.** Compare each car's asking price to what the app expects that exact car to cost.

All of this math lives in `src/lib/engine/` and has automated tests.

---

## Not done yet

- **Real option values.** Options don't add value one at a time. A car with Sport Chrono, ceramic brakes and bucket seats together can be worth more than each piece added up. The next step is measuring which *combinations* of options raise the price, once the monthly pulls have collected enough cars.
- **Price history charts.** The monthly snapshots are being saved now. A chart of how prices move month to month comes next.
- **Sold prices.** The free plan only covers sold cars in one region.
- **Compare builds side by side**, a watchlist for listings, and more filters on the Deals page.
- **GT cars** (GT3, GT2 RS, S/T, Dakar).
- **A real photo for every model and color.** Right now one image stands in for every 911. Next, the picture should change when you pick a different model (Carrera, GTS, Turbo, and so on), and show the paint you picked on the actual car.

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

Next.js, TypeScript, Tailwind CSS, Supabase (logins and saved builds), Vitest (tests), Vercel (hosting), MarketCheck (car data), and GitHub Actions (monthly data pull).
