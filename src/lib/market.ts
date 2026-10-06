import real from "@/data/listings.json";
import modeled from "@/data/listings.modeled.json";
import type { Listing } from "@/data/types";
import { averageOptionContent, expectedPrice, premiumTable, type PremiumTable } from "@/lib/engine";
import { formatDate } from "@/lib/format";

/** Real asking prices pulled from MarketCheck (see scripts/pull-marketcheck.ts). */
export const LISTINGS = real as Listing[];

/**
 * Month the listing data is current to, e.g. "Oct 2026". Read from the newest listing date,
 * so it updates by itself whenever listings.json is refreshed.
 * Server only: importing this file in the browser would ship every listing to the visitor.
 */
export const DATA_AS_OF = formatMonth(newestListingDate(LISTINGS));

/** Day the listing data is current to, e.g. "Oct 6, 2026". */
export const DATA_UPDATED_ON = formatUpdatedDay(newestListingDate(LISTINGS));

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

/** "2026-10-03" -> "Oct 3, 2026" */
function formatUpdatedDay(isoDate: string): string {
  if (!isoDate) return "date unknown";
  const dayOnly = isoDate.slice(0, 10);
  return formatDate(`${dayOnly}T00:00:00Z`);
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

/** A car for sale, with what our model says that exact car should be listed for. */
export interface ScoredListing {
  listing: Listing;
  /** Our estimate for the same spec, mileage and model year. */
  estimate: number;
  /** Asking price minus estimate: negative means priced under our estimate. */
  difference: number;
  /** `difference` as a share of the estimate: -0.08 means 8% under. */
  differenceShare: number;
}

/** Computed once on first use, then reused for every request. */
let cachedScoredListings: ScoredListing[] | null = null;

/** Every car for sale, each compared against our estimate. Cars we can't estimate are left out. */
export function getScoredListings(): ScoredListing[] {
  if (cachedScoredListings) return cachedScoredListings;

  const context = { listings: LISTINGS, table: getPremiumTable() };
  const carsForSale = LISTINGS.filter((listing) => listing.status === "for_sale");
  const scored: ScoredListing[] = [];
  for (const listing of carsForSale) {
    const estimate = expectedPrice(listing, context);
    if (estimate === null) continue;
    const difference = listing.price - estimate;
    scored.push({ listing, estimate, difference, differenceShare: difference / estimate });
  }

  cachedScoredListings = scored;
  return scored;
}

/** "https://www.carvana.com/vehicle/1" -> "carvana.com". The dealer's site stands in for the listing source. */
export function listingSourceName(listing: Listing): string {
  if (!listing.vdpUrl) return "Dealer";
  try {
    const hostname = new URL(listing.vdpUrl).hostname;
    return hostname.replace(/^www\./, "");
  } catch {
    return "Dealer";
  }
}
