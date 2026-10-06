/** Market summaries shown on their own: the price-by-year chart. */
import type { Generation, Listing, Trim } from "@/data/types";
import { cohort } from "./depreciation";
import { MIN_LISTINGS_TO_SHOW } from "./rules";
import { median } from "./stats";

// ---------- price by model year ----------

export interface YearPoint {
  year: number;
  medianPrice: number;
  sample: number;
}

/** Median asking price by model year for one generation + trim. Years with too few listings are skipped. */
export function priceByYear(
  listings: Listing[],
  key: { generation: Generation; trim: Trim },
  minSample = MIN_LISTINGS_TO_SHOW,
): YearPoint[] {
  const pricesByYear = new Map<number, number[]>();
  for (const listing of cohort(listings, key)) {
    const pricesSoFar = pricesByYear.get(listing.modelYear) ?? [];
    pricesByYear.set(listing.modelYear, [...pricesSoFar, listing.price]);
  }

  return [...pricesByYear.entries()]
    .filter(([, prices]) => prices.length >= minSample)
    .map(([year, prices]) => ({ year, medianPrice: median(prices), sample: prices.length }))
    .sort((first, second) => first.year - second.year);
}
