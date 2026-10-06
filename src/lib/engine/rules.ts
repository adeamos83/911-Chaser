/**
 * Every tunable number the pricing engine uses, in one place.
 * Change a business rule here and it changes everywhere.
 */

/** Prices are restated "as if the car had this many miles" so cars can be compared fairly. */
export const REF_MILEAGE = 15000;

/** Fewer cars than this on either side of a comparison = low confidence. */
export const MIN_SAMPLE = 5;

/** This many cars or more = high confidence. */
export const HIGH_CONFIDENCE_SAMPLE = 30;

/** An option that gets back at least 80% of its cost at resale is a "Value Holder". */
export const VALUE_HOLDER_PAYBACK = 0.8;

/** An option that gets back 30% to 80% of its cost is "Neutral". Below that it's a "Money Pit". */
export const NEUTRAL_PAYBACK = 0.3;

/** A model year (or a trim on the leaderboard) needs at least this many listings to be shown. */
export const MIN_LISTINGS_TO_SHOW = 3;

/** The price-vs-mileage fit needs at least this many cars; with fewer we just use the median price. */
export const MIN_LISTINGS_TO_FIT = 3;

export type Confidence = "high" | "medium" | "low";
export type ValueTier = "Value Holder" | "Neutral" | "Money Pit";

/** How much to trust a number, based on how many cars it was measured from. */
export function confidenceFor(sampleSize: number): Confidence {
  if (sampleSize < MIN_SAMPLE) return "low";
  if (sampleSize < HIGH_CONFIDENCE_SAMPLE) return "medium";
  return "high";
}

/** payback = resale premium / what the option cost new (0.8 means you get 80% back). */
export function tierFor(payback: number): ValueTier {
  if (payback >= VALUE_HOLDER_PAYBACK) return "Value Holder";
  if (payback >= NEUTRAL_PAYBACK) return "Neutral";
  return "Money Pit";
}
