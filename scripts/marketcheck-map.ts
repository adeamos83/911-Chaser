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
  const v = version.split("|")[0];
  if (EXCLUDE.test(v)) return null;
  if (/turbo s/i.test(v)) return "Turbo S";
  if (/turbo/i.test(v)) return "Turbo";
  if (/gts/i.test(v)) return "GTS";
  if (/4s/i.test(v)) return "Carrera 4S";
  if (/carrera s\b/i.test(v)) return "Carrera S";
  if (/carrera t\b/i.test(v)) return "Carrera T";
  if (/carrera|targa 4|black edition/i.test(v)) return "Carrera";
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

/**
 * Matches a dealer's paint name to one of our catalog colors when possible.
 * If there's no match (or the tiers disagree), keeps the dealer's name in Title Case.
 */
export function colorFor(raw: string | undefined): { color: string; colorTier: ColorTier } {
  const name = (raw ?? "").replace(/\s+/g, " ").trim();
  const lower = name.toLowerCase().replace(/-/g, " ");
  const tier = colorTierFor(lower);

  const catalogColor = COLORS.find((c) => {
    const key = c.name.toLowerCase().replace(" (pts)", "");
    return lower.includes(key) || (key === "black" && lower === "black") || (key === "white" && lower === "white");
  });
  // A dealer's "Standard" just means we found no tier keywords, so trust the catalog's tier then.
  if (catalogColor && (catalogColor.tier === tier || tier === "Standard")) {
    return { color: catalogColor.name, colorTier: catalogColor.tier };
  }

  const titleCase = name ? name.toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase()) : "Unknown";
  return { color: titleCase, colorTier: tier };
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
export function mapListing(l: any): MappedListing | null {
  const b = l.build ?? {};
  if (!b.year || !b.version || !l.price || l.miles == null) return null;
  const trim = trimFor(b.version);
  if (!trim) return null;
  // Generation comes from each model's own US model-year run: a 2025 Carrera S is still a 992.1,
  // and a 2013 Turbo S is a 997, so it matches nothing and is dropped.
  const spec = TRIMS.find((t) => t.trim === trim && b.year >= t.years[0] && b.year <= t.years[1]);
  if (!spec) return null;
  const generation = spec.generation;
  if (l.price < MIN_PLAUSIBLE_PRICE || l.price > spec.baseMsrp * MAX_PRICE_TO_MSRP) return null;
  const body = bodyFor(b.body_type, b.version);
  return {
    id: l.vin ?? l.id,
    generation,
    modelYear: b.year,
    trim,
    body,
    transmission: b.transmission === "Manual" ? "Manual" : "PDK",
    ...colorFor(l.exterior_color ?? l.base_ext_color),
    mileage: l.miles,
    // MarketCheck's msrp on used listings is usually the asking price, so use the base sticker instead.
    originalMsrp: spec.baseMsrp,
    price: l.price,
    status: "for_sale",
    date: (l.first_seen_at_date ?? "").slice(0, 10),
    vdpUrl: l.vdp_url,
    dom: l.dom,
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

/** Finds option codes from MarketCheck's structured features plus a text search of the dealer's description. */
export function mapOptions(extra: any, body: Body): string[] {
  const fromFeatures = (extra.high_value_features ?? [])
    .filter((f: any) => f.type === "Optional" && OPTIONAL_FEATURES[f.description])
    .map((f: any) => OPTIONAL_FEATURES[f.description]);
  const text = [
    ...(extra.high_value_features ?? []).map((f: any) => f.description ?? ""),
    ...(extra.options_packages ?? []).map((o: any) => (typeof o === "string" ? o : (o.description ?? ""))),
    extra.seller_comments ?? "",
  ]
    .join(" \n ")
    .toLowerCase();
  const fromText = OPTION_PATTERNS.filter(([, pattern]) => pattern.test(text)).map(([code]) => code);

  const codes = new Set([...fromFeatures, ...fromText]);
  return [...codes].filter((code) => optionAvailableOn(code, body));
}
