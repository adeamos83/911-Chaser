import type { Body, ColorDef, Generation, OptionDef, TrimSpec, Trim } from "./types";

export const GENERATIONS: Generation[] = ["991.1", "991.2", "992.1", "992.2"];
export const BODIES: Body[] = ["Coupe", "Cabriolet", "Targa"];
// Shorthand for options and colors offered on every generation.
const ALL: Generation[] = GENERATIONS;

// US model years. Base MSRPs are approximate launch-year figures.
export const TRIMS: TrimSpec[] = [
  { generation: "991.1", trim: "Carrera", years: [2012, 2016], hp: 350, zeroToSixty: 4.4, baseMsrp: 84000, manualAvailable: true },
  { generation: "991.1", trim: "Carrera S", years: [2012, 2016], hp: 400, zeroToSixty: 4.1, baseMsrp: 97000, manualAvailable: true },
  { generation: "991.1", trim: "Carrera 4S", years: [2013, 2016], hp: 400, zeroToSixty: 4.0, baseMsrp: 105000, manualAvailable: true },
  { generation: "991.1", trim: "GTS", years: [2015, 2016], hp: 430, zeroToSixty: 3.8, baseMsrp: 115000, manualAvailable: true },
  { generation: "991.1", trim: "Turbo", years: [2014, 2016], hp: 520, zeroToSixty: 3.2, baseMsrp: 148000, manualAvailable: false },
  { generation: "991.1", trim: "Turbo S", years: [2014, 2016], hp: 560, zeroToSixty: 2.9, baseMsrp: 182000, manualAvailable: false },

  { generation: "991.2", trim: "Carrera", years: [2017, 2019], hp: 370, zeroToSixty: 4.2, baseMsrp: 90000, manualAvailable: true },
  { generation: "991.2", trim: "Carrera T", years: [2018, 2019], hp: 370, zeroToSixty: 4.3, baseMsrp: 102000, manualAvailable: true },
  { generation: "991.2", trim: "Carrera S", years: [2017, 2019], hp: 420, zeroToSixty: 3.9, baseMsrp: 104000, manualAvailable: true },
  { generation: "991.2", trim: "Carrera 4S", years: [2017, 2019], hp: 420, zeroToSixty: 3.8, baseMsrp: 112000, manualAvailable: true },
  { generation: "991.2", trim: "GTS", years: [2017, 2019], hp: 450, zeroToSixty: 3.6, baseMsrp: 122000, manualAvailable: true },
  { generation: "991.2", trim: "Turbo", years: [2017, 2019], hp: 540, zeroToSixty: 2.9, baseMsrp: 160000, manualAvailable: false },
  { generation: "991.2", trim: "Turbo S", years: [2017, 2019], hp: 580, zeroToSixty: 2.8, baseMsrp: 191000, manualAvailable: false },

  { generation: "992.1", trim: "Carrera", years: [2020, 2024], hp: 379, zeroToSixty: 4.0, baseMsrp: 99000, manualAvailable: false },
  { generation: "992.1", trim: "Carrera T", years: [2023, 2024], hp: 379, zeroToSixty: 4.3, baseMsrp: 107000, manualAvailable: true },
  { generation: "992.1", trim: "Carrera S", years: [2020, 2025], hp: 443, zeroToSixty: 3.5, baseMsrp: 114000, manualAvailable: true },
  { generation: "992.1", trim: "Carrera 4S", years: [2020, 2025], hp: 443, zeroToSixty: 3.4, baseMsrp: 121000, manualAvailable: true },
  { generation: "992.1", trim: "GTS", years: [2022, 2024], hp: 473, zeroToSixty: 3.2, baseMsrp: 136000, manualAvailable: true },
  { generation: "992.1", trim: "Turbo", years: [2021, 2025], hp: 572, zeroToSixty: 2.7, baseMsrp: 171000, manualAvailable: false },
  { generation: "992.1", trim: "Turbo S", years: [2021, 2025], hp: 640, zeroToSixty: 2.6, baseMsrp: 204000, manualAvailable: false },

  { generation: "992.2", trim: "Carrera", years: [2025, 2026], hp: 388, zeroToSixty: 3.9, baseMsrp: 120000, manualAvailable: false },
  { generation: "992.2", trim: "Carrera T", years: [2025, 2026], hp: 388, zeroToSixty: 4.3, baseMsrp: 135000, manualAvailable: true },
  { generation: "992.2", trim: "Carrera S", years: [2026, 2026], hp: 473, zeroToSixty: 3.3, baseMsrp: 140000, manualAvailable: false },
  { generation: "992.2", trim: "Carrera 4S", years: [2026, 2026], hp: 473, zeroToSixty: 3.2, baseMsrp: 148000, manualAvailable: false },
  { generation: "992.2", trim: "GTS", years: [2025, 2026], hp: 532, zeroToSixty: 2.9, baseMsrp: 165000, manualAvailable: false },
  { generation: "992.2", trim: "Turbo S", years: [2026, 2026], hp: 701, zeroToSixty: 2.4, baseMsrp: 270300, manualAvailable: false },
];

