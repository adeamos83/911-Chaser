import Link from "next/link";
import { GENERATIONS } from "@/data/catalog";
import { AppShell } from "@/components/AppShell";
import { PageTitle } from "@/components/PageTitle";
import { OUTLINE_BUTTON } from "@/components/ui/buttonStyles";
import { Pill } from "@/components/ui/Pill";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatCount } from "@/lib/format";
import { getSignedInUser, loadSavedBuilds } from "@/lib/garage";
import { DATA_UPDATED_ON, getPremiumTable, getScoredListings, listingSourceName, type ScoredListing } from "@/lib/market";
import { paintHexFor } from "@/lib/paint";
import { ALL_MODELS, ROWS_PER_PAGE, dealsHref, readFilters, type DealFilters, type SortKey } from "./filters";
import { ListingRow, type ListingRowData } from "./ListingRow";

const SORT_LABELS: Record<SortKey, string> = { best: "Best deal", newest: "Newest", price: "Price" };
const SORT_ORDER: SortKey[] = ["best", "newest", "price"];
// Newest generation first.
const GENERATIONS_NEWEST_FIRST = [...GENERATIONS].reverse();

type SearchParams = Record<string, string | string[] | undefined>;

/** Every car for sale, compared against our estimate for the same spec, mileage and model year. */
export default async function DealsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = readFilters(await searchParams);
  const user = await getSignedInUser();
  const { builds } = user ? await loadSavedBuilds() : { builds: [] };

  // "992.1|Carrera S" for every model in the user's garage.
  const garageModels = new Set(builds.map((build) => `${build.spec.generation}|${build.spec.trim}`));
  const isInGarage = (scored: ScoredListing) => garageModels.has(`${scored.listing.generation}|${scored.listing.trim}`);

  const allListings = getScoredListings();
  const matching = allListings.filter((scored) => matchesFilters(scored, filters, isInGarage));
  const sorted = sortListings(matching, filters.sort);
  const shownListings = sorted.slice(0, filters.limit);
  const underEstimateCount = matching.filter((scored) => scored.difference <= 0).length;
  const hiddenCount = sorted.length - shownListings.length;
  const nextPageCount = Math.min(ROWS_PER_PAGE, hiddenCount);

  const rows: ListingRowData[] = shownListings.map((scored) => ({
    scored,
    paintHex: paintHexFor(scored.listing.color),
    sourceName: listingSourceName(scored.listing),
    optionsText: optionsTextFor(scored),
    inGarage: isInGarage(scored),
  }));

  const headline = `${underEstimateCount.toLocaleString("en-US")} of ${formatCount(matching.length, "listing")} priced under our estimate`;
  const status = `Listings updated ${DATA_UPDATED_ON} · ${formatCount(allListings.length, "dealer listing")} via MarketCheck`;

  return (
    <AppShell activePage="deals" status={status} signedIn={!!user}>
      <PageTitle
        eyebrow="Deals"
        headline={headline}
        description="Live dealer listings compared against the 911 Chaser estimate for the same spec, mileage and model year. Green is below estimate, red is above."
        aside={
          <SegmentedControl
            ariaLabel="Sort listings"
            selectedValue={filters.sort}
            options={SORT_ORDER.map((sortKey) => ({
              value: sortKey,
              label: SORT_LABELS[sortKey],
              href: dealsHref(filters, { sort: sortKey }),
            }))}
          />
        }
      />

      <FilterRow filters={filters} signedIn={!!user} />

      <div className="flex flex-col gap-2.5 px-5 pt-[22px] pb-9 sm:px-9">
        {rows.map((row) => (
          <ListingRow key={row.scored.listing.id} row={row} />
        ))}

        {rows.length === 0 && (
          <div className="rounded-hero border border-dashed border-ink/20 p-12 text-center text-small text-muted">
            No listings match these filters right now. We refresh listings every month.
          </div>
        )}

        {hiddenCount > 0 && (
          <Link
            href={dealsHref(filters, { limit: filters.limit + ROWS_PER_PAGE })}
            scroll={false}
            className={`${OUTLINE_BUTTON} mt-2 self-center px-5 py-3 text-small`}
          >
            Show {nextPageCount} more ({hiddenCount.toLocaleString("en-US")} left)
          </Link>
        )}
      </div>
    </AppShell>
  );
}

