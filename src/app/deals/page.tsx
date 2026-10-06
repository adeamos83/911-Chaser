import Link from "next/link";
import { GENERATIONS, colorDef, trimsFor } from "@/data/catalog";
import type { BuildSpec, Listing } from "@/data/types";
import { dealScore, type PremiumTable } from "@/lib/engine";
import { DATA_AS_OF, LISTINGS, getPremiumTable } from "@/lib/market";
import { specFromParams, specToQuery, usd } from "@/lib/spec";

// Every trim name across all generations, without duplicates, for the "Model" dropdown.
const ALL_TRIM_NAMES = [...new Set(GENERATIONS.flatMap((generation) => trimsFor(generation).map((trimEntry) => trimEntry.trim)))];

/** Lists every car for sale that matches the chosen generation and trim, ranked by how far under market it is. */
export default async function DealsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const spec = specFromParams(await searchParams);
  const ctx = { listings: LISTINGS, table: getPremiumTable() };

  // Every car of this generation and trim that's for sale, best deal first.
  const carsForSale = LISTINGS.filter(
    (listing) => listing.status === "for_sale" && listing.generation === spec.generation && listing.trim === spec.trim,
  );
  const scoredDeals = carsForSale.map((listing) => ({
    listing,
    score: dealScore(listing, ctx),
    matches: featuresMatchingSpec(listing, spec, ctx.table),
  }));
  const deals = scoredDeals.sort((first, second) => second.score - first.score);

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <p className="eyebrow">For sale now</p>
      <h1 className="mt-2 font-display text-5xl">
        Best deals: {spec.generation} <span className="italic text-accent">{spec.trim}</span>
      </h1>
      <p className="mt-2 max-w-2xl text-muted">
        Real listings from MarketCheck (pulled {DATA_AS_OF}). Each car is priced against what the model expects for its exact year,
        mileage, gearbox and paint, based on every comparable listing.
      </p>

      <form className="mt-6 flex flex-wrap items-end gap-3 text-sm">
        <label>
          <span className="eyebrow block">Generation</span>
          <select name="g" defaultValue={spec.generation} className="mt-1 rounded-lg border border-line bg-panel px-3 py-2">
            {GENERATIONS.map((generation) => <option key={generation}>{generation}</option>)}
          </select>
        </label>
        <label>
          <span className="eyebrow block">Model</span>
          <select name="t" defaultValue={spec.trim} className="mt-1 rounded-lg border border-line bg-panel px-3 py-2">
            {ALL_TRIM_NAMES.map((trim) => <option key={trim}>{trim}</option>)}
          </select>
        </label>
        <input type="hidden" name="x" value={spec.transmission} />
        <input type="hidden" name="c" value={spec.color} />
        <input type="hidden" name="o" value={spec.options.join(",")} />
        <button className="rounded-full border border-line px-4 py-2 hover:border-ink">Show deals</button>
        <Link href={`/build?${specToQuery(spec)}`} className="ml-auto text-muted hover:text-ink">← Back to configurator</Link>
      </form>

      {deals.length === 0 ? (
        <p className="mt-10 text-muted">No {spec.generation} {spec.trim} listings for sale right now.</p>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {deals.map(({ listing, score, matches }) => {
            const isUnderMarket = score > 0;
            return (
              <li key={listing.id} className="rounded-2xl border border-line bg-panel p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl">
                      {listing.modelYear} {listing.trim} {listing.body}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                      <span className="inline-block h-3 w-3 rounded-full border border-white/20" style={{ background: colorDef(listing.color)?.hex }} />
                      {listing.color} · {listing.transmission} · {listing.mileage.toLocaleString()} mi
                    </p>
                  </div>
                  <span className={`tabular shrink-0 rounded-full px-3 py-1 text-sm ${isUnderMarket ? "bg-holder/15 text-holder" : "bg-pit/15 text-pit"}`}>
                    {Math.abs(Math.round(score * 100))}% {isUnderMarket ? "under" : "over"}
                  </span>
                </div>
                <div className="tabular mt-4 flex items-baseline gap-3">
                  <span className="text-2xl">{usd(listing.price)}</span>
                  <span className="text-sm text-muted">asking{listing.dom !== undefined && ` · ${listing.dom} days listed`}</span>
                  {listing.vdpUrl && (
                    <a href={listing.vdpUrl} target="_blank" rel="noopener noreferrer" className="ml-auto text-sm text-muted underline hover:text-ink">
                      View listing ↗
                    </a>
                  )}
                </div>
                {matches.length > 0 && (
                  <p className="mt-3 text-xs text-muted">
                    Matches your spec: <span className="text-ink">{matches.join(" · ")}</span>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}

/** Labels for the parts of a listing that match the user's spec, e.g. ["Manual", "Coupe", "Your paint", "Sport Chrono Package"]. */
function featuresMatchingSpec(listing: Listing, spec: BuildSpec, table: PremiumTable): string[] {
  const matches: string[] = [];
  if (listing.transmission === spec.transmission) matches.push(listing.transmission);
  if (listing.body === spec.body) matches.push(listing.body);
  if (listing.color === spec.color) matches.push("Your paint");
  for (const code of spec.options) {
    const name = table.options[code]?.name;
    if (listing.options.includes(code) && name) matches.push(name);
  }
  return matches;
}
