// Formatting helpers shared by every page, so a price or a mileage reads the same everywhere.

/** The typographic minus sign. It's as wide as "+", so signed numbers line up. */
const MINUS_SIGN = "−";

/** 123456.7 -> "$123,457" */
export function formatUsd(amount: number): string {
  const rounded = Math.round(amount);
  return `$${rounded.toLocaleString("en-US")}`;
}

/** 1240 -> "+$1,240", -1240 -> "−$1,240", 0 -> "+$0" */
export function formatSignedUsd(amount: number): string {
  const sign = Math.round(amount) < 0 ? MINUS_SIGN : "+";
  return `${sign}${formatUsd(Math.abs(amount))}`;
}

/** 0.0734 -> "+7.3%", -0.0734 -> "−7.3%" */
export function formatSignedPercent(fraction: number): string {
  const sign = fraction < 0 ? MINUS_SIGN : "+";
  const percent = Math.abs(fraction * 100).toFixed(1);
  return `${sign}${percent}%`;
}

/** 9800 -> "9,800 mi" */
export function formatMiles(miles: number): string {
  const rounded = Math.round(miles);
  return `${rounded.toLocaleString("en-US")} mi`;
}

/** "2026-08-06T10:00:00Z" -> "Aug 6, 2026" */
export function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** "2026-08-06T10:00:00Z" -> "Aug 6" */
export function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** (1, "deal") -> "1 deal", (3, "deal") -> "3 deals" */
export function formatCount(count: number, singularWord: string): string {
  const word = count === 1 ? singularWord : `${singularWord}s`;
  return `${count.toLocaleString("en-US")} ${word}`;
}

/** Text color class for an amount: green when it adds value, red when it costs value, muted at zero. */
export function amountColorClass(amount: number): string {
  const rounded = Math.round(amount);
  if (rounded > 0) return "text-positive";
  if (rounded < 0) return "text-negative";
  return "text-muted";
}
