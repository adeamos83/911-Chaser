import { TintedCar } from "@/components/TintedCar";
import { formatMiles, formatUsd } from "@/lib/format";
import type { ScoredListing } from "@/lib/market";
import { softGlowColor } from "@/lib/paint";

/** The deal bar is centered: each 1% under or over moves it 4% of the track, up to the edge (50%). */
const BAR_PERCENT_PER_POINT = 4;
const BAR_MAX_PERCENT = 50;
/** Even a tiny difference shows a sliver of bar. */
const BAR_MIN_PERCENT = 1.5;

/** Everything one row shows, worked out by the page. */
export interface ListingRowData {
  scored: ScoredListing;
  paintHex: string;
  /** Where the listing came from, e.g. "carvana.com". */
  sourceName: string;
  /** Option names, e.g. "Sport Chrono Package, PCCB Ceramic Brakes". */
  optionsText: string;
  /** True when this generation and model is one of the user's saved builds. */
  inGarage: boolean;
}

/** One car for sale: thumbnail, description, asking price, and how it compares with our estimate. */
export function ListingRow({ row }: { row: ListingRowData }) {
  const { listing } = row.scored;
  const title = `${listing.modelYear} 911 ${listing.trim}`;
  const glow = `radial-gradient(ellipse 80% 80% at 50% 75%, ${softGlowColor(row.paintHex, "strong")}, rgba(246,243,237,.6) 75%)`;

  return (
    <article className="flex flex-wrap items-center gap-5 rounded-hero border border-hairline bg-surface py-3.5 pr-[18px] pl-3.5">
      <div className="relative flex h-24 flex-[0_0_184px] items-center justify-center overflow-hidden rounded-input" style={{ background: glow }}>
        <TintedCar paintHex={row.paintHex} label={title} className="aspect-[1325/443] w-[88%]" sizes="184px" />
        <div className="absolute bottom-1.5 left-2 max-w-[90%] truncate rounded-pill bg-surface/90 px-[7px] py-[3px] text-[10px] font-semibold tracking-[.06em] text-ink uppercase">
          {row.sourceName}
        </div>
      </div>

      <div className="min-w-0 flex-[1_1_260px]">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-[16px] font-semibold">{title}</h2>
          {row.inGarage && (
            <span className="rounded-pill bg-accent/10 px-2 py-[3px] text-micro font-semibold text-accent">In your garage</span>
          )}
        </div>
        <div className="mt-1 text-small text-muted">
          {listing.generation} · {listing.color} · {listing.transmission} · {formatMiles(listing.mileage)}
        </div>
        <div className="mt-2 flex flex-wrap gap-3.5 text-caption text-muted">
          <span>{listing.body}</span>
          <span>{row.optionsText}</span>
        </div>
      </div>

      <div className="flex-[0_0_170px]">
        <div className="text-caption text-muted">Asking</div>
        <div className="tabular mt-0.5 text-[22px] font-semibold tracking-[-.01em]">{formatUsd(listing.price)}</div>
        <div className="mt-[3px] text-caption text-muted">{listedText(listing.dom)}</div>
      </div>

      <EstimateComparison row={row} />
    </article>
  );
}

/** "Chaser estimate", a centered bar (green left = under, red right = over), the gap, and the listing link. */
function EstimateComparison({ row }: { row: ListingRowData }) {
  const { scored } = row;
  const isUnder = scored.difference <= 0;
  const percentApart = Math.abs(scored.differenceShare * 100);
  const barWidth = Math.max(BAR_MIN_PERCENT, Math.min(BAR_MAX_PERCENT, percentApart * BAR_PERCENT_PER_POINT));
  const barLeft = isUnder ? 50 - barWidth : 50;
  const colorClass = isUnder ? "text-positive" : "text-negative";
  const barColorClass = isUnder ? "bg-positive" : "bg-negative";
  const sign = isUnder ? "−" : "+";
  const direction = isUnder ? "under" : "over";
  const differenceText = `${sign}${formatUsd(Math.abs(scored.difference))} · ${percentApart.toFixed(0)}% ${direction}`;

  return (
    <div className="flex max-w-[260px] flex-[1_1_220px] flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2 text-caption text-muted">
        <span>Chaser estimate</span>
        <span className="tabular text-ink">{formatUsd(scored.estimate)}</span>
      </div>
      <div className="relative h-1.5 rounded-[3px] bg-hairline">
        <div className="absolute -top-[3px] left-1/2 h-3 w-px bg-ink/35" />
        <div className={`absolute top-0 h-1.5 rounded-[3px] ${barColorClass}`} style={{ left: `${barLeft}%`, width: `${barWidth}%` }} />
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className={`tabular text-[14px] font-semibold whitespace-nowrap ${colorClass}`}>{differenceText}</span>
        {row.scored.listing.vdpUrl && (
          <a
            href={row.scored.listing.vdpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-tooltip border border-line px-2.5 py-1.5 text-caption font-semibold whitespace-nowrap text-ink no-underline hover:border-ink"
          >
            View listing
          </a>
        )}
      </div>
    </div>
  );
}

/** Days on market as a short line: "Listed today", "Listed 1 day ago", "Listed 12 days ago". */
function listedText(daysOnMarket: number | undefined): string {
  if (daysOnMarket === undefined) return "Dealer listing";
  if (daysOnMarket === 0) return "Listed today";
  if (daysOnMarket === 1) return "Listed 1 day ago";
  return `Listed ${daysOnMarket} days ago`;
}
