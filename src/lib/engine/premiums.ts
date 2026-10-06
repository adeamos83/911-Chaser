/**
 * Steps 3 to 5 of the engine: how much more a car with some feature (an option, a manual
 * gearbox, a special paint) sells for than a comparable car without it, and whether that
 * feature pays back what it cost new.
 */
import { OPTIONS, TRIMS, optionAvailableOn } from "@/data/catalog";
import type { ColorTier, Listing } from "@/data/types";
import { residuals, type ListingWithResidual } from "./depreciation";
import { confidenceFor, tierFor, type Confidence, type ValueTier } from "./rules";
import { median } from "./stats";

// ---------- 3. premiums ----------

export interface Premium {
  /** Median price of cars WITH the feature minus median price of cars WITHOUT it. */
  premiumUsd: number;
  sampleWith: number;
  sampleWithout: number;
  confidence: Confidence;
}

const NO_PREMIUM: Premium = { premiumUsd: 0, sampleWith: 0, sampleWithout: 0, confidence: "high" };

/** False when we only have the listing, not its option sheet, so we can't tell what it has. */
export const hasKnownOptions = (listing: Listing) => listing.optionsKnown !== false;

/**
 * Compares cars that have a feature against cars that don't.
 * @param pool     listings with residuals (see `residuals`)
 * @param has      does this car have the feature?
 * @param eligible should this car be part of the comparison at all?
 */
export function premiumWhere(
  pool: (Listing & { residual: number })[],
  has: (listing: Listing) => boolean,
  eligible: (listing: Listing) => boolean = () => true,
): Premium {
  const rows = pool.filter(eligible);
  const withFeature = rows.filter(has).map((listing) => listing.residual);
  const withoutFeature = rows.filter((listing) => !has(listing)).map((listing) => listing.residual);
  const bothSidesHaveCars = withFeature.length > 0 && withoutFeature.length > 0;
  return {
    premiumUsd: bothSidesHaveCars ? median(withFeature) - median(withoutFeature) : 0,
    sampleWith: withFeature.length,
    sampleWithout: withoutFeature.length,
    confidence: confidenceFor(Math.min(withFeature.length, withoutFeature.length)),
  };
}

/** Premium for one option, using only cars whose option sheet we know and whose body can have it. */
function premiumForOption(pool: ListingWithResidual[], optionCode: string): Premium {
  return premiumWhere(
    pool,
    (listing) => listing.options.includes(optionCode),
    (listing) => hasKnownOptions(listing) && optionAvailableOn(optionCode, listing.body),
  );
}

/** Resale premium for one option code, measured on a raw list of listings. */
export function optionPremium(listings: Listing[], optionCode: string): Premium {
  return premiumForOption(residuals(listings), optionCode);
}

// ---------- 4. payback ----------

/** Share of an option's original cost you get back at resale (0.8 = 80%). */
export function paybackPct(premiumUsd: number, msrpCost: number): number {
  return msrpCost > 0 ? premiumUsd / msrpCost : 0;
}

// ---------- 5. the full premium table ----------

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

/**
 * Average total option premium per car. Used as a stand-in for cars whose option sheet we
 * don't have, so they aren't treated as if they had no options at all.
 */
export function averageOptionContent(listings: Listing[], options: Record<string, OptionValue>): number {
  const carsWithKnownOptions = listings.filter(hasKnownOptions);
  if (carsWithKnownOptions.length === 0) return 0;

  let total = 0;
  for (const listing of carsWithKnownOptions) {
    let listingTotal = 0;
    for (const code of listing.options) listingTotal += options[code]?.premiumUsd ?? 0;
    total += listingTotal;
  }
  return total / carsWithKnownOptions.length;
}

/** Every premium the estimator needs, computed once for a pool of listings. */
export function premiumTable(pool: Listing[]): PremiumTable {
  const withResiduals = residuals(pool);

  const options: Record<string, OptionValue> = {};
  for (const option of OPTIONS) {
    const premium = premiumForOption(withResiduals, option.code);
    const payback = paybackPct(premium.premiumUsd, option.msrpCost);
    options[option.code] = {
      ...premium,
      code: option.code,
      name: option.name,
      msrpCost: option.msrpCost,
      payback,
      tier: tierFor(payback),
    };
  }

  // Only compare manual vs PDK on trims where a manual was actually offered.
  const manualTrims = TRIMS.filter((trim) => trim.manualAvailable);
  const trimsWithManual = new Set(manualTrims.map((trim) => `${trim.generation}|${trim.trim}`));
  const manual = premiumWhere(
    withResiduals,
    (listing) => listing.transmission === "Manual",
    (listing) => trimsWithManual.has(`${listing.generation}|${listing.trim}`),
  );

  // Each paint tier is compared against standard (non-metallic) paint.
  const paintPremiumVsStandard = (tier: ColorTier) =>
    premiumWhere(
      withResiduals,
      (listing) => listing.colorTier === tier,
      (listing) => listing.colorTier === tier || listing.colorTier === "Standard",
    );

  return {
    avgOptionContent: averageOptionContent(pool, options),
    options,
    manual,
    colorTier: {
      Standard: NO_PREMIUM,
      Metallic: paintPremiumVsStandard("Metallic"),
      Special: paintPremiumVsStandard("Special"),
      // Paint to Sample value is carried by the "PTS" option itself, so the tier premium stays zero.
      PTS: NO_PREMIUM,
    },
  };
}
