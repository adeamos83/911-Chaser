/**
 * Turns raw MarketCheck API listings into our Listing shape: works out the trim, generation,
 * body, paint tier and options from the free-text fields dealers fill in.
 */
import { COLORS, TRIMS, optionAvailableOn } from "../src/data/catalog";
import type { Body, ColorTier, Listing, Trim } from "../src/data/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Special and track models we don't price (GT3, Dakar, limited editions...). */
const EXCLUDE = /gt3|gt2|speedster|dakar|sport classic|spirit|anniversary|50 years|exclusive|heritage|^r$|s\/t/i;

/**
 * Reads the trim from MarketCheck's "version" text. Order matters: "Turbo S" must be checked
 * before "Turbo", and "Carrera 4S" before "Carrera S", or the shorter name would match first.
 */
export function trimFor(version: string): Trim | null {
  // MarketCheck sometimes packs extra info after a "|"; only the first part is the version name.
  const versionName = version.split("|")[0];
  if (EXCLUDE.test(versionName)) return null;
  if (/turbo s/i.test(versionName)) return "Turbo S";
  if (/turbo/i.test(versionName)) return "Turbo";
  if (/gts/i.test(versionName)) return "GTS";
  if (/4s/i.test(versionName)) return "Carrera 4S";
  if (/carrera s\b/i.test(versionName)) return "Carrera S";
  if (/carrera t\b/i.test(versionName)) return "Carrera T";
  if (/carrera|targa 4|black edition/i.test(versionName)) return "Carrera";
  return null;
}

// Paint names that tell us the paint tier. Checked in order: PTS, then Special, then Metallic.
const SPECIAL = /miami|lava|python|shark|chalk|crayon|lizard|viper|ruby star|riviera|guards red.*heritage/i;
const PTS = /paint to sample|\bpts\b|mexico blue|irish green|signal (orange|green)|voodoo|gulf blue|oslo blue|stone grey|fashion grey|frozen berry|acid green/i;
const METALLIC = /metallic|\bneo\b|carrara white|aventurine|ice grey|night blue|dolomite|vanadium/i;

function colorTierFor(lowerName: string): ColorTier {
  if (PTS.test(lowerName)) return "PTS";
  if (SPECIAL.test(lowerName)) return "Special";
  if (METALLIC.test(lowerName)) return "Metallic";
  return "Standard";
}

/** True when the dealer's lowercased paint name refers to this catalog color. */
function matchesCatalogColor(lowerName: string, catalogName: string): boolean {
  const key = catalogName.toLowerCase().replace(" (pts)", "");
  if (lowerName.includes(key)) return true;
  // "Black" and "White" only count as an exact match, so "Black Edition" etc. don't slip through.
  const isPlainBlack = key === "black" && lowerName === "black";
  const isPlainWhite = key === "white" && lowerName === "white";
  return isPlainBlack || isPlainWhite;
}

