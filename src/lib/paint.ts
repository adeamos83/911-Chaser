import { colorDef } from "@/data/catalog";

/** Used when a listing's paint name gives no clue at all (e.g. "Unknown", "-Select-"). */
export const NEUTRAL_PAINT_HEX = "#8a8b8e";

/**
 * Dealers type paint names freely ("Gt Silver Metallic", "Pts Gulf Blue", "Blu Blue").
 * When a name isn't in our catalog, the first keyword it contains decides the swatch.
 * Order matters: "Ice Grey" must match "ice grey" before the plain "grey".
 */
const PAINT_KEYWORDS: { keyword: string; hex: string }[] = [
  { keyword: "chalk", hex: "#d4d1c8" },
  { keyword: "crayon", hex: "#c7c4ba" },
  { keyword: "ice gr", hex: "#b9bcbe" },
  { keyword: "arctic gr", hex: "#c9cacb" },
  { keyword: "agate", hex: "#5d5e63" },
  { keyword: "slate", hex: "#4f5459" },
  { keyword: "vanadium", hex: "#6d7073" },
  { keyword: "white", hex: "#e9e6df" },
  { keyword: "silver", hex: "#a9abae" },
  { keyword: "grey", hex: "#7c7e82" },
  { keyword: "gray", hex: "#7c7e82" },
  { keyword: "black", hex: "#111214" },
  { keyword: "red", hex: "#c8102e" },
  { keyword: "yellow", hex: "#f0c419" },
  { keyword: "orange", hex: "#e5501e" },
  { keyword: "miami", hex: "#2aa8d8" },
  { keyword: "shark", hex: "#2b80b9" },
  { keyword: "gentian", hex: "#223b6d" },
  { keyword: "night blue", hex: "#1f2a44" },
  { keyword: "blue", hex: "#2f5d8f" },
  { keyword: "python", hex: "#3f7a4f" },
  { keyword: "green", hex: "#3f6b4f" },
  { keyword: "brown", hex: "#5a4636" },
  { keyword: "purple", hex: "#5b4a7a" },
];

/** The swatch color for any paint name, whether it's from our catalog or typed by a dealer. */
export function paintHexFor(colorName: string): string {
  const catalogColor = colorDef(colorName);
  if (catalogColor) return catalogColor.hex;

  const lowerCaseName = colorName.toLowerCase();
  const match = PAINT_KEYWORDS.find((entry) => lowerCaseName.includes(entry.keyword));
  return match ? match.hex : NEUTRAL_PAINT_HEX;
}

/** How see-through the glow behind a car is, as a two-digit hex alpha: "55" is about 33%, "66" about 40%. */
const GLOW_ALPHA = { soft: "55", strong: "66" };

/** "#2b80b9" -> "#2b80b955": the same color, partly see-through, for the glow behind a car. */
export function softGlowColor(hex: string, strength: keyof typeof GLOW_ALPHA = "soft"): string {
  return `${hex}${GLOW_ALPHA[strength]}`;
}
