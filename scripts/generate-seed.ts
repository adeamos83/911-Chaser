/**
 * Generates a deterministic, *modeled* dataset of 911 sales and listings.
 * Not scraped. Option effects follow the resale hypothesis in IMPLEMENTATION_PLAN.md §5,
 * so the value engine has something real to find.
 *
 * Run: npm run seed
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { TRIMS, OPTIONS, bodiesFor, colorsFor } from "../src/data/catalog";
import type { ColorTier, Listing, Trim } from "../src/data/types";

const COUNT = 3000;
const NOW_YEAR = 2026;
const TODAY = Date.UTC(2026, 9, 1);

// Planted "true" payback per option: dollars recovered at resale / option MSRP.
export const PLANTED_PAYBACK: Record<string, number> = {
  PTS: 1.3,
  SPORT_CHRONO: 1.4,
  PSE: 1.1,
  FRONT_LIFT: 1.0,
  BUCKETS: 1.2,
  RAS: 0.9,
  AERO: 0.9,
  PASM_SPORT: 0.55,
  LED_MATRIX: 0.5,
  ASS_PLUS: 0.45,
  SUNROOF: 0.4,
  PCCB: 0.22,
  BURMESTER: 0.15,
  LEATHER_PKG: 0.1,
  COLOR_BELTS: 0.05,
  VENT_SEATS: 0.1,
};

function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rand = mulberry32(911);
const between = (a: number, b: number) => a + rand() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(rand() * xs.length)];

function retention(age: number, trim: Trim): number {
  const bump: Partial<Record<Trim, number>> = { GTS: 0.04, "Carrera T": 0.03, "Turbo S": -0.04 };
  return Math.max(0.42, 0.93 * Math.pow(0.925, age) + (bump[trim] ?? 0));
}

const TIER_WEIGHTS: [ColorTier, number][] = [
  ["Standard", 0.3],
  ["Metallic", 0.4],
  ["Special", 0.2],
  ["PTS", 0.1],
];

function pickTier(available: Set<ColorTier>): ColorTier {
  const ws = TIER_WEIGHTS.filter(([t]) => available.has(t));
  const total = ws.reduce((s, [, w]) => s + w, 0);
  let r = rand() * total;
  for (const [t, w] of ws) {
    if ((r -= w) <= 0) return t;
  }
  return ws[0][0];
}

const listings: Listing[] = [];
for (let i = 0; i < COUNT; i++) {
  const spec = pick(TRIMS);
  const modelYear = Math.round(between(spec.years[0] - 0.49, spec.years[1] + 0.49));
  const age = Math.max(0, NOW_YEAR - modelYear);
  const mileage = Math.round(
    age === 0 ? between(50, 3000) : Math.max(300, age * 4500 * between(0.4, 1.8) + between(0, 3000)),
  );
  const bodies = bodiesFor(spec.trim);
  const body = rand() < 0.6 ? "Coupe" : pick(bodies.filter((b) => b !== "Coupe"));
  const transmission = spec.manualAvailable && rand() < 0.35 ? "Manual" : "PDK";

  const colors = colorsFor(spec.generation);
  const tier = pickTier(new Set(colors.map((c) => c.tier)));
  const color = pick(colors.filter((c) => c.tier === tier));

  const options = OPTIONS.filter((o) => {
    if (o.code === "PTS") return tier === "PTS";
    if (o.bodies && !o.bodies.includes(body)) return false;
    return rand() < 0.4;
  }).map((o) => o.code);

  const optionCost = OPTIONS.filter((o) => options.includes(o.code)).reduce((s, o) => s + o.msrpCost, 0);
  const originalMsrp = spec.baseMsrp + optionCost;

  let value = spec.baseMsrp * retention(age, spec.trim);
  value -= 0.003 * spec.baseMsrp * ((mileage - 15000) / 1000);
  if (transmission === "Manual") value *= 1.08;
  if (tier === "Special") value *= 1.035;
  if (tier === "Metallic") value *= 1.005;
  for (const code of options) {
    const def = OPTIONS.find((o) => o.code === code)!;
    value += PLANTED_PAYBACK[code] * def.msrpCost;
  }
  value *= 1 + between(-0.06, 0.06);

  const forSale = rand() < 0.2;
  const daysAgo = forSale ? between(0, 30) : between(30, 730);
  listings.push({
    id: `L${String(i + 1).padStart(4, "0")}`,
    generation: spec.generation,
    modelYear,
    trim: spec.trim,
    body,
    transmission,
    color: color.name,
    colorTier: tier,
    mileage,
    options,
    originalMsrp,
    price: Math.round(value / 100) * 100,
    status: forSale ? "for_sale" : "sold",
    date: new Date(TODAY - daysAgo * 86400000).toISOString().slice(0, 10),
  });
}

const out = join(__dirname, "..", "src", "data", "listings.modeled.json");
writeFileSync(out, JSON.stringify(listings));
console.log(`Wrote ${listings.length} listings to ${out}`);
