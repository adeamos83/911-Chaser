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

/** The low and high ends of the estimate: the middle half of comparable prices sits between them. */
const LOW_QUANTILE = 0.25;
const HIGH_QUANTILE = 0.75;

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
  context: EstimateContext,
  statedAt?: { mileage?: number; modelYear?: number },
): Estimate | null {
  const rows = cohort(context.listings, spec);
  if (rows.length === 0) return null;

  const table = context.table ?? premiumTable(context.listings);
  const fit = fitCohort(rows);
  const adjusted = mileageAdjust(rows, fit);
  const barePrices = adjusted.map((listing) => listing.adjustedPrice - specPremium(listing, table));

  // A Paint to Sample color always comes with the PTS option.
  const colorTier = colorDef(spec.color)?.tier ?? spec.colorTier ?? "Standard";
  const needsPtsOption = colorTier === "PTS" && !spec.options.includes("PTS");
  const options = needsPtsOption ? [...spec.options, "PTS"] : spec.options;

  const medianMileage = Math.round(median(rows.map((listing) => listing.mileage)));
  const mileage = statedAt?.mileage ?? medianMileage;

  let addBack = specPremium({ ...spec, options, colorTier, optionsKnown: true }, table);
  addBack += fit.perMile * (mileage - REF_MILEAGE);
  if (statedAt?.modelYear !== undefined) addBack += fit.perYear * (statedAt.modelYear - fit.refYear);

  return {
    low: quantile(barePrices, LOW_QUANTILE) + addBack,
    mid: median(barePrices) + addBack,
    high: quantile(barePrices, HIGH_QUANTILE) + addBack,
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
export function dealScore(listing: Listing, context: EstimateContext): number {
  const sameMilesAndYear = { mileage: listing.mileage, modelYear: listing.modelYear };
  const expected = estimateBuild(specOf(listing), context, sameMilesAndYear);
  if (!expected || expected.mid <= 0) return 0;
  return (expected.mid - listing.price) / expected.mid;
}
