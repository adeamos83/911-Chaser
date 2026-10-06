/**
 * Steps 6 and 7 of the engine: estimate what a spec should be listed for, and score how good
 * a real listing's price is against that estimate.
 */
import { colorDef } from "@/data/catalog";
import type { BuildSpec, ColorTier, Listing } from "@/data/types";
import { cohort, fitCohort, mileageAdjust } from "./depreciation";
import { premiumTable, type PremiumTable } from "./premiums";
import { REF_MILEAGE, confidenceFor, type Confidence } from "./rules";
import { median, quantile } from "./stats";

// ---------- 6. estimate ----------

export interface Estimate {
  /** 25th percentile: a good-deal price. */
  low: number;
  /** Median: the typical asking price. */
  mid: number;
  /** 75th percentile: a high-end asking price. */
  high: number;
  confidence: Confidence;
  sample: number;
  /** Mileage the estimate is stated at. */
  mileage: number;
  /** Typical mileage in the comparable set. */
  medianMileage: number;
}

export interface EstimateContext {
  listings: Listing[];
  /** Precomputed premiums; pass it when estimating many specs. Defaults to the whole pool. */
  table?: PremiumTable;
}

type PricedSpec = Pick<BuildSpec, "transmission" | "options"> & { colorTier: ColorTier; optionsKnown?: boolean };

/** Total dollars a car's options, gearbox and paint add on top of a bare car. */
function specPremium(spec: PricedSpec, table: PremiumTable): number {
  let total = 0;

  if (spec.optionsKnown === false) {
    // We don't know this car's options, so assume it has a typical amount.
    total += table.avgOptionContent;
  } else {
    for (const code of spec.options) total += table.options[code]?.premiumUsd ?? 0;
  }

  if (spec.transmission === "Manual") total += table.manual.premiumUsd;
  total += table.colorTier[spec.colorTier].premiumUsd;
  return total;
}

/**
 * How it works:
 *   1. Take every comparable car (same generation and trim).
 *   2. Restate each price at 15K miles and the cohort's typical year.
 *   3. Strip off each car's own options, gearbox and paint premiums, leaving a "bare car" price.
 *   4. Add back the premiums THIS spec has, plus the effect of the requested mileage and year.
 *
 * Stated at the cohort's typical mileage unless a mileage (and optionally a model year) is passed.
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
  const barePrices = mileageAdjust(rows, fit).map((r) => r.adjustedPrice - specPremium(r, table));

  // A Paint to Sample color always comes with the PTS option.
  const colorTier = colorDef(spec.color)?.tier ?? spec.colorTier ?? "Standard";
  const needsPtsOption = colorTier === "PTS" && !spec.options.includes("PTS");
  const options = needsPtsOption ? [...spec.options, "PTS"] : spec.options;

  const medianMileage = Math.round(median(rows.map((r) => r.mileage)));
  const mileage = at?.mileage ?? medianMileage;

  let addBack = specPremium({ ...spec, options, colorTier, optionsKnown: true }, table);
  addBack += fit.perMile * (mileage - REF_MILEAGE);
  if (at?.modelYear !== undefined) addBack += fit.perYear * (at.modelYear - fit.refYear);

  return {
    low: quantile(barePrices, 0.25) + addBack,
    mid: median(barePrices) + addBack,
    high: quantile(barePrices, 0.75) + addBack,
    confidence: confidenceFor(rows.length),
    sample: rows.length,
    mileage,
    medianMileage,
  };
}

// ---------- 7. deal score ----------

/** Turns a real listing into a spec so it can be run through `estimateBuild`. */
export function specOf(listing: Listing): BuildSpec {
  return {
    generation: listing.generation,
    trim: listing.trim,
    body: listing.body,
    transmission: listing.transmission,
    color: listing.color,
    colorTier: listing.colorTier,
    options: listing.options,
  };
}

/**
 * How far under (+) or over (-) the expected price a listing is, as a fraction.
 * 0.1 means "priced 10% under what this exact car should cost".
 */
export function dealScore(listing: Listing, ctx: EstimateContext): number {
  const expected = estimateBuild(specOf(listing), ctx, { mileage: listing.mileage, modelYear: listing.modelYear });
  if (!expected || expected.mid <= 0) return 0;
  return (expected.mid - listing.price) / expected.mid;
}