/** Model pills · generation pills · "Only builds in my garage" switch. */
function FilterRow({ filters, signedIn }: { filters: DealFilters; signedIn: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-6 px-5 pt-6 sm:px-9">
      <div className="flex flex-wrap gap-1.5">
        <Pill size="compact" selected={filters.model === "all"} href={dealsHref(filters, { model: "all" })}>
          All models
        </Pill>
        {ALL_MODELS.map((model) => (
          <Pill key={model} size="compact" selected={filters.model === model} href={dealsHref(filters, { model })}>
            {model}
          </Pill>
        ))}
      </div>

      <div className="hidden h-6 w-px bg-track sm:block" />

      <div className="flex flex-wrap gap-1.5">
        <Pill size="compact" selected={filters.generation === "all"} href={dealsHref(filters, { generation: "all" })}>
          All generations
        </Pill>
        {GENERATIONS_NEWEST_FIRST.map((generation) => (
          <Pill key={generation} size="compact" selected={filters.generation === generation} href={dealsHref(filters, { generation })}>
            {generation}
          </Pill>
        ))}
      </div>

      {signedIn && <GarageOnlySwitch filters={filters} />}
    </div>
  );
}

/** A small on/off switch. It's a link, so flipping it just loads the page with the filter changed. */
function GarageOnlySwitch({ filters }: { filters: DealFilters }) {
  const isOn = filters.garageOnly;
  const trackClasses = isOn ? "justify-end bg-ink" : "justify-start bg-line-strong";

  return (
    <div className="ml-auto flex items-center gap-2 text-small text-muted">
      <Link
        href={dealsHref(filters, { garageOnly: !isOn })}
        scroll={false}
        role="switch"
        aria-checked={isOn}
        aria-label="Only builds in my garage"
        className={`flex h-[22px] w-9 rounded-pill p-0.5 ${trackClasses}`}
      >
        <span className="block h-[18px] w-[18px] rounded-full bg-surface shadow-knob" />
      </Link>
      <span>Only builds in my garage</span>
    </div>
  );
}

function matchesFilters(scored: ScoredListing, filters: DealFilters, isInGarage: (scored: ScoredListing) => boolean): boolean {
  const { listing } = scored;
  if (filters.generation !== "all" && listing.generation !== filters.generation) return false;
  if (filters.model !== "all" && listing.trim !== filters.model) return false;
  if (filters.garageOnly && !isInGarage(scored)) return false;
  return true;
}

/** Best deal: furthest under estimate first. Newest: fewest days on market first. Price: cheapest first. */
function sortListings(listings: ScoredListing[], sort: SortKey): ScoredListing[] {
  const sorted = [...listings];
  if (sort === "best") {
    sorted.sort((first, second) => first.differenceShare - second.differenceShare);
  } else if (sort === "newest") {
    // Listings without a days-on-market count go last.
    const daysListed = (scored: ScoredListing) => scored.listing.dom ?? Number.MAX_SAFE_INTEGER;
    sorted.sort((first, second) => daysListed(first) - daysListed(second));
  } else {
    sorted.sort((first, second) => first.listing.price - second.listing.price);
  }
  return sorted;
}

/** The listing's option names, or a note when the dealer didn't list them. */
function optionsTextFor(scored: ScoredListing): string {
  const { listing } = scored;
  if (listing.optionsKnown === false) return "Options not listed";

  const optionTable = getPremiumTable().options;
  const optionNames = listing.options.map((code) => optionTable[code]?.name ?? code);
  return optionNames.length > 0 ? optionNames.join(", ") : "No notable options";
}
