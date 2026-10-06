import { colorDef } from "@/data/catalog";
import type { BuildSpec } from "@/data/types";
import { TintedCar } from "@/components/TintedCar";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { estimateBuild } from "@/lib/engine";
import { formatCount, formatUsd } from "@/lib/format";
import { getSignedInUser } from "@/lib/garage";
import { DATA_UPDATED_ON, LISTINGS, getPremiumTable, getScoredListings } from "@/lib/market";
import { softGlowColor } from "@/lib/paint";
import { HomeTop } from "./HomeTop";

/** The example build floating next to the hero car. */
const SHOWCASE_SPEC: BuildSpec = {
  generation: "992.1",
  trim: "GTS",
  body: "Coupe",
  transmission: "Manual",
  color: "Shark Blue",
  options: ["SPORT_CHRONO", "PSE"],
};
const SHOWCASE_MODEL_YEAR = 2022;

const FEATURE_BLURBS = [
  {
    eyebrow: "Configure",
    title: "Spec the dream, not just the model.",
    body: "Generation, paint, manual or PDK, mileage, bucket seats. See what each choice is worth on the used market so you can decide what matters.",
  },
  {
    eyebrow: "Garage",
    title: "Keep your dream builds, watch the gap close.",
    body: "Every saved build remembers its value from the day you added it, so you can see how far the market has moved since.",
  },
  {
    eyebrow: "Deals",
    title: "Catch the one that gets away from everyone else.",
    body: "Dealer listings matched to your builds, with the gap to our estimate shown on every row.",
  },
];

/** The landing page: hero with the account card, a Shark Blue GTS with its live estimate, and three feature blurbs. */
export default async function HomePage() {
  const user = await getSignedInUser();
  const listingsForSale = getScoredListings();
  const sourceLine = `Asking prices from ${formatCount(listingsForSale.length, "live dealer listing")}, updated ${DATA_UPDATED_ON}`;

  return (
    <main className="flex min-h-screen flex-col bg-card">
      <HomeTop memberEmail={user?.email ?? null} sourceLine={sourceLine} />
      <ShowcaseCar />
      <section className="mx-auto grid w-full max-w-[1280px] grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-7 border-t border-hairline px-5 pt-[30px] pb-16 sm:px-12">
        {FEATURE_BLURBS.map((blurb) => (
          <div key={blurb.eyebrow}>
            <Eyebrow>{blurb.eyebrow}</Eyebrow>
            <div className="mt-2.5 text-[17px] font-semibold">{blurb.title}</div>
            <p className="mt-1.5 text-small leading-normal text-body text-pretty">{blurb.body}</p>
          </div>
        ))}
      </section>
    </main>
  );
}

/** The big Shark Blue GTS on its glow, with a floating chip showing its real estimate. */
function ShowcaseCar() {
  const paintHex = colorDef(SHOWCASE_SPEC.color)!.hex;
  const glow = `radial-gradient(ellipse 60% 55% at 50% 60%, ${softGlowColor(paintHex)}, rgba(246,243,237,0) 70%)`;

  const context = { listings: LISTINGS, table: getPremiumTable() };
  const estimate = estimateBuild(SHOWCASE_SPEC, context, { modelYear: SHOWCASE_MODEL_YEAR });
  const sameModelUnderEstimate = getScoredListings().filter(
    (scored) =>
      scored.listing.generation === SHOWCASE_SPEC.generation &&
      scored.listing.trim === SHOWCASE_SPEC.trim &&
      scored.difference < 0,
  );

  return (
    <section className="relative mx-auto mt-9 flex w-full max-w-[1280px] justify-center px-5 sm:px-12">
      <div className="pointer-events-none absolute inset-x-[20%] top-[60px] bottom-0" style={{ background: glow }} />
      <div className="relative w-full max-w-[980px]">
        <TintedCar
          paintHex={paintHex}
          label="Porsche 911 in Shark Blue"
          className="aspect-[1325/443] w-full"
          sizes="980px"
          priority
        />
        {estimate && (
          <div className="absolute top-[2%] right-[4%] hidden rounded-frame border border-hairline bg-surface px-4 py-3 shadow-chip sm:block">
            <div className="text-micro text-muted">
              Your dream build · {SHOWCASE_MODEL_YEAR} {SHOWCASE_SPEC.trim} · {SHOWCASE_SPEC.color} · {SHOWCASE_SPEC.transmission}
            </div>
            <div className="mt-[3px] flex items-baseline gap-2.5">
              <span className="tabular text-[22px] font-semibold tracking-[-.02em]">{formatUsd(estimate.mid)}</span>
              <span className="text-caption font-semibold text-positive">
                {formatCount(sameModelUnderEstimate.length, "listing")} under market
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
