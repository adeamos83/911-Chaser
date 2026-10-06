import { OPTIONS, TRIMS, colorDef, optionDef } from "@/data/catalog";
import type { BuildSpec, ColorTier, Generation, Listing, Trim } from "@/data/types";

export const REF_MILEAGE = 15000;
export const MIN_SAMPLE = 5;
const NOW_YEAR = 2026;

export type Confidence = "high" | "medium" | "low";
export type ValueTier = "Value Holder" | "Neutral" | "Money Pit";

// ---------- stats helpers ----------

export function quantile(xs: number[], q: number): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const pos = (s.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return s[lo] + (s[hi] - s[lo]) * (pos - lo);
}

export const median = (xs: number[]) => quantile(xs, 0.5);

// ---------- 1. cohort ----------

export function cohort(listings: Listing[], key: { generation: Generation; trim: Trim }): Listing[] {
  return listings.filter((l) => l.generation === key.generation && l.trim === key.trim);
}

// ---------- 2. mileage (and year) adjustment ----------

export interface CohortFit {
  intercept: number;
  perMile: number;
  perYear: number;
  refYear: number;
}

/**
 * OLS fit of price ~ mileage + modelYear. Year is included because older cars also have
 * more miles; fitting mileage alone would blame the mileage for the age discount.
 * Falls back to mileage-only, then to a flat median, when the cohort can't support it.
 */
export function fitCohort(rows: Listing[]): CohortFit {
  const refYear = Math.round(median(rows.map((r) => r.modelYear)));
  const n = rows.length;
  const flat = { intercept: median(rows.map((r) => r.price)), perMile: 0, perYear: 0, refYear };
  if (n < 3) return flat;

  const mx = mean(rows.map((r) => r.mileage));
  const my = mean(rows.map((r) => r.modelYear));
  const mp = mean(rows.map((r) => r.price));
  let sxx = 0, syy = 0, sxy = 0, sxp = 0, syp = 0;
  for (const r of rows) {
    const dx = r.mileage - mx, dy = r.modelYear - my, dp = r.price - mp;
    sxx += dx * dx; syy += dy * dy; sxy += dx * dy; sxp += dx * dp; syp += dy * dp;
  }
  const det = sxx * syy - sxy * sxy;
  if (sxx > 0 && syy > 0 && Math.abs(det) > 1e-9 * sxx * syy) {
    const perMile = (sxp * syy - syp * sxy) / det;
    const perYear = (syp * sxx - sxp * sxy) / det;
    return { intercept: mp - perMile * mx - perYear * my, perMile, perYear, refYear };
  }
  if (sxx > 0) {
    const perMile = sxp / sxx;
    return { intercept: mp - perMile * mx, perMile, perYear: 0, refYear };
  }
  return flat;
}

