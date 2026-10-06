/** Basic statistics helpers. */

export function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * The value at a given position in the sorted list (0 = lowest, 0.5 = median, 1 = highest).
 * When the position falls between two values, it blends them.
 */
export function quantile(values: number[], q: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q;
  const below = Math.floor(position);
  const above = Math.ceil(position);
  return sorted[below] + (sorted[above] - sorted[below]) * (position - below);
}

export const median = (values: number[]) => quantile(values, 0.5);
