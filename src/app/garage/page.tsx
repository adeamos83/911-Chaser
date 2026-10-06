import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PageTitle } from "@/components/PageTitle";
import { estimateBuild, priceByYear } from "@/lib/engine";
import { amountColorClass, formatCount, formatMiles, formatSignedUsd, formatUsd } from "@/lib/format";
import { getSignedInUser, loadSavedBuilds, type SavedBuild } from "@/lib/garage";
import { DATA_UPDATED_ON, LISTINGS, dealsUnderEstimateFor, getPremiumTable } from "@/lib/market";
import { paintHexFor } from "@/lib/paint";
import { configuratorLink, dealsLink } from "@/lib/spec";
import type { BuildCardData } from "./BuildCard";
import { GarageCards } from "./GarageCards";

/** The signed-in user's saved builds, with combined stats on top and one card per build. */
export default async function GaragePage() {
  const user = await getSignedInUser();
  if (!user) redirect("/login?next=/garage");

  const { builds, error } = await loadSavedBuilds();
  const cards = builds.map(cardDataFor);

  const combinedValue = sumOf(cards.map((card) => card.value ?? 0));
  const combinedChange = sumOf(cards.map((card) => card.changeSinceAdded ?? 0));
  // Builds saved before we stored their value can't show a change, so don't pretend it's $0.
  const anyBuildTracked = cards.some((card) => card.changeSinceAdded !== null);
  const changeText = anyBuildTracked ? formatSignedUsd(combinedChange) : "—";
  const changeColor = anyBuildTracked ? amountColorClass(combinedChange) : "text-muted";
  // Two builds of the same model match the same listings, so count each listing once.
  const combinedDeals = dealsUnderEstimateFor(builds.map((build) => build.spec)).length;
  const headline = cards.length === 0 ? "No dream builds yet" : formatCount(cards.length, "dream build");

  return (
    <AppShell activePage="garage" status={`Values refreshed ${DATA_UPDATED_ON}`} signedIn>
      <PageTitle
        eyebrow="Garage"
        headline={headline}
        aside={
          cards.length > 0 && (
            <div className="flex flex-wrap gap-10">
              <Stat label="Combined value" value={formatUsd(combinedValue)} />
              <Stat label="Since added" value={changeText} colorClass={changeColor} />
              <Stat label="Deals under market" value={String(combinedDeals)} colorClass={combinedDeals > 0 ? "text-positive" : "text-ink"} />
            </div>
          )
        }
      />

      {error && <p className="px-5 pt-4 text-small text-negative sm:px-9">Couldn&apos;t load your builds: {error}</p>}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(360px,100%),1fr))] gap-5 px-5 pt-[30px] pb-9 sm:px-9">
        <GarageCards cards={cards}>
          <NewBuildCard />
        </GarageCards>
      </div>
    </AppShell>
  );
}

/** Works out everything one card shows: today's value, change since saved, sparkline data and deal count. */
function cardDataFor(build: SavedBuild): BuildCardData {
  const context = { listings: LISTINGS, table: getPremiumTable() };
  const pricedAt = { modelYear: build.modelYear, mileage: build.mileage };
  const estimate = estimateBuild(build.spec, context, pricedAt);
  const value = estimate ? estimate.mid : null;

  // Only builds saved since we started storing the value can show a change.
  let changeSinceAdded: number | null = null;
  if (build.savedValue !== undefined && value !== null) {
    changeSinceAdded = value - build.savedValue;
  }

  const yearPoints = priceByYear(LISTINGS, build.spec);

  // e.g. "2022 911 Carrera S · Shark Blue · Manual · 9,800 mi"
  const modelYear = estimate?.modelYear ?? build.modelYear;
  const mileage = estimate?.mileage ?? build.mileage;
  const yearText = modelYear === undefined ? "" : `${modelYear} `;
  const specParts = [`${yearText}911 ${build.spec.trim}`, build.spec.color, build.spec.transmission];
  if (mileage !== undefined) specParts.push(formatMiles(mileage));

  return {
    id: build.id,
    name: build.name,
    generation: build.spec.generation,
    createdAt: build.createdAt,
    paintHex: paintHexFor(build.spec.color),
    specLine: specParts.join(" · "),
    value,
    changeSinceAdded,
    optionCount: build.spec.options.length,
    optionsValue: estimate?.breakdown.options ?? 0,
    pricesByYear: yearPoints.map((point) => point.medianPrice),
    dealsUnderMarket: dealsUnderEstimateFor([build.spec]).length,
    editHref: configuratorLink(build.spec, pricedAt, build.id),
    dealsHref: dealsLink(build.spec),
  };
}

function sumOf(numbers: number[]): number {
  return numbers.reduce((total, number) => total + number, 0);
}

/** One headline stat in the title area, e.g. "Combined value $612,400". */
function Stat({ label, value, colorClass = "text-ink" }: { label: string; value: string; colorClass?: string }) {
  return (
    <div>
      <div className="text-caption text-muted">{label}</div>
      <div className={`tabular mt-0.5 text-[28px] font-semibold tracking-[-.02em] ${colorClass}`}>{value}</div>
    </div>
  );
}

/** The dashed "+ New build" card at the end of the grid. */
function NewBuildCard() {
  return (
    <Link
      href="/build"
      className="flex min-h-[320px] flex-col items-center justify-center gap-2.5 rounded-rail border border-dashed border-ink/25 text-ink no-underline transition-colors hover:border-ink/50"
    >
      <span className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/20 text-[22px] font-light">+</span>
      <span className="text-[14px] font-semibold">New build</span>
      <span className="text-caption text-muted">Configure a 911 and start tracking it</span>
    </Link>
  );
}
