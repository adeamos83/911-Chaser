// Turns a list of values into SVG paths for the small line charts (value rail, garage cards).

/** Keeps the line 2px away from the top and bottom edges so it never gets clipped. */
const EDGE_PADDING = 2;

export interface ChartPaths {
  /** The line through every point, e.g. "M0 40L10 32L20 35". */
  linePath: string;
  /** The same line closed along the bottom edge, for the shaded area under it. */
  areaPath: string;
  minimumValue: number;
  maximumValue: number;
  /** Where each point sits on the chart, in SVG units. */
  points: { x: number; y: number }[];
}

/**
 * Spreads the values evenly from left to right and scales them so the lowest value
 * touches the bottom and the highest touches the top.
 */
export function buildChartPaths(values: number[], width: number, height: number): ChartPaths {
  const minimumValue = Math.min(...values);
  const maximumValue = Math.max(...values);
  // A flat line has no spread; use 1 so we never divide by zero.
  const valueSpread = maximumValue - minimumValue || 1;
  const usableHeight = height - EDGE_PADDING * 2;
  const lastIndex = Math.max(values.length - 1, 1);

  const points = values.map((value, index) => {
    const x = (index / lastIndex) * width;
    const shareOfSpread = (value - minimumValue) / valueSpread;
    const y = height - EDGE_PADDING - shareOfSpread * usableHeight;
    return { x, y };
  });

  const pointCommands = points.map((point) => `${point.x.toFixed(1)} ${point.y.toFixed(1)}`);
  const linePath = `M${pointCommands.join("L")}`;
  const areaPath = `${linePath}L${width} ${height}L0 ${height}Z`;

  return { linePath, areaPath, minimumValue, maximumValue, points };
}
