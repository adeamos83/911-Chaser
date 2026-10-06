/**
 * Pulls real 991/992 listings from MarketCheck.
 * Every raw response is cached under .cache/marketcheck so re-running never spends calls twice.
 *
 *   npx tsx --env-file=.env.local scripts/pull-marketcheck.ts search
 *   npx tsx --env-file=.env.local scripts/pull-marketcheck.ts extras 350
 *   npx tsx scripts/pull-marketcheck.ts build
 *
 * Monthly refresh (run by .github/workflows/monthly-pull.yml), capped at MARKETCHECK_BUDGET calls (default 400,
 * free tier is 500/month): re-searches the whole market, spends the rest on option sheets for cars that don't
 * have one yet, rebuilds listings.json and saves data/snapshots/<YYYY-MM>.json so price history accumulates.
 *
 *   npx tsx scripts/pull-marketcheck.ts monthly
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Listing } from "../src/data/types";

const API = "https://api.marketcheck.com/v2";
const CACHE = join(__dirname, "..", ".cache", "marketcheck");
const LISTINGS = join(__dirname, "..", "src", "data", "listings.json");
const SNAPSHOTS = join(__dirname, "..", "data", "snapshots");
const KEY = process.env.MARKETCHECK_API_KEY;
const BUDGET = Number(process.env.MARKETCHECK_BUDGET ?? 400);
const MONTH = new Date().toISOString().slice(0, 7);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Thrown when we've used up this run's call budget, so callers can stop cleanly. */
class BudgetSpent extends Error {}

let calls = 0;
async function get(path: string, params: Record<string, string | number>, cacheFile: string) {
  const file = join(CACHE, cacheFile);
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  if (!KEY) throw new Error("MARKETCHECK_API_KEY missing");
  if (calls >= BUDGET) throw new BudgetSpent(`call budget of ${BUDGET} spent`);
  const qs = new URLSearchParams({ api_key: KEY, ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) });
  const res = await fetch(`${API}/${path}?${qs}`);
  calls++;
  const body = await res.json();
  if (!res.ok) throw new Error(`${res.status} ${JSON.stringify(body).slice(0, 200)}`);
  // MarketCheck embeds the caller's key in cached photo URLs; never persist it.
  writeFileSync(file, JSON.stringify(body).replaceAll(KEY, "REDACTED"));
  await sleep(250);
  return body;
}

/** `searchDir` is "search" for the original one-time pull and "<YYYY-MM>/search" for monthly pulls. */
async function search(searchDir = "search") {
  mkdirSync(join(CACHE, searchDir), { recursive: true });
  for (let year = 2012; year <= new Date().getFullYear() + 1; year++) {
    let start = 0;
    let found = Infinity;
    while (start < Math.min(found, 500)) {
      const page = await get(
        "search/car/active",
        { make: "porsche", model: "911", year, car_type: "used", rows: 50, start },
        `${searchDir}/${year}-${start}.json`,
      );
      found = page.num_found ?? 0;
      start += 50;
    }
    console.log(`${year}: ${found} found`);
  }
  console.log(`search done, ${calls} new calls`);
}

interface RawListing {
  id: string;
  vin: string;
  price?: number;
  miles?: number;
  msrp?: number;
  exterior_color?: string;
  base_ext_color?: string;
  first_seen_at_date?: string;
  dom?: number;
  vdp_url?: string;
  heading?: string;
  build?: { year?: number; trim?: string; version?: string; transmission?: string; body_type?: string };
}

function allSearchListings(searchDir = "search"): RawListing[] {
  const dir = join(CACHE, searchDir);
  const seen = new Map<string, RawListing>();
  for (const f of readdirSync(dir)) {
    for (const l of JSON.parse(readFileSync(join(dir, f), "utf8")).listings ?? []) seen.set(l.vin ?? l.id, l);
  }
  return [...seen.values()];
}

function previousListings(): Map<string, Listing> {
  if (!existsSync(LISTINGS)) return new Map();
  return new Map((JSON.parse(readFileSync(LISTINGS, "utf8")) as Listing[]).map((l) => [l.id, l]));
}

async function extras(limit: number, searchDir = "search") {
  mkdirSync(join(CACHE, "extra"), { recursive: true });
  const { mapListing } = await import("./marketcheck-map");
  const prev = previousListings();

  // Group cars by generation + trim (e.g. "992.1|Carrera S").
  // Skip cars we can't use, and cars whose option sheet we already have (build() reuses those).
  const groups = new Map<string, RawListing[]>();
  for (const raw of allSearchListings(searchDir)) {
    const car = mapListing(raw);
    if (!car) continue;
    if (prev.get(car.id)?.optionsKnown) continue;

    const key = `${car.generation}|${car.trim}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(raw);
  }

  // Take one car from each group in turn, so every generation + trim gets option data.
  const order: RawListing[] = [];
  const queues = [...groups.values()];
  while (order.length < limit && queues.some((q) => q.length)) {
    for (const q of queues) if (q.length && order.length < limit) order.push(q.shift()!);
  }
  for (const l of order) {
    try {
      await get(`listing/car/${l.id}/extra`, {}, `extra/${l.id}.json`);
    } catch (e) {
      if (e instanceof BudgetSpent) break;
      console.warn(`skip ${l.id}: ${(e as Error).message}`);
    }
  }
  console.log(`extras done, ${calls} new calls`);
}

async function build(searchDir = "search") {
  const { mapListing, mapOptions } = await import("./marketcheck-map");
  const prev = previousListings();
  const out = [];
  for (const raw of allSearchListings(searchDir)) {
    const m = mapListing(raw);
    if (!m) continue;
    const extraFile = join(CACHE, "extra", `${raw.id}.json`);
    const extra = existsSync(extraFile) ? JSON.parse(readFileSync(extraFile, "utf8")) : null;
    const lastMonth = prev.get(m.id);

    if (extra) {
      // We pulled this car's option sheet: decode it.
      out.push({ ...m, options: mapOptions(extra, m.body), optionsKnown: true });
    } else if (lastMonth?.optionsKnown) {
      // We pulled it in an earlier month: reuse those options instead of paying for them again.
      out.push({ ...m, options: lastMonth.options, optionsKnown: true });
    } else {
      out.push({ ...m, options: [], optionsKnown: false });
    }
  }
  writeFileSync(LISTINGS, JSON.stringify(out));
  console.log(`wrote ${out.length} listings (${out.filter((l) => l.optionsKnown).length} with options)`);

  // One small row per car per month, so later pulls can compare prices and spot cars that sold.
  mkdirSync(SNAPSHOTS, { recursive: true });
  const rows = out.map((car) => ({
    id: car.id,
    generation: car.generation,
    trim: car.trim,
    modelYear: car.modelYear,
    mileage: car.mileage,
    price: car.price,
    daysOnMarket: car.dom,
  }));
  writeFileSync(join(SNAPSHOTS, `${MONTH}.json`), JSON.stringify(rows));
  console.log(`wrote snapshot ${MONTH} (${rows.length} cars)`);
}

/** Run all three steps for this month. Each month's search results get their own cache folder. */
async function monthly() {
  const dir = `${MONTH}/search`;
  await search(dir);
  await extras(BUDGET, dir);
  await build(dir);
  console.log(`monthly pull done: ${calls} of ${BUDGET} budgeted calls used`);
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "search") search();
else if (cmd === "extras") extras(Number(arg ?? 350));
else if (cmd === "build") build();
else if (cmd === "monthly") monthly();
else console.log("usage: search | extras <n> | build | monthly");
