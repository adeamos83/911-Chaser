/** Basic statistics helpers. */

/** The average: add every value up and divide by how many there are. */
export function mean(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

/**
 * The value at a given position in the sorted list (0 = lowest, 0.5 = median, 1 = highest).
 * When the position falls between two values, it blends them.
 */
export function quantile(values: number[], fraction: number): number {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((first, second) => first - second);
  const position = (sorted.length - 1) * fraction;
  const below = Math.floor(position);
  const above = Math.ceil(position);
  return sorted[below] + (sorted[above] - sorted[below]) * (position - below);
}

/** The middle value: half the values are below it, half above. Unlike the mean, one wild price can't drag it. */
export const median = (values: number[]) => quantile(values, 0.5);
