/**
 * Step 1 and 2 of the engine: group comparable cars, then learn how price drops with
 * mileage and age so every car can be compared as if it had the same miles and year.
 */
import type { Generation, Listing, Trim } from "@/data/types";
import { MIN_LISTINGS_TO_FIT, REF_MILEAGE } from "./rules";
import { mean, median } from "./stats";

// ---------- 1. cohort ----------

/** A "cohort" is every listing of the same generation and trim, e.g. all 992.1 Carrera S cars. */
export function cohort(listings: Listing[], key: { generation: Generation; trim: Trim }): Listing[] {
  return listings.filter((listing) => listing.generation === key.generation && listing.trim === key.trim);
}

/** Splits listings into cohorts, keyed by "generation|trim". */
function groupByCohort(listings: Listing[]): Listing[][] {
  const groups = new Map<string, Listing[]>();
  for (const listing of listings) {
    const key = `${listing.generation}|${listing.trim}`;
    groups.set(key, [...(groups.get(key) ?? []), listing]);
  }
  return [...groups.values()];
}

// ---------- 2. mileage and year adjustment ----------

/**
 * The result of fitting a straight line through a cohort's prices:
 *   price = intercept + perMile * mileage + perYear * modelYear
 */
export interface CohortFit {
  intercept: number;
  /** Dollars of price change per extra mile (usually negative). */
  perMile: number;
  /** Dollars of price change per newer model year (usually positive). */
  perYear: number;
  /** The cohort's typical model year; adjusted prices are stated as if the car were this year. */
  refYear: number;
}

/**
 * Learns how much price drops per mile and per model year, using a standard
 * two-variable linear regression (ordinary least squares).
 *
 * Why both at once: older cars also tend to have more miles. Fitting mileage alone would
 * blame the mileage for what is really the age discount.
 *
 * Fallbacks when the data can't support the full fit:
 *   - Every car is the same model year: fit mileage only.
 *   - Fewer than 3 cars, or every car has the same mileage: no slopes, just the median price.
 */
export function fitCohort(rows: Listing[]): CohortFit {
  const refYear = Math.round(median(rows.map((r) => r.modelYear)));
  const medianOnly: CohortFit = { intercept: median(rows.map((r) => r.price)), perMile: 0, perYear: 0, refYear };
  if (rows.length < MIN_LISTINGS_TO_FIT) return medianOnly;

  const t = regressionTotals(rows);

  // The determinant is close to zero when mileage and year move in lockstep,
  // which means their separate effects can't be told apart.
  const determinant = t.milesSpread * t.yearSpread - t.milesYearTogether * t.milesYearTogether;
  const canFitBoth =
    t.milesSpread > 0 && t.yearSpread > 0 && Math.abs(determinant) > 1e-9 * t.milesSpread * t.yearSpread;

  if (canFitBoth) {
    const perMile = (t.milesPriceTogether * t.yearSpread - t.yearPriceTogether * t.milesYearTogether) / determinant;
    const perYear = (t.yearPriceTogether * t.milesSpread - t.milesPriceTogether * t.milesYearTogether) / determinant;
    return { intercept: t.avgPrice - perMile * t.avgMiles - perYear * t.avgYear, perMile, perYear, refYear };
  }

  if (t.milesSpread > 0) {
    const perMile = t.milesPriceTogether / t.milesSpread;
    return { intercept: t.avgPrice - perMile * t.avgMiles, perMile, perYear: 0, refYear };
  }

  return medianOnly;
}

/**
 * The running totals the regression needs. Each "spread" measures how much one value varies
 * around its average; each "together" measures how much two values rise and fall together.
 */
function regressionTotals(rows: Listing[]) {
  const avgMiles = mean(rows.map((r) => r.mileage));
  const avgYear = mean(rows.map((r) => r.modelYear));
  const avgPrice = mean(rows.map((r) => r.price));

  let milesSpread = 0;
  let yearSpread = 0;
  let milesYearTogether = 0;
  let milesPriceTogether = 0;
  let yearPriceTogether = 0;

  for (const r of rows) {
    const milesOffset = r.mileage - avgMiles;
    const yearOffset = r.modelYear - avgYear;
    const priceOffset = r.price - avgPrice;
    milesSpread += milesOffset * milesOffset;
    yearSpread += yearOffset * yearOffset;
    milesYearTogether += milesOffset * yearOffset;
    milesPriceTogether += milesOffset * priceOffset;
    yearPriceTogether += yearOffset * priceOffset;
  }

  return { avgMiles, avgYear, avgPrice, milesSpread, yearSpread, milesYearTogether, milesPriceTogether, yearPriceTogether };
}

export interface AdjustedListing extends Listing {
  /** Price restated as if the car had 15K miles and was the cohort's median model year. */
  adjustedPrice: number;
}

export function mileageAdjust(rows: Listing[], fit = fitCohort(rows)): AdjustedListing[] {
  return rows.map((r) => {
    const mileageEffect = fit.perMile * (r.mileage - REF_MILEAGE);
    const yearEffect = fit.perYear * (r.modelYear - fit.refYear);
    return { ...r, adjustedPrice: r.price - mileageEffect - yearEffect };
  });
}

export type ListingWithResidual = AdjustedListing & {
  /** How far this car's adjusted price is above (+) or below (-) its cohort's median. */
  residual: number;
};

/**
 * Each listing's adjusted price minus its own cohort's median. This lets cars from different
 * trims be pooled together: a $5K residual means "$5K above typical" for a Carrera or a Turbo.
 */
export function residuals(listings: Listing[]): ListingWithResidual[] {
  return groupByCohort(listings).flatMap((rows) => {
    const adjusted = mileageAdjust(rows);
    const cohortMedian = median(adjusted.map((a) => a.adjustedPrice));
    return adjusted.map((a) => ({ ...a, residual: a.adjustedPrice - cohortMedian }));
  });
}
