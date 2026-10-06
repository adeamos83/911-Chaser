import raw from "@/data/listings.json";
import type { Listing } from "@/data/types";
import { premiumTable, type PremiumTable } from "@/lib/engine";

export const LISTINGS = raw as Listing[];

let table: PremiumTable | null = null;
export function getPremiumTable(): PremiumTable {
  return (table ??= premiumTable(LISTINGS));
}