export const OPTIONS: OptionDef[] = [
  { code: "PTS", name: "Paint to Sample", category: "Exterior", msrpCost: 11000, generations: ALL },
  { code: "SPORT_CHRONO", name: "Sport Chrono Package", category: "Performance", msrpCost: 2700, generations: ALL },
  { code: "PSE", name: "Sport Exhaust (PSE)", category: "Performance", msrpCost: 3000, generations: ALL },
  { code: "FRONT_LIFT", name: "Front Axle Lift", category: "Chassis", msrpCost: 2800, generations: ALL },
  { code: "BUCKETS", name: "Full Bucket Seats", category: "Interior", msrpCost: 5900, generations: ALL, excludes: ["ASS_PLUS", "VENT_SEATS"] },
  { code: "RAS", name: "Rear-Axle Steering", category: "Chassis", msrpCost: 2100, generations: ALL },
  { code: "AERO", name: "Sport Design / Aero Kit", category: "Exterior", msrpCost: 4600, generations: ALL },
  { code: "PASM_SPORT", name: "PASM Sport Suspension", category: "Chassis", msrpCost: 1500, generations: ALL },
  { code: "LED_MATRIX", name: "LED Matrix Headlights", category: "Exterior", msrpCost: 2700, generations: ALL },
  { code: "ASS_PLUS", name: "Adaptive Sport Seats Plus", category: "Interior", msrpCost: 3400, generations: ALL, excludes: ["BUCKETS"] },
  { code: "SUNROOF", name: "Sunroof", category: "Exterior", msrpCost: 1900, generations: ALL, bodies: ["Coupe"] },
  { code: "PCCB", name: "PCCB Ceramic Brakes", category: "Performance", msrpCost: 9100, generations: ALL },
  { code: "BURMESTER", name: "Burmester Audio", category: "Tech", msrpCost: 5800, generations: ALL },
  { code: "LEATHER_PKG", name: "Extended Leather Package", category: "Interior", msrpCost: 4500, generations: ALL },
  { code: "COLOR_BELTS", name: "Colored Seatbelts", category: "Interior", msrpCost: 500, generations: ALL },
  { code: "VENT_SEATS", name: "Ventilated Seats", category: "Interior", msrpCost: 1000, generations: ALL, excludes: ["BUCKETS"] },
];

// Hex values match the 911 Chaser design palette, tuned so the tinted car photo reads correctly.
export const COLORS: ColorDef[] = [
  { name: "Black", hex: "#111214", tier: "Standard", generations: ALL },
  { name: "White", hex: "#e9e6df", tier: "Standard", generations: ALL },
  { name: "Guards Red", hex: "#c8102e", tier: "Standard", generations: ALL },
  { name: "Racing Yellow", hex: "#f0c419", tier: "Standard", generations: ALL },
  { name: "GT Silver", hex: "#a9abae", tier: "Metallic", generations: ALL },
  { name: "Agate Grey", hex: "#5d5e63", tier: "Metallic", generations: ALL },
  { name: "Jet Black", hex: "#1c1d20", tier: "Metallic", generations: ALL },
  { name: "Gentian Blue", hex: "#223b6d", tier: "Metallic", generations: ["992.1", "992.2"] },
  { name: "Miami Blue", hex: "#2aa8d8", tier: "Special", generations: ["991.2", "992.1", "992.2"] },
  { name: "Lava Orange", hex: "#e5501e", tier: "Special", generations: ["991.2", "992.1"] },
  { name: "Python Green", hex: "#3f7a4f", tier: "Special", generations: ["992.1", "992.2"] },
  { name: "Shark Blue", hex: "#2b80b9", tier: "Special", generations: ["992.1", "992.2"] },
  { name: "Chalk", hex: "#d4d1c8", tier: "Special", generations: ["991.2", "992.1", "992.2"] },
  { name: "Mexico Blue (PTS)", hex: "#1D5DA8", tier: "PTS", generations: ALL },
  { name: "Irish Green (PTS)", hex: "#1F4D35", tier: "PTS", generations: ALL },
  { name: "Signal Orange (PTS)", hex: "#F2701D", tier: "PTS", generations: ALL },
];

export function trimsFor(generation: Generation): TrimSpec[] {
  return TRIMS.filter((trimEntry) => trimEntry.generation === generation);
}

export function trimSpec(generation: Generation, trim: Trim): TrimSpec | undefined {
  return TRIMS.find((trimEntry) => trimEntry.generation === generation && trimEntry.trim === trim);
}

/** Targa is AWD only: Targa 4 (filed under Carrera), Targa 4S and Targa 4 GTS. Turbos ship as Coupe/Cab. */
export function bodiesFor(trim: Trim): Body[] {
  if (trim === "Carrera" || trim === "Carrera 4S" || trim === "GTS") return BODIES;
  return ["Coupe", "Cabriolet"];
}

export function colorsFor(generation: Generation): ColorDef[] {
  return COLORS.filter((color) => color.generations.includes(generation));
}

export function colorDef(name: string): ColorDef | undefined {
  return COLORS.find((color) => color.name === name);
}

export function optionDef(code: string): OptionDef | undefined {
  return OPTIONS.find((option) => option.code === code);
}

/** True when two options can't be on the same car, e.g. full bucket seats and ventilated seats. */
export function optionsConflict(firstCode: string, secondCode: string): boolean {
  return !!optionDef(firstCode)?.excludes?.includes(secondCode) || !!optionDef(secondCode)?.excludes?.includes(firstCode);
}

/** Some options only exist on certain bodies (e.g. the sunroof is Coupe only). */
export function optionAvailableOn(code: string, body: Body): boolean {
  const bodies = optionDef(code)?.bodies;
  return !bodies || bodies.includes(body);
}
