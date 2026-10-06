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

/**
 * Where the estimate's middle price comes from. The parts add up exactly to `mid`:
 *   mid = bareCar + modelYear + mileage + paint + transmission + options
 */
export interface EstimateBreakdown {
  /** Typical price of this generation and trim with no options, standard paint, PDK, 15K miles, typical year. */
  bareCar: number;
  /** Effect of a newer or older model year than the typical one. */
  modelYear: number;
  /** Effect of more or fewer miles than 15K. */
  mileage: number;
  paint: number;
  transmission: number;
  options: number;
}

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
  /** Model year the estimate is stated at. */
  modelYear: number;
  /** Typical model year in the comparable set. */
  typicalModelYear: number;
  breakdown: EstimateBreakdown;
}

export interface EstimateContext {
  listings: Listing[];
  /** Precomputed premiums; pass it when estimating many specs. Defaults to the whole pool. */
  table?: PremiumTable;
}

type PricedSpec = Pick<BuildSpec, "transmission" | "options"> & { colorTier: ColorTier; optionsKnown?: boolean };

/** Dollars a car's options, gearbox and paint each add on top of a bare car. */
function premiumParts(spec: PricedSpec, table: PremiumTable) {
  let options = 0;
  if (spec.optionsKnown === false) {
    // We don't know this car's options, so assume it has a typical amount.
    options = table.avgOptionContent;
  } else {
    for (const code of spec.options) options += table.options[code]?.premiumUsd ?? 0;
  }

  const transmission = spec.transmission === "Manual" ? table.manual.premiumUsd : 0;
  const paint = table.colorTier[spec.colorTier].premiumUsd;
  return { options, transmission, paint };
}

/** Total dollars a car's options, gearbox and paint add on top of a bare car. */
function specPremium(spec: PricedSpec, table: PremiumTable): number {
  const parts = premiumParts(spec, table);
  return parts.options + parts.transmission + parts.paint;
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

  const modelYear = statedAt?.modelYear ?? fit.refYear;

  const premiums = premiumParts({ ...spec, options, colorTier, optionsKnown: true }, table);
  const breakdown: EstimateBreakdown = {
    bareCar: median(barePrices),
    modelYear: fit.perYear * (modelYear - fit.refYear),
    mileage: fit.perMile * (mileage - REF_MILEAGE),
    paint: premiums.paint,
    transmission: premiums.transmission,
    options: premiums.options,
  };
  // Everything this spec adds on top of the bare car's price.
  const addBack = breakdown.modelYear + breakdown.mileage + breakdown.paint + breakdown.transmission + breakdown.options;

  return {
    low: quantile(barePrices, LOW_QUANTILE) + addBack,
    mid: breakdown.bareCar + addBack,
    high: quantile(barePrices, HIGH_QUANTILE) + addBack,
    confidence: confidenceFor(rows.length),
    sample: rows.length,
    mileage,
    medianMileage,
    modelYear,
    typicalModelYear: fit.refYear,
    breakdown,
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

/** What this exact car (same spec, mileage and model year) should be listed for, or null without comparables. */
export function expectedPrice(listing: Listing, context: EstimateContext): number | null {
  const sameMilesAndYear = { mileage: listing.mileage, modelYear: listing.modelYear };
  const expected = estimateBuild(specOf(listing), context, sameMilesAndYear);
  if (!expected || expected.mid <= 0) return null;
  return expected.mid;
}

/**
 * How far under (+) or over (-) the expected price a listing is, as a fraction.
 * 0.1 means "priced 10% under what this exact car should cost".
 */
export function dealScore(listing: Listing, context: EstimateContext): number {
  const expected = expectedPrice(listing, context);
  if (expected === null) return 0;
  return (expected - listing.price) / expected;
}