/** "GUARDS red" becomes "Guards Red". */
function toTitleCase(text: string): string {
  return text.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

/**
 * Matches a dealer's paint name to one of our catalog colors when possible.
 * If there's no match (or the tiers disagree), keeps the dealer's name in Title Case.
 */
export function colorFor(rawName: string | undefined): { color: string; colorTier: ColorTier } {
  const name = (rawName ?? "").replace(/\s+/g, " ").trim();
  const lowerName = name.toLowerCase().replace(/-/g, " ");
  const tier = colorTierFor(lowerName);

  const catalogColor = COLORS.find((catalogEntry) => matchesCatalogColor(lowerName, catalogEntry.name));
  // A dealer's "Standard" just means we found no tier keywords, so trust the catalog's tier then.
  if (catalogColor && (catalogColor.tier === tier || tier === "Standard")) {
    return { color: catalogColor.name, colorTier: catalogColor.tier };
  }

  const displayName = name ? toTitleCase(name) : "Unknown";
  return { color: displayName, colorTier: tier };
}

function bodyFor(bodyType: string | undefined, version: string): Body {
  if (bodyType === "Targa" || /targa/i.test(version)) return "Targa";
  if (bodyType === "Convertible") return "Cabriolet";
  return "Coupe";
}

/** Listings priced below this are almost always data errors or salvage cars. */
const MIN_PLAUSIBLE_PRICE = 15000;
/** Listings above this multiple of the base MSRP are almost always data errors or special editions. */
const MAX_PRICE_TO_MSRP = 2.5;

export type MappedListing = Omit<Listing, "options"> & { vdpUrl?: string; dom?: number };

/** Returns null for any listing we can't use (missing data, excluded model, implausible price). */
export function mapListing(rawListing: any): MappedListing | null {
  const build = rawListing.build ?? {};
  const hasRequiredFields = build.year && build.version && rawListing.price && rawListing.miles != null;
  if (!hasRequiredFields) return null;

  const trim = trimFor(build.version);
  if (!trim) return null;

  // Generation comes from each model's own US model-year run: a 2025 Carrera S is still a 992.1,
  // and a 2013 Turbo S is a 997, so it matches nothing and is dropped.
  const spec = TRIMS.find((trimSpec) => {
    const [firstYear, lastYear] = trimSpec.years;
    return trimSpec.trim === trim && build.year >= firstYear && build.year <= lastYear;
  });
  if (!spec) return null;

  const maxPlausiblePrice = spec.baseMsrp * MAX_PRICE_TO_MSRP;
  if (rawListing.price < MIN_PLAUSIBLE_PRICE || rawListing.price > maxPlausiblePrice) return null;

  const transmission = build.transmission === "Manual" ? "Manual" : "PDK";
  const firstSeenDate = (rawListing.first_seen_at_date ?? "").slice(0, 10);
  const { color, colorTier } = colorFor(rawListing.exterior_color ?? rawListing.base_ext_color);

  return {
    id: rawListing.vin ?? rawListing.id,
    generation: spec.generation,
    modelYear: build.year,
    trim,
    body: bodyFor(build.body_type, build.version),
    transmission,
    color,
    colorTier,
    mileage: rawListing.miles,
    // MarketCheck's msrp on used listings is usually the asking price, so use the base sticker instead.
    originalMsrp: spec.baseMsrp,
    price: rawListing.price,
    status: "for_sale",
    date: firstSeenDate,
    vdpUrl: rawListing.vdp_url,
    dom: rawListing.dom,
  };
}

/** Text patterns that mean a listing has an option, matched against the dealer's lowercased text. */
const OPTION_PATTERNS: [string, RegExp][] = [
  ["SPORT_CHRONO", /sport chrono/],
  ["PCCB", /ceramic composite brake|\bpccb\b|ceramic brake/],
  ["PSE", /sport exhaust|\bpse\b/],
  ["FRONT_LIFT", /front axle lift|lift system|front lift|nose lift/],
  ["BUCKETS", /bucket seat/],
  ["RAS", /rear[- ]axle steer/],
  ["AERO", /aerokit|aero kit|sportdesign|sport design/],
  ["PASM_SPORT", /pasm sport|sport chassis|lowered.*(10|20) ?mm/],
  ["LED_MATRIX", /matrix/],
  ["ASS_PLUS", /adaptive sport seats|18[- ]way/],
  ["SUNROOF", /sunroof|moonroof|sliding.*roof/],
  ["BURMESTER", /burmester/],
  ["LEATHER_PKG", /extended leather|leather interior package|full leather/],
  ["COLOR_BELTS", /seat ?belts? in /],
  ["VENT_SEATS", /ventilat/],
  ["PTS", /paint to sample/],
];

/** MarketCheck's own structured feature names that map directly to our option codes. */
const OPTIONAL_FEATURES: Record<string, string> = {
  "4-Wheel Steering": "RAS",
  "Heated/Cooled Seats": "VENT_SEATS",
  "Sun/Moonroof": "SUNROOF",
};

/** Joins every free-text field we search for options into one lowercase string. */
function searchableText(extra: any): string {
  const features: any[] = extra.high_value_features ?? [];
  const optionPackages: any[] = extra.options_packages ?? [];

  const featureDescriptions = features.map((feature) => feature.description ?? "");
  // Option packages come back either as plain strings or as objects with a description.
  const packageDescriptions = optionPackages.map((optionPackage) =>
    typeof optionPackage === "string" ? optionPackage : (optionPackage.description ?? ""),
  );
  const sellerComments = extra.seller_comments ?? "";

  const allText = [...featureDescriptions, ...packageDescriptions, sellerComments].join(" \n ");
  return allText.toLowerCase();
}

/** Finds option codes from MarketCheck's structured features plus a text search of the dealer's description. */
export function mapOptions(extra: any, body: Body): string[] {
  const features: any[] = extra.high_value_features ?? [];
  const optionalFeatures = features.filter(
    (feature) => feature.type === "Optional" && OPTIONAL_FEATURES[feature.description],
  );
  const codesFromFeatures = optionalFeatures.map((feature) => OPTIONAL_FEATURES[feature.description]);

  const text = searchableText(extra);
  const matchingPatterns = OPTION_PATTERNS.filter(([, pattern]) => pattern.test(text));
  const codesFromText = matchingPatterns.map(([code]) => code);

  const uniqueCodes = new Set([...codesFromFeatures, ...codesFromText]);
  return [...uniqueCodes].filter((code) => optionAvailableOn(code, body));
}
