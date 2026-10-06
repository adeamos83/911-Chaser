/**
 * Generates a deterministic, *modeled* dataset of 911 sales and listings.
 * Not scraped. Option effects follow common 911 resale wisdom (Sport Chrono and PTS hold value,
 * PCCB and Burmester don't), so the engine's tests have known answers to recover.
 *
 * Run: npm run seed
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { TRIMS, OPTIONS, bodiesFor, colorsFor } from "../src/data/catalog";
import type { ColorTier, Listing, Trim } from "../src/data/types";

// ---------- Settings ----------

const LISTING_COUNT = 3000;
const NOW_YEAR = 2026;
/** "Today" for the dataset: October 1, 2026 (JavaScript months start at 0). */
const TODAY = Date.UTC(2026, 9, 1);
const MS_PER_DAY = 86400000;
/** Fixed seed so every run produces the same dataset. */
const RANDOM_SEED = 911;

// Planted "true" payback per option: dollars recovered at resale / option MSRP.
const PLANTED_PAYBACK: Record<string, number> = {
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

// Mileage model
/** New (current model year) cars have between these many miles. */
const NEW_CAR_MIN_MILES = 50;
const NEW_CAR_MAX_MILES = 3000;
/** Average miles driven per year of age. */
const MILES_PER_YEAR = 4500;
/** Each car drives somewhere between 0.4x and 1.8x the average. */
const MIN_DRIVING_FACTOR = 0.4;
const MAX_DRIVING_FACTOR = 1.8;
/** Extra random miles added on top, up to this many. */
const MAX_EXTRA_MILES = 3000;
/** Used cars never show fewer miles than this. */
const MIN_USED_MILES = 300;

// Build choices (chances are 0 to 1)
const COUPE_CHANCE = 0.6;
const MANUAL_CHANCE = 0.35;
const OPTION_CHANCE = 0.4;
const FOR_SALE_CHANCE = 0.2;

// Value retention curve: value = MSRP * max(floor, start * yearlyFactor^age + trim bump)
const RETENTION_START = 0.93;
const RETENTION_PER_YEAR = 0.925;
const RETENTION_FLOOR = 0.42;
/** Trims that hold value a bit better (or worse) than the curve. */
const TRIM_RETENTION_BUMP: Partial<Record<Trim, number>> = { GTS: 0.04, "Carrera T": 0.03, "Turbo S": -0.04 };

// Price adjustments
/** Value lost per 1,000 miles over (or gained under) the baseline, as a share of base MSRP. */
const VALUE_LOSS_PER_1000_MILES = 0.003;
const BASELINE_MILES = 15000;
const MANUAL_PREMIUM = 1.08;
const SPECIAL_PAINT_PREMIUM = 1.035;
const METALLIC_PAINT_PREMIUM = 1.005;
/** Random noise of up to plus or minus 6% on every price. */
const PRICE_NOISE = 0.06;
/** Prices are rounded to the nearest $100. */
const PRICE_ROUNDING = 100;

// Listing dates: for-sale cars were listed in the last 30 days, sold cars 30 to 730 days ago.
const MAX_FOR_SALE_DAYS = 30;
const MAX_SOLD_DAYS = 730;

/** How often each paint tier shows up (relative weights). */
const TIER_WEIGHTS: [ColorTier, number][] = [
  ["Standard", 0.3],
  ["Metallic", 0.4],
  ["Special", 0.2],
  ["PTS", 0.1],
];

// ---------- Random helpers ----------

/** Small seeded random number generator (Mulberry32). Returns numbers from 0 up to 1. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let mixed = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(RANDOM_SEED);

/** Random number between min and max. */
function between(min: number, max: number): number {
  return min + random() * (max - min);
}

/** Random item from a list. */
function pick<T>(items: T[]): T {
  return items[Math.floor(random() * items.length)];
}

// ---------- Model pieces ----------

/** Share of base MSRP a car of this age and trim is worth. */
function retention(age: number, trim: Trim): number {
  const bump = TRIM_RETENTION_BUMP[trim] ?? 0;
  const curveValue = RETENTION_START * Math.pow(RETENTION_PER_YEAR, age) + bump;
  return Math.max(RETENTION_FLOOR, curveValue);
}

/** Random mileage for a car of this age. */
function randomMileage(age: number): number {
  if (age === 0) return Math.round(between(NEW_CAR_MIN_MILES, NEW_CAR_MAX_MILES));

  const drivingFactor = between(MIN_DRIVING_FACTOR, MAX_DRIVING_FACTOR);
  const extraMiles = between(0, MAX_EXTRA_MILES);
  const miles = age * MILES_PER_YEAR * drivingFactor + extraMiles;
  return Math.round(Math.max(MIN_USED_MILES, miles));
}

/** Picks a paint tier by weight, only from the tiers this generation offers. */
function pickTier(available: Set<ColorTier>): ColorTier {
  const weights = TIER_WEIGHTS.filter(([tier]) => available.has(tier));
  const totalWeight = weights.reduce((sum, [, weight]) => sum + weight, 0);

  // Roll a number, then walk the list subtracting each weight until we pass zero.
  let remaining = random() * totalWeight;
  for (const [tier, weight] of weights) {
    remaining -= weight;
    if (remaining <= 0) return tier;
  }
  return weights[0][0];
}

// ---------- Generate ----------

const listings: Listing[] = [];
for (let i = 0; i < LISTING_COUNT; i++) {
  const spec = pick(TRIMS);
  // Round so the first and last years get about as many cars as the years in between.
  const [firstYear, lastYear] = spec.years;
  const modelYear = Math.round(between(firstYear - 0.49, lastYear + 0.49));
  const age = Math.max(0, NOW_YEAR - modelYear);
  const mileage = randomMileage(age);

  const bodies = bodiesFor(spec.trim);
  const otherBodies = bodies.filter((body) => body !== "Coupe");
  const body = random() < COUPE_CHANCE ? "Coupe" : pick(otherBodies);
  const transmission = spec.manualAvailable && random() < MANUAL_CHANCE ? "Manual" : "PDK";

  const colors = colorsFor(spec.generation);
  const tier = pickTier(new Set(colors.map((color) => color.tier)));
  const color = pick(colors.filter((candidate) => candidate.tier === tier));

  // PTS is an option only when the paint tier is PTS; other options are random coin flips.
  const chosenOptions = OPTIONS.filter((option) => {
    if (option.code === "PTS") return tier === "PTS";
    if (option.bodies && !option.bodies.includes(body)) return false;
    return random() < OPTION_CHANCE;
  });
  const options = chosenOptions.map((option) => option.code);

  const optionsInCatalogOrder = OPTIONS.filter((option) => options.includes(option.code));
  const optionCost = optionsInCatalogOrder.reduce((sum, option) => sum + option.msrpCost, 0);
  const originalMsrp = spec.baseMsrp + optionCost;

  // Start from depreciated base value, then apply mileage, transmission, paint, options and noise.
  let value = spec.baseMsrp * retention(age, spec.trim);
  value -= VALUE_LOSS_PER_1000_MILES * spec.baseMsrp * ((mileage - BASELINE_MILES) / 1000);
  if (transmission === "Manual") value *= MANUAL_PREMIUM;
  if (tier === "Special") value *= SPECIAL_PAINT_PREMIUM;
  if (tier === "Metallic") value *= METALLIC_PAINT_PREMIUM;
  for (const code of options) {
    const option = OPTIONS.find((candidate) => candidate.code === code)!;
    value += PLANTED_PAYBACK[code] * option.msrpCost;
  }
  value *= 1 + between(-PRICE_NOISE, PRICE_NOISE);

  const forSale = random() < FOR_SALE_CHANCE;
  const daysAgo = forSale ? between(0, MAX_FOR_SALE_DAYS) : between(MAX_FOR_SALE_DAYS, MAX_SOLD_DAYS);
  const listingDate = new Date(TODAY - daysAgo * MS_PER_DAY);

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
    price: Math.round(value / PRICE_ROUNDING) * PRICE_ROUNDING,
    status: forSale ? "for_sale" : "sold",
    date: listingDate.toISOString().slice(0, 10),
  });
}

// ---------- Write ----------

const outputPath = join(__dirname, "..", "src", "data", "listings.modeled.json");
writeFileSync(outputPath, JSON.stringify(listings));
console.log(`Wrote ${listings.length} listings to ${outputPath}`);
