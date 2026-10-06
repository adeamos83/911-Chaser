export type Generation = "991.1" | "991.2" | "992.1" | "992.2";
export type Trim =
  | "Carrera"
  | "Carrera T"
  | "Carrera S"
  | "Carrera 4S"
  | "GTS"
  | "Turbo"
  | "Turbo S";
export type Body = "Coupe" | "Cabriolet" | "Targa";
export type Transmission = "Manual" | "PDK";
export type ColorTier = "Standard" | "Metallic" | "Special" | "PTS";
export type OptionCategory = "Performance" | "Chassis" | "Interior" | "Exterior" | "Tech";

export interface TrimSpec {
  generation: Generation;
  trim: Trim;
  years: [number, number];
  hp: number;
  zeroToSixty: number;
  baseMsrp: number;
  manualAvailable: boolean;
}

export interface OptionDef {
  code: string;
  name: string;
  category: OptionCategory;
  msrpCost: number;
  generations: Generation[];
  /** Coupe-only options (e.g. sunroof). */
  bodies?: Body[];
  /** Options that can't be fitted alongside this one (e.g. two kinds of seat). Picking one drops the others. */
  excludes?: string[];
}

export interface ColorDef {
  name: string;
  hex: string;
  tier: ColorTier;
  generations: Generation[];
}

export interface Listing {
  id: string;
  generation: Generation;
  modelYear: number;
  trim: Trim;
  body: Body;
  transmission: Transmission;
  color: string;
  colorTier: ColorTier;
  mileage: number;
  options: string[];
  originalMsrp: number;
  price: number;
  status: "sold" | "for_sale";
  date: string;
  /** False when we only have the listing, not its option sheet. */
  optionsKnown?: boolean;
  /** Porsche factory option codes from MarketCheck (see factoryCodes.ts). Often incomplete. */
  factoryCodes?: string[];
  vdpUrl?: string;
  dom?: number;
}

export interface BuildSpec {
  generation: Generation;
  trim: Trim;
  body: Body;
  transmission: Transmission;
  color: string;
  options: string[];
  /** For listing colors outside the catalog. */
  colorTier?: ColorTier;
}
