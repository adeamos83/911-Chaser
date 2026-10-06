/**
 * One-time pull of real 991/992 listings from MarketCheck.
 * Every raw response is cached under .cache/marketcheck so re-running never spends calls twice.
 *
 *   npx tsx --env-file=.env.local scripts/pull-marketcheck.ts search
 *   npx tsx --env-file=.env.local scripts/pull-marketcheck.ts extras 350
 *   npx tsx scripts/pull-marketcheck.ts build
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const API = "https://api.marketcheck.com/v2";
const CACHE = join(__dirname, "..", ".cache", "marketcheck");
const KEY = process.env.MARKETCHECK_API_KEY;
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

let calls = 0;
async function get(path: string, params: Record<string, string | number>, cacheFile: string) {
  const file = join(CACHE, cacheFile);
  if (existsSync(file)) return JSON.parse(readFileSync(file, "utf8"));
  if (!KEY) throw new Error("MARKETCHECK_API_KEY missing");
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

async function search() {
  mkdirSync(join(CACHE, "search"), { recursive: true });
  for (let year = 2012; year <= 2026; year++) {
    let start = 0;
    let found = Infinity;
    while (start < Math.min(found, 500)) {
      const page = await get(
        "search/car/active",
        { make: "porsche", model: "911", year, car_type: "used", rows: 50, start },
        `search/${year}-${start}.json`,
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

function allSearchListings(): RawListing[] {
  const dir = join(CACHE, "search");
  const seen = new Map<string, RawListing>();
  for (const f of readdirSync(dir)) {
    for (const l of JSON.parse(readFileSync(join(dir, f), "utf8")).listings ?? []) seen.set(l.vin ?? l.id, l);
  }
  return [...seen.values()];
}

async function extras(limit: number) {
  mkdirSync(join(CACHE, "extra"), { recursive: true });
  const { mapListing } = await import("./marketcheck-map");
  const usable = allSearchListings().map((l) => [l, mapListing(l)] as const).filter(([, m]) => m);
  // Round-robin across generation+trim so every cohort gets option data.
  const groups = new Map<string, RawListing[]>();
  for (const [raw, m] of usable) {
    const k = `${m!.generation}|${m!.trim}`;
    groups.set(k, [...(groups.get(k) ?? []), raw]);
  }
  const order: RawListing[] = [];
  const queues = [...groups.values()];
  while (order.length < limit && queues.some((q) => q.length)) {
    for (const q of queues) if (q.length && order.length < limit) order.push(q.shift()!);
  }
  for (const l of order) {
    try {
      await get(`listing/car/${l.id}/extra`, {}, `extra/${l.id}.json`);
    } catch (e) {
      console.warn(`skip ${l.id}: ${(e as Error).message}`);
    }
  }
  console.log(`extras done, ${calls} new calls`);
}

async function build() {
  const { mapListing, mapOptions } = await import("./marketcheck-map");
  const out = [];
  for (const raw of allSearchListings()) {
    const m = mapListing(raw);
    if (!m) continue;
    const extraFile = join(CACHE, "extra", `${raw.id}.json`);
    const extra = existsSync(extraFile) ? JSON.parse(readFileSync(extraFile, "utf8")) : null;
    out.push({ ...m, ...(extra ? { options: mapOptions(extra, m.body), optionsKnown: true } : { options: [], optionsKnown: false }) });
  }
  writeFileSync(join(__dirname, "..", "src", "data", "listings.json"), JSON.stringify(out));
  console.log(`wrote ${out.length} listings (${out.filter((l) => l.optionsKnown).length} with options)`);
}

const [cmd, arg] = process.argv.slice(2);
if (cmd === "search") search();
else if (cmd === "extras") extras(Number(arg ?? 350));
else if (cmd === "build") build();
else console.log("usage: search | extras <n> | build");
