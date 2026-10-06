import { buildChartPaths } from "@/lib/chart";

interface SparklineProps {
  values: number[];
  /** Color of the shaded area under the line (the paint color). */
  fillHex: string;
  /** Describes the chart for screen readers and as a hover tooltip. */
  label: string;
}

/** Sparklines are drawn on a 320 x 44 grid, then stretched to the card's width. */
const SPARKLINE_WIDTH = 320;
const SPARKLINE_HEIGHT = 44;
/** A line needs at least two points. */
const MIN_POINTS = 2;

/** A tiny line chart with a soft paint-colored area, used on the garage cards. */
export function Sparkline({ values, fillHex, label }: SparklineProps) {
  if (values.length < MIN_POINTS) {
    return (
      <div className="flex h-11 items-center text-micro text-muted" title={label}>
        Not enough listings yet to chart this model.
      </div>
    );
  }

  const paths = buildChartPaths(values, SPARKLINE_WIDTH, SPARKLINE_HEIGHT);
  return (
    <svg
      viewBox={`0 0 ${SPARKLINE_WIDTH} ${SPARKLINE_HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      className="block h-11 w-full overflow-visible"
    >
      <title>{label}</title>
      <path d={paths.areaPath} fill={fillHex} opacity=".14" />
      <path d={paths.linePath} fill="none" stroke="#1c1b19" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
