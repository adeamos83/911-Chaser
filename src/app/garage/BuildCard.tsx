import Link from "next/link";
import { Sparkline } from "@/components/charts/Sparkline";
import { TintedCar } from "@/components/TintedCar";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "@/components/ui/buttonStyles";
import { amountColorClass, formatCount, formatShortDate, formatSignedUsd, formatUsd } from "@/lib/format";
import { softGlowColor } from "@/lib/paint";
import { deleteBuild } from "../actions";

/** Everything one garage card shows, worked out by the page. */
export interface BuildCardData {
  id: string;
  name: string;
  generation: string;
  createdAt: string;
  paintHex: string;
  /** e.g. "2022 911 Carrera S · Shark Blue · Manual · 9,800 mi" */
  specLine: string;
  /** Today's estimate, or null when there isn't enough market data. */
  value: number | null;
  /** Today's estimate minus the estimate on the day it was saved. Null for builds saved before we kept that. */
  changeSinceAdded: number | null;
  optionCount: number;
  optionsValue: number;
  /** Median asking price per model year, oldest first, for the sparkline. */
  pricesByYear: number[];
  dealsUnderMarket: number;
  editHref: string;
  dealsHref: string;
}

const CARD_BUTTON = "flex-1 rounded-input p-[11px] text-small";

/** One saved build: the car on a glow of its paint, its value, a price-by-year sparkline, and actions. */
export function BuildCard({ build }: { build: BuildCardData }) {
  const glow = `radial-gradient(ellipse 70% 70% at 50% 70%, ${softGlowColor(build.paintHex)}, rgba(253,252,250,0) 72%)`;
  const hasOptions = build.optionCount > 0;
  const optionsText = hasOptions ? `${formatCount(build.optionCount, "option")} · ${formatSignedUsd(build.optionsValue)}` : "No options";

  return (
    <article className="flex flex-col overflow-hidden rounded-rail border border-hairline bg-surface">
      <div className="relative flex h-[170px] items-center justify-center" style={{ background: glow }}>
        <TintedCar paintHex={build.paintHex} label={build.name} className="aspect-[1325/443] w-[82%]" sizes="360px" />
        <div className="absolute top-3.5 left-4 text-micro font-semibold tracking-[.08em] text-muted uppercase">{build.generation}</div>
        <div className="absolute top-3 right-3.5 rounded-pill bg-card/90 px-2 py-1 text-micro text-muted">
          Added {formatShortDate(build.createdAt)}
        </div>
      </div>

      <div className="flex flex-col gap-3.5 px-5 pt-1.5 pb-5">
        <div>
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-[18px] font-semibold">{build.name}</h2>
            <div className="tabular text-[18px] font-semibold">{build.value === null ? "—" : formatUsd(build.value)}</div>
          </div>
          <div className="mt-[3px] flex items-baseline justify-between gap-3">
            <div className="text-caption text-muted">{build.specLine}</div>
            <RemoveButton buildId={build.id} />
          </div>
        </div>

        <Sparkline values={build.pricesByYear} fillHex={build.paintHex} label="Median asking price by model year" />

        <div className="flex items-center justify-between gap-3 border-t border-hairline pt-3 text-caption">
          <span className="text-muted">{optionsText}</span>
          <ChangeSinceAdded change={build.changeSinceAdded} />
        </div>

        <div className="flex gap-2">
          <Link href={build.editHref} className={`${OUTLINE_BUTTON} ${CARD_BUTTON}`}>
            Edit build
          </Link>
          <Link href={build.dealsHref} className={`${PRIMARY_BUTTON} ${CARD_BUTTON}`}>
            {formatCount(build.dealsUnderMarket, "deal")}
          </Link>
        </div>
      </div>
    </article>
  );
}

/** "+$1,240 since added" in green or red, or a muted note when there's nothing to compare yet. */
function ChangeSinceAdded({ change }: { change: number | null }) {
  if (change === null) return <span className="text-muted">Saved before value tracking</span>;
  if (Math.round(change) === 0) return <span className="text-muted">No change since added</span>;
  return <span className={`font-semibold ${amountColorClass(change)}`}>{formatSignedUsd(change)} since added</span>;
}

function RemoveButton({ buildId }: { buildId: string }) {
  return (
    <form action={deleteBuild}>
      <input type="hidden" name="id" value={buildId} />
      <button className="cursor-pointer border-0 bg-transparent p-0 text-caption text-muted hover:text-negative">Remove</button>
    </form>
  );
}
