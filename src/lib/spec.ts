import { GENERATIONS, OPTIONS, bodiesFor, colorDef, colorsFor, optionAvailableOn, trimSpec, trimsFor } from "@/data/catalog";
import type { BuildSpec, Generation, Trim } from "@/data/types";

/** The build shown when the page opens with no spec in the URL. */
export const DEFAULT_SPEC: BuildSpec = {
  generation: "992.1",
  trim: "Carrera S",
  body: "Coupe",
  transmission: "Manual",
  color: "Gentian Blue",
  options: ["SPORT_CHRONO", "PSE"],
};

/**
 * Snap any spec onto a combination Porsche actually built. Each choice depends on the one
 * before it, so they're resolved in order: generation, trim, body, gearbox, paint, options.
 * Anything invalid falls back to a sensible default.
 */
export function normalizeSpec(input: Partial<BuildSpec>): BuildSpec {
  const generation = GENERATIONS.includes(input.generation as Generation)
    ? (input.generation as Generation)
    : DEFAULT_SPEC.generation;

  const trim = pickTrim(generation, input.trim);
  const requestedBody = input.body as BuildSpec["body"];
  const body = bodiesFor(trim).includes(requestedBody) ? requestedBody : "Coupe";

  const manualAvailable = trimSpec(generation, trim)?.manualAvailable ?? false;
  const transmission = input.transmission === "Manual" && manualAvailable ? "Manual" : "PDK";

  const colors = colorsFor(generation);
  const color = colors.find((colorOption) => colorOption.name === input.color)?.name ?? colors[0].name;

  // The PTS option is never picked by hand: it's on exactly when the paint is Paint to Sample.
  const isPaintToSample = colorDef(color)?.tier === "PTS";
  const requested = input.options ?? [];
  const options = OPTIONS.filter((option) => {
    if (option.code === "PTS") return isPaintToSample;
    return optionAvailableOn(option.code, body) && requested.includes(option.code);
  }).map((option) => option.code);

  return { generation, trim, body, transmission, color, options };
}

/** Keep the requested trim if this generation has it; otherwise prefer Carrera S, then the first trim. */
function pickTrim(generation: Generation, requested: Trim | undefined): Trim {
  const available = trimsFor(generation).map((trimInfo) => trimInfo.trim);
  if (requested && available.includes(requested)) return requested;
  if (available.includes("Carrera S")) return "Carrera S";
  return available[0];
}

/** URL query keys: g=generation, t=trim, b=body, x=transmission, c=color, o=options (comma separated). */
export function specToQuery(spec: BuildSpec): string {
  const params = new URLSearchParams({
    g: spec.generation,
    t: spec.trim,
    b: spec.body,
    x: spec.transmission,
    c: spec.color,
    o: spec.options.join(","),
  });
  return params.toString();
}

/** Reads a spec back out of the URL query (the reverse of `specToQuery`). */
export function specFromParams(params: Record<string, string | string[] | undefined>): BuildSpec {
  // Next.js gives an array when a key repeats in the URL; we only use the first value.
  const get = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  if (!get("g")) return DEFAULT_SPEC;
  return normalizeSpec({
    generation: get("g") as Generation,
    trim: get("t") as Trim,
    body: get("b") as BuildSpec["body"],
    transmission: get("x") as BuildSpec["transmission"],
    color: get("c"),
    options: (get("o") ?? "").split(",").filter(Boolean),
  });
}

/** A readable name for a saved build, e.g. "992.1 Carrera S in Chalk". */
export function defaultBuildName(spec: BuildSpec) {
  return `${spec.generation} ${spec.trim} in ${spec.color.replace(" (PTS)", "")}`;
}

/** 123456.7 -> "$123,457" */
export const usd = (amount: number) =>
  amount.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

/** 98765 -> "$99K" */
export const usdK = (amount: number) => `$${Math.round(amount / 1000)}K`;
