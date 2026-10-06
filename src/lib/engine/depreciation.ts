/**
 * Step 1 and 2 of the engine: group comparable cars, then learn how price drops with
 * mileage and age so every car can be compared as if it had the same miles and year.
 */
import type { Generation, Listing, Trim } from "@/data/types";
import { MIN_LISTINGS_TO_FIT, REF_MILEAGE } from "./rules";
import { mean, median } from "./stats";

/**
 * How close to zero the determinant may get (relative to the spreads) before we decide mileage
 * and year are too tangled to separate. Tiny, so it only trips on near-perfect lockstep.
 */
const LOCKSTEP_TOLERANCE = 1e-9;

// ---------- 1. cohort ----------

/** A "cohort" is every listing of the same generation and trim, e.g. all 992.1 Carrera S cars. */
export function cohort(listings: Listing[], key: { generation: Generation; trim: Trim }): Listing[] {
  return listings.filter((listing) => listing.generation === key.generation && listing.trim === key.trim);
}

/** Splits listings into cohorts, keyed by "generation|trim". */
function groupByCohort(listings: Listing[]): Listing[][] {
  const groups = new Map<string, Listing[]>();
  for (const listing of listings) {
    const cohortKey = `${listing.generation}|${listing.trim}`;
    const groupSoFar = groups.get(cohortKey) ?? [];
    groups.set(cohortKey, [...groupSoFar, listing]);
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
 * two-variable linear regression (ordinary least squares). A regression finds the straight
 * line that sits closest to every car's price; its "slopes" are the dollars per mile and
 * dollars per year.
 *
 * Why both at once: older cars also tend to have more miles. Fitting mileage alone would
 * blame the mileage for what is really the age discount.
 *
 * Fallbacks when the data can't support the full fit:
 *   - Every car is the same model year: fit mileage only.
 *   - Fewer than 3 cars, or every car has the same mileage: no slopes, just the median price.
 */
export function fitCohort(rows: Listing[]): CohortFit {
  const refYear = Math.round(median(rows.map((listing) => listing.modelYear)));
  const medianPrice = median(rows.map((listing) => listing.price));
  const medianOnly: CohortFit = { intercept: medianPrice, perMile: 0, perYear: 0, refYear };
  if (rows.length < MIN_LISTINGS_TO_FIT) return medianOnly;

  const totals = regressionTotals(rows);

  // The determinant is close to zero when mileage and year move in lockstep,
  // which means their separate effects can't be told apart.
  const determinant = totals.milesSpread * totals.yearSpread - totals.milesYearTogether * totals.milesYearTogether;
  const bothVary = totals.milesSpread > 0 && totals.yearSpread > 0;
  const notInLockstep = Math.abs(determinant) > LOCKSTEP_TOLERANCE * totals.milesSpread * totals.yearSpread;
  const canFitBoth = bothVary && notInLockstep;

  if (canFitBoth) {
    const perMileNumerator =
      totals.milesPriceTogether * totals.yearSpread - totals.yearPriceTogether * totals.milesYearTogether;
    const perYearNumerator =
      totals.yearPriceTogether * totals.milesSpread - totals.milesPriceTogether * totals.milesYearTogether;
    const perMile = perMileNumerator / determinant;
    const perYear = perYearNumerator / determinant;
    const intercept = totals.avgPrice - perMile * totals.avgMiles - perYear * totals.avgYear;
    return { intercept, perMile, perYear, refYear };
  }

  if (totals.milesSpread > 0) {
    const perMile = totals.milesPriceTogether / totals.milesSpread;
    const intercept = totals.avgPrice - perMile * totals.avgMiles;
    return { intercept, perMile, perYear: 0, refYear };
  }

  return medianOnly;
}

/**
 * The running totals the regression needs. Each "spread" measures how much one value varies
 * around its average; each "together" measures how much two values rise and fall together.
 */
function regressionTotals(rows: Listing[]) {
  const avgMiles = mean(rows.map((listing) => listing.mileage));
  const avgYear = mean(rows.map((listing) => listing.modelYear));
  const avgPrice = mean(rows.map((listing) => listing.price));

  let milesSpread = 0;
  let yearSpread = 0;
  let milesYearTogether = 0;
  let milesPriceTogether = 0;
  let yearPriceTogether = 0;

  for (const listing of rows) {
    const milesOffset = listing.mileage - avgMiles;
    const yearOffset = listing.modelYear - avgYear;
    const priceOffset = listing.price - avgPrice;
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

/** Restates every price at 15K miles and the cohort's typical year, using the fitted slopes. */
export function mileageAdjust(rows: Listing[], fit = fitCohort(rows)): AdjustedListing[] {
  return rows.map((listing) => {
    const mileageEffect = fit.perMile * (listing.mileage - REF_MILEAGE);
    const yearEffect = fit.perYear * (listing.modelYear - fit.refYear);
    return { ...listing, adjustedPrice: listing.price - mileageEffect - yearEffect };
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
    const cohortMedian = median(adjusted.map((listing) => listing.adjustedPrice));
    return adjusted.map((listing) => ({ ...listing, residual: listing.adjustedPrice - cohortMedian }));
  });
}