function mean(xs: number[]) {
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

export interface AdjustedListing extends Listing {
  /** Price restated as if the car had 15K miles and was the cohort's median model year. */
  adjustedPrice: number;
}

export function mileageAdjust(rows: Listing[], fit = fitCohort(rows)): AdjustedListing[] {
  return rows.map((r) => ({
    ...r,
    adjustedPrice:
      r.price - fit.perMile * (r.mileage - REF_MILEAGE) - fit.perYear * (r.modelYear - fit.refYear),
  }));
}

/** Each listing's adjusted price minus its own cohort's median, so trims can be pooled. */
export function residuals(listings: Listing[]): (AdjustedListing & { residual: number })[] {
  const groups = new Map<string, Listing[]>();
  for (const l of listings) {
    const k = `${l.generation}|${l.trim}`;
    groups.set(k, [...(groups.get(k) ?? []), l]);
  }
  return [...groups.values()].flatMap((rows) => {
    const adj = mileageAdjust(rows);
    const m = median(adj.map((a) => a.adjustedPrice));
    return adj.map((a) => ({ ...a, residual: a.adjustedPrice - m }));
  });
}

// ---------- 3. premiums ----------

export interface Premium {
  premiumUsd: number;
  sampleWith: number;
  sampleWithout: number;
  confidence: Confidence;
}

function confidenceFor(a: number, b: number): Confidence {
  const n = Math.min(a, b);
  if (n < MIN_SAMPLE) return "low";
  if (n < 30) return "medium";
  return "high";
}

export function premiumWhere(
  pool: (Listing & { residual: number })[],
  has: (l: Listing) => boolean,
  eligible: (l: Listing) => boolean = () => true,
): Premium {
  const rows = pool.filter(eligible);
  const yes = rows.filter(has).map((r) => r.residual);
  const no = rows.filter((r) => !has(r)).map((r) => r.residual);
  const confidence = confidenceFor(yes.length, no.length);
  const premiumUsd = yes.length && no.length ? median(yes) - median(no) : 0;
  return { premiumUsd, sampleWith: yes.length, sampleWithout: no.length, confidence };
}

/** Median adjusted price with the option minus without. Pool = any set of listings. */
const optionsKnown = (l: Listing) => l.optionsKnown !== false;

export function optionPremium(listings: Listing[], optionCode: string): Premium {
  const def = optionDef(optionCode);
  return premiumWhere(
    residuals(listings),
    (l) => l.options.includes(optionCode),
    (l) => optionsKnown(l) && (!def?.bodies || def.bodies.includes(l.body)),
  );
}

// ---------- 4/5. payback + tiers ----------

export function paybackPct(premiumUsd: number, msrpCost: number): number {
  return msrpCost > 0 ? premiumUsd / msrpCost : 0;
}

export function tierFor(payback: number): ValueTier {
  if (payback >= 0.8) return "Value Holder";
  if (payback >= 0.3) return "Neutral";
  return "Money Pit";
}

export interface OptionValue extends Premium {
  code: string;
  name: string;
  msrpCost: number;
  payback: number;
  tier: ValueTier;
}

export interface PremiumTable {
  options: Record<string, OptionValue>;
  manual: Premium;
  colorTier: Record<ColorTier, Premium>;
  /** Average option premium on cars whose option sheet we know; stands in for cars where we don't. */
  avgOptionContent: number;
}

/** Every premium the estimator needs, computed once for a pool (usually one generation). */
export function premiumTable(pool: Listing[]): PremiumTable {
  const res = residuals(pool);
  const options: Record<string, OptionValue> = {};
  for (const o of OPTIONS) {
    const p = premiumWhere(
      res,
      (l) => l.options.includes(o.code),
      (l) => optionsKnown(l) && (!o.bodies || o.bodies.includes(l.body)),
    );
    const payback = paybackPct(p.premiumUsd, o.msrpCost);
    options[o.code] = { ...p, code: o.code, name: o.name, msrpCost: o.msrpCost, payback, tier: tierFor(payback) };
  }
  const manualTrims = new Set(TRIMS.filter((t) => t.manualAvailable).map((t) => `${t.generation}|${t.trim}`));
  const manual = premiumWhere(
    res,
    (l) => l.transmission === "Manual",
    (l) => manualTrims.has(`${l.generation}|${l.trim}`),
  );
  const vsStandard = (tier: ColorTier) =>
    premiumWhere(res, (l) => l.colorTier === tier, (l) => l.colorTier === tier || l.colorTier === "Standard");
  const known = pool.filter(optionsKnown);
  const avgOptionContent = known.length
    ? known.reduce((s, l) => s + l.options.reduce((t, c) => t + (options[c]?.premiumUsd ?? 0), 0), 0) / known.length
    : 0;
  return {
    avgOptionContent,
    options,
    manual,
    // PTS value is carried by the PTS option itself, so the tier premium stays zero.
    colorTier: {
      Standard: { premiumUsd: 0, sampleWith: 0, sampleWithout: 0, confidence: "high" },
      Metallic: vsStandard("Metallic"),
      Special: vsStandard("Special"),
      PTS: { premiumUsd: 0, sampleWith: 0, sampleWithout: 0, confidence: "high" },
    },
  };
}

// ---------- 6. retention ----------

export interface RetentionPoint {
  age: number;
  retention: number;
  sample: number;
}

export function retentionCurve(listings: Listing[], key: { generation?: Generation; trim: Trim }): RetentionPoint[] {
  const rows = listings.filter((l) => l.trim === key.trim && (!key.generation || l.generation === key.generation));
  const byAge = new Map<number, number[]>();
  for (const r of rows) {
    const age = Math.max(0, NOW_YEAR - r.modelYear);
    byAge.set(age, [...(byAge.get(age) ?? []), r.price / r.originalMsrp]);
  }
  return [...byAge.entries()]
    .map(([age, xs]) => ({ age, retention: median(xs), sample: xs.length }))
    .sort((a, b) => a.age - b.age);
}

export interface YearPoint {
  year: number;
  medianPrice: number;
  sample: number;
}

/** Median asking price by model year for a trim across generations. Independent of MSRP data. */
export function priceByYear(listings: Listing[], trim: Trim, minSample = 3): YearPoint[] {
  const byYear = new Map<number, number[]>();
  for (const l of listings) {
    if (l.trim === trim) byYear.set(l.modelYear, [...(byYear.get(l.modelYear) ?? []), l.price]);
  }
  return [...byYear.entries()]
    .filter(([, xs]) => xs.length >= minSample)
    .map(([year, xs]) => ({ year, medianPrice: median(xs), sample: xs.length }))
    .sort((a, b) => a.year - b.year);
}

// ---------- 7. estimate ----------

export interface Estimate {
  low: number;
  mid: number;
  high: number;
  confidence: Confidence;
  sample: number;
  /** Mileage the estimate is stated at. */
  mileage: number;
  /** Typical mileage in the comparable set. */
  medianMileage: number;
}

function specPremium(
  spec: Pick<BuildSpec, "transmission" | "options"> & { colorTier: ColorTier; optionsKnown?: boolean },
  table: PremiumTable,
) {
  let total = 0;
  if (spec.optionsKnown === false) total += table.avgOptionContent;
  else for (const code of spec.options) total += table.options[code]?.premiumUsd ?? 0;
  if (spec.transmission === "Manual") total += table.manual.premiumUsd;
  total += table.colorTier[spec.colorTier].premiumUsd;
  return total;
}

export interface EstimateContext {
  listings: Listing[];
  /** Precomputed premiums; pass it when estimating many specs. Defaults to the whole pool. */
  table?: PremiumTable;
}

/**
 * Strip every known premium off each comparable car to get a "bare" price distribution,
 * then add back the premiums this spec actually has. Stated at the cohort's typical mileage
 * unless a mileage (and optionally model year) is passed.
 */
export function estimateBuild(
  spec: BuildSpec,
  ctx: EstimateContext,
  at?: { mileage?: number; modelYear?: number },
): Estimate | null {
  const rows = cohort(ctx.listings, spec);
  if (rows.length === 0) return null;
  const table = ctx.table ?? premiumTable(ctx.listings);
  const fit = fitCohort(rows);
  const bare = mileageAdjust(rows, fit).map((r) => r.adjustedPrice - specPremium(r, table));

  const tier = colorDef(spec.color)?.tier ?? spec.colorTier ?? "Standard";
  const options = tier === "PTS" && !spec.options.includes("PTS") ? [...spec.options, "PTS"] : spec.options;
  const medianMileage = Math.round(median(rows.map((r) => r.mileage)));
  const mileage = at?.mileage ?? medianMileage;
  let add = specPremium({ ...spec, options, colorTier: tier, optionsKnown: true }, table);
  add += fit.perMile * (mileage - REF_MILEAGE);
  if (at?.modelYear !== undefined) add += fit.perYear * (at.modelYear - fit.refYear);

  return {
    low: quantile(bare, 0.25) + add,
    mid: median(bare) + add,
    high: quantile(bare, 0.75) + add,
    confidence: rows.length < MIN_SAMPLE ? "low" : rows.length < 30 ? "medium" : "high",
    sample: rows.length,
    mileage,
    medianMileage,
  };
}

// ---------- 8. deal score ----------

export function specOf(l: Listing): BuildSpec {
  return { generation: l.generation, trim: l.trim, body: l.body, transmission: l.transmission, color: l.color, colorTier: l.colorTier, options: l.options };
}

/** Positive = priced under what the model expects for this exact car. */
export function dealScore(listing: Listing, ctx: EstimateContext): number {
  const est = estimateBuild(specOf(listing), ctx, { mileage: listing.mileage, modelYear: listing.modelYear });
  if (!est || est.mid <= 0) return 0;
  return (est.mid - listing.price) / est.mid;
}

// ---------- 9. bang for buck ----------

export interface BangForBuck {
  generation: Generation;
  trim: Trim;
  hp: number;
  medianPrice: number;
  hpPerK: number;
  sample: number;
}

export function bangForBuck(listings: Listing[]): BangForBuck[] {
  return TRIMS.map((t) => {
    const prices = cohort(listings, t).map((l) => l.price);
    const medianPrice = median(prices);
    return { generation: t.generation, trim: t.trim, hp: t.hp, medianPrice, hpPerK: t.hp / (medianPrice / 1000), sample: prices.length };
  })
    .filter((r) => r.sample >= 3)
    .sort((a, b) => b.hpPerK - a.hpPerK);
}
