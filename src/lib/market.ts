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
export const DATA_AS_OF = formatMonth(newestListingDate(LISTINGS));

/** The latest `date` among the listings, or "" if there are none. ISO dates sort as plain strings. */
function newestListingDate(listings: Listing[]): string {
  let newest = "";
  for (const listing of listings) {
    if (listing.date > newest) newest = listing.date;
  }
  return newest;
}

/** "2026-10-03" -> "Oct 2026" */
function formatMonth(isoDate: string): string {
  if (!isoDate) return "date unknown";
  const dayOnly = isoDate.slice(0, 10);
  // UTC on both sides so the server and the browser always print the same month.
  const date = new Date(`${dayOnly}T00:00:00Z`);
  return date.toLocaleString("en-US", { month: "short", year: "numeric", timeZone: "UTC" });
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
  const avgOptionContent = averageOptionContent(LISTINGS, options);
  cachedTable = { ...measured, options, avgOptionContent };
  return cachedTable;
}
