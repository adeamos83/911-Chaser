import { ValueChart, type ChartPoint } from "@/components/charts/ValueChart";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { Estimate, YearPoint } from "@/lib/engine";
import { formatMiles, formatUsd } from "@/lib/format";

export type ChartMode = "year" | "mileage";

const CHART_MODE_OPTIONS: { value: ChartMode; label: string }[] = [
  { value: "year", label: "By year" },
  { value: "mileage", label: "By mileage" },
];

/** The mileage chart runs from a brand-new car to this many miles, matching the mileage slider. */
export const CHART_MAX_MILES = 80000;
const CHART_MILES_STEP = 2500;
/** A line needs at least two points. */
const MIN_CHART_POINTS = 2;

interface RailChartProps {
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
  estimate: Estimate;
  /** Median asking price for each model year of this generation and model. */
  pricesByYear: YearPoint[];
  /** Dollars of value lost (negative) for each extra mile, from real listings. */
  perMile: number;
  paintHex: string;
}

/**
 * The chart in the value rail, with two views:
 *   By year     the real median asking price for each model year
 *   By mileage  this build's estimate from 0 to 80,000 miles, using the per-mile rate from real listings
 */
export function RailChart({ mode, onModeChange, estimate, pricesByYear, perMile, paintHex }: RailChartProps) {
  const points = mode === "year" ? pointsByYear(pricesByYear) : pointsByMileage(estimate, perMile);
  const caption = mode === "year" ? "Median asking, by model year" : "This build, from new to 80,000 mi";
  const hasEnoughPoints = points.length >= MIN_CHART_POINTS;
  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-caption text-muted">{caption}</span>
        <SegmentedControl ariaLabel="Chart view" size="small" options={CHART_MODE_OPTIONS} selectedValue={mode} onSelect={onModeChange} />
      </div>

      {hasEnoughPoints ? (
        <>
          <ValueChart points={points} fillHex={paintHex} />
          <div className="flex justify-between text-micro text-muted">
            <span>{firstPoint.axisLabel} · {formatUsd(firstPoint.value)}</span>
            <span>{lastPoint.axisLabel} · {formatUsd(lastPoint.value)}</span>
          </div>
        </>
      ) : (
        <div className="flex h-24 items-center justify-center rounded-input border border-dashed border-line text-caption text-muted">
          Not enough listings yet to chart this model by year.
        </div>
      )}
    </div>
  );
}

/** One point per model year, e.g. value $112,000 labeled "2021 model year · 14 listings". */
function pointsByYear(pricesByYear: YearPoint[]): ChartPoint[] {
  return pricesByYear.map((yearPoint) => ({
    value: yearPoint.medianPrice,
    label: `${yearPoint.year} model year · ${yearPoint.sample} listings`,
    axisLabel: String(yearPoint.year),
  }));
}

/** This build's value every 2,500 miles from 0 to 80,000, moved along the per-mile rate. */
function pointsByMileage(estimate: Estimate, perMile: number): ChartPoint[] {
  const points: ChartPoint[] = [];
  for (let miles = 0; miles <= CHART_MAX_MILES; miles += CHART_MILES_STEP) {
    const milesFromEstimate = miles - estimate.mileage;
    points.push({
      value: estimate.mid + perMile * milesFromEstimate,
      label: formatMiles(miles),
      axisLabel: formatMiles(miles),
    });
  }
  return points;
}
