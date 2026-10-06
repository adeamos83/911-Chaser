import real from "@/data/listings.json";
import modeled from "@/data/listings.modeled.json";
import type { Listing } from "@/data/types";
import { premiumTable, type PremiumTable } from "@/lib/engine";

/** Real asking prices pulled from MarketCheck (see scripts/pull-marketcheck.ts). */
export const LISTINGS = real as Listing[];

/** Modeled dataset with planted option effects (see scripts/generate-seed.ts). */
const MODELED = modeled as Listing[];

let table: PremiumTable | null = null;

/**
 * Gearbox and paint premiums are measured on real listings. Option premiums come from the
 * modeled dataset: only 350 real cars have option sheets, and dealers under-report options,
 * so measured option values are not trustworthy yet.
 */
export function getPremiumTable(): PremiumTable {
  if (table) return table;
  const measured = premiumTable(LISTINGS);
  const options = premiumTable(MODELED).options;
  const known = LISTINGS.filter((l) => l.optionsKnown);
  const avgOptionContent = known.length
    ? known.reduce((s, l) => s + l.options.reduce((t, c) => t + (options[c]?.premiumUsd ?? 0), 0), 0) / known.length
    : 0;
  return (table = { ...measured, options, avgOptionContent });
}
