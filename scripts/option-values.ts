/**
 * Measures what each option is really worth, using real cars only (no modeled data).
 *
 * A car counts as having an option if its Porsche factory codes say so (see src/data/factoryCodes.ts)
 * OR the dealer's text mentions it. Then the pricing engine compares cars with and without each option.
 *
 * Nothing in the app uses this yet. It's a report so we can check the numbers before showing them.
 *
 *   npx tsx scripts/option-values.ts
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { optionsFromFactoryCodes } from "../src/data/factoryCodes";
import type { Listing } from "../src/data/types";
import { premiumTable } from "../src/lib/engine";

const LISTINGS_FILE = join(__dirname, "..", "src", "data", "listings.json");

const allListings: Listing[] = JSON.parse(readFileSync(LISTINGS_FILE, "utf8"));

// Only cars where we pulled an option sheet. For the rest we don't know what options they have.
const carsWithOptionSheets = allListings.filter((listing) => listing.optionsKnown);

// Combine both signals: what the factory codes say, plus what the dealer's text said.
const carsWithRealOptions = carsWithOptionSheets.map((listing) => {
  const fromCodes = optionsFromFactoryCodes(listing.factoryCodes ?? [], listing.generation);
  const fromText = listing.options;
  const combined = Array.from(new Set([...fromCodes, ...fromText]));
  return { ...listing, options: combined };
});

const table = premiumTable(carsWithRealOptions);

console.log(`Measured from ${carsWithRealOptions.length} real cars with option sheets.\n`);
console.log("Option".padEnd(28) + "Worth".padStart(9) + "Payback".padStart(9) + "  With  Without  Confidence");

for (const option of Object.values(table.options)) {
  const worth = `$${Math.round(option.premiumUsd).toLocaleString()}`;
  const payback = `${Math.round(option.payback * 100)}%`;
  console.log(
    option.name.padEnd(28) +
      worth.padStart(9) +
      payback.padStart(9) +
      String(option.sampleWith).padStart(6) +
      String(option.sampleWithout).padStart(9) +
      `  ${option.confidence}`,
  );
}
