"use client";

import { useState } from "react";
import { buildChartPaths } from "@/lib/chart";
import { formatUsd } from "@/lib/format";

export interface ChartPoint {
  value: number;
  /** Shown under the price in the hover tooltip, e.g. "2021 model year · 14 listings". */
  label: string;
  /** Short name for the point under the chart's ends, e.g. "2021". */
  axisLabel: string;
}

interface ValueChartProps {
  points: ChartPoint[];
  /** Color of the shaded area under the line (the paint color). */
  fillHex: string;
}

/** The chart is drawn on a 340 x 96 grid, then stretched to the card's width. */
const CHART_WIDTH = 340;
const CHART_HEIGHT = 96;
/** Keeps the tooltip from hanging off either edge of the card, as a percent of the chart width. */
const TOOLTIP_MIN_PERCENT = 18;
const TOOLTIP_MAX_PERCENT = 82;

/**
 * A small area chart. Hovering shows a dashed guide line, a dot on the line, and a dark
 * tooltip with the value and its label.
 */
export function ValueChart({ points, fillHex }: ValueChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const values = points.map((point) => point.value);
  const paths = buildChartPaths(values, CHART_WIDTH, CHART_HEIGHT);
  const lastIndex = points.length - 1;

  /** Finds the point closest to the pointer's horizontal position. */
  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const chartBox = event.currentTarget.getBoundingClientRect();
    const shareAcross = (event.clientX - chartBox.left) / chartBox.width;
    const nearestIndex = Math.round(shareAcross * lastIndex);
    const clampedIndex = Math.min(lastIndex, Math.max(0, nearestIndex));
    if (clampedIndex !== hoveredIndex) setHoveredIndex(clampedIndex);
  };

  const hoveredPoint = hoveredIndex === null ? null : paths.points[hoveredIndex];
  // Where the hovered point sits, as a percent of the chart's width and height.
  const hoverLeftPercent = hoveredPoint ? (hoveredPoint.x / CHART_WIDTH) * 100 : 0;
  const hoverTopPercent = hoveredPoint ? (hoveredPoint.y / CHART_HEIGHT) * 100 : 0;
  const tooltipLeftPercent = Math.min(TOOLTIP_MAX_PERCENT, Math.max(TOOLTIP_MIN_PERCENT, hoverLeftPercent));

  return (
    <div
      onPointerMove={handlePointerMove}
      onPointerLeave={() => setHoveredIndex(null)}
      className="relative h-24 cursor-crosshair touch-none"
    >
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        className="absolute inset-0 block h-full w-full overflow-visible"
        aria-hidden="true"
      >
        <line x1="0" y1={CHART_HEIGHT - 1} x2={CHART_WIDTH} y2={CHART_HEIGHT - 1} stroke="rgba(28,27,25,.12)" vectorEffect="non-scaling-stroke" />
        <path d={paths.areaPath} fill={fillHex} opacity=".12" />
        <path d={paths.linePath} fill="none" stroke="#1c1b19" strokeWidth="1.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        {hoveredPoint && (
          <line
            x1={hoveredPoint.x}
            y1="0"
            x2={hoveredPoint.x}
            y2={CHART_HEIGHT - 1}
            stroke="rgba(28,27,25,.35)"
            strokeDasharray="2 3"
            vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {hoveredPoint && hoveredIndex !== null && (
        <>
          {/* The dot is HTML, not SVG, so stretching the chart doesn't squash it into an oval. */}
          <span
            className="pointer-events-none absolute h-[13px] w-[13px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface bg-ink"
            style={{ left: `${hoverLeftPercent}%`, top: `${hoverTopPercent}%` }}
          />
          <div
            className="pointer-events-none absolute -top-2 -translate-x-1/2 -translate-y-full rounded-tooltip bg-ink px-2.5 py-[7px] text-caption whitespace-nowrap text-inverse shadow-tooltip"
            style={{ left: `${tooltipLeftPercent}%` }}
          >
            <div className="tabular text-small font-semibold">{formatUsd(points[hoveredIndex].value)}</div>
            <div className="mt-px opacity-70">{points[hoveredIndex].label}</div>
          </div>
        </>
      )}
    </div>
  );
}
