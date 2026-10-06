/** Market summaries shown on their own: the price-by-year chart and the bang-for-buck leaderboard. */
import { TRIMS } from "@/data/catalog";
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
    pricesByYear.set(listing.modelYear, [...(pricesByYear.get(listing.modelYear) ?? []), listing.price]);
  }

  return [...pricesByYear.entries()]
    .filter(([, prices]) => prices.length >= minSample)
    .map(([year, prices]) => ({ year, medianPrice: median(prices), sample: prices.length }))
    .sort((a, b) => a.year - b.year);
}

// ---------- bang for buck ----------

export interface BangForBuck {
  generation: Generation;
  trim: Trim;
  hp: number;
  medianPrice: number;
  /** Horsepower per $1,000 of median asking price. Higher = more performance per dollar. */
  hpPerK: number;
  sample: number;
}

export function bangForBuck(listings: Listing[]): BangForBuck[] {
  const rows = TRIMS.map((trim) => {
    const prices = cohort(listings, trim).map((listing) => listing.price);
    const medianPrice = median(prices);
    return {
      generation: trim.generation,
      trim: trim.trim,
      hp: trim.hp,
      medianPrice,
      hpPerK: trim.hp / (medianPrice / 1000),
      sample: prices.length,
    };
  });

  return rows.filter((row) => row.sample >= MIN_LISTINGS_TO_SHOW).sort((a, b) => b.hpPerK - a.hpPerK);
}
