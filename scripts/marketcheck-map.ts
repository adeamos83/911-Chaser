import { COLORS, TRIMS } from "../src/data/catalog";
import type { Body, ColorTier, Listing, Trim } from "../src/data/types";

/* eslint-disable @typescript-eslint/no-explicit-any */

const EXCLUDE = /gt3|gt2|speedster|dakar|sport classic|spirit|anniversary|50 years|exclusive|heritage|^r$|s\/t/i;


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

const SPECIAL = /miami|lava|python|shark|chalk|crayon|lizard|viper|ruby star|riviera|guards red.*heritage/i;
const PTS = /paint to sample|\bpts\b|mexico blue|irish green|signal (orange|green)|voodoo|gulf blue|oslo blue|stone grey|fashion grey|frozen berry|acid green/i;
const METALLIC = /metallic|\bneo\b|carrara white|aventurine|ice grey|night blue|dolomite|vanadium/i;

export function colorFor(raw: string | undefined): { color: string; colorTier: ColorTier } {
  const name = (raw ?? "").replace(/\s+/g, " ").trim();
  const lower = name.toLowerCase().replace(/-/g, " ");
  const tier: ColorTier = PTS.test(lower) ? "PTS" : SPECIAL.test(lower) ? "Special" : METALLIC.test(lower) ? "Metallic" : "Standard";
  const catalog = COLORS.find((c) => {
    const key = c.name.toLowerCase().replace(" (pts)", "");
    return lower.includes(key) || (key === "black" && lower === "black") || (key === "white" && lower === "white");
  });
  if (catalog && (catalog.tier === tier || tier === "Standard")) return { color: catalog.name, colorTier: catalog.tier };
  const pretty = name ? name.toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase()) : "Unknown";
  return { color: pretty, colorTier: tier };
}

export type MappedListing = Omit<Listing, "options"> & { vdpUrl?: string; dom?: number };

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
  if (l.price < 15000 || l.price > spec.baseMsrp * 2.5) return null;
  const body: Body = b.body_type === "Targa" || /targa/i.test(b.version) ? "Targa" : b.body_type === "Convertible" ? "Cabriolet" : "Coupe";
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

const OPTIONAL_FEATURES: Record<string, string> = {
  "4-Wheel Steering": "RAS",
  "Heated/Cooled Seats": "VENT_SEATS",
  "Sun/Moonroof": "SUNROOF",
};

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
  const codes = new Set([...fromFeatures, ...OPTION_PATTERNS.filter(([, re]) => re.test(text)).map(([code]) => code)]);
  if (body !== "Coupe") codes.delete("SUNROOF");
  return [...codes];
}
