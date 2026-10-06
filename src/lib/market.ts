import real from "@/data/listings.json";
import modeled from "@/data/listings.modeled.json";
import type { Listing } from "@/data/types";
import { averageOptionContent, premiumTable, type PremiumTable } from "@/lib/engine";

/** Real asking prices pulled from MarketCheck (see scripts/pull-marketcheck.ts). */
export const LISTINGS = real as Listing[];

/**
 * Month the listing data is current to, e.g. "Oct 2026". Read from the newest listing date,
 * so it updates by itself whenever listings.json is refreshed.
 * Server only: importing this file in the browser would ship every listing to the visitor.
 */
export const DATA_AS_OF = formatMonth(LISTINGS.reduce((newest, l) => (l.date > newest ? l.date : newest), ""));

function formatMonth(isoDate: string): string {
  if (!isoDate) return "date unknown";
  // UTC on both sides so the server and the browser always print the same month.
  return new Date(`${isoDate.slice(0, 10)}T00:00:00Z`).toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
}

/** Modeled dataset with planted option effects (see scripts/generate-seed.ts). */
const MODELED = modeled as Listing[];

/** Computed once on first use, then reused for every request. */
let cachedTable: PremiumTable | null = null;

/**
 * Gearbox and paint premiums are measured on real listings. Option premiums come from the
 * modeled dataset: only a few hundred real cars have option sheets, and dealers under-report options,
 * so measured option values are not trustworthy yet.
 */
export function getPremiumTable(): PremiumTable {
  if (cachedTable) return cachedTable;

  const measured = premiumTable(LISTINGS);
  const options = premiumTable(MODELED).options;
  cachedTable = { ...measured, options, avgOptionContent: averageOptionContent(LISTINGS, options) };
  return cachedTable;
}
