import { OPTIONS, bodiesFor, colorDef, colorsFor, trimSpec, trimsFor } from "@/data/catalog";
import type { BuildSpec, Generation, Trim } from "@/data/types";
import { GENERATIONS } from "@/data/catalog";

export const DEFAULT_SPEC: BuildSpec = {
  generation: "992.1",
  trim: "Carrera S",
  body: "Coupe",
  transmission: "Manual",
  color: "Gentian Blue",
  options: ["SPORT_CHRONO", "PSE"],
};

/** Snap any spec onto a combination Porsche actually built. */
export function normalizeSpec(input: Partial<BuildSpec>): BuildSpec {
  const generation = GENERATIONS.includes(input.generation as Generation)
    ? (input.generation as Generation)
    : DEFAULT_SPEC.generation;
  const trims = trimsFor(generation);
  const trim = trims.find((t) => t.trim === input.trim)?.trim ?? trims.find((t) => t.trim === "Carrera S")?.trim ?? trims[0].trim;
  const bodies = bodiesFor(trim);
  const body = bodies.includes(input.body as BuildSpec["body"]) ? (input.body as BuildSpec["body"]) : "Coupe";
  const manualOk = trimSpec(generation, trim)?.manualAvailable ?? false;
  const transmission = input.transmission === "Manual" && manualOk ? "Manual" : "PDK";
  const colors = colorsFor(generation);
  const color = colors.find((c) => c.name === input.color)?.name ?? colors[0].name;
  const isPts = colorDef(color)?.tier === "PTS";
  const options = OPTIONS.filter((o) => {
    if (o.code === "PTS") return isPts;
    if (o.bodies && !o.bodies.includes(body)) return false;
    return (input.options ?? []).includes(o.code);
  }).map((o) => o.code);
  return { generation, trim, body, transmission, color, options };
}

export function specToQuery(spec: BuildSpec): string {
  const p = new URLSearchParams({
    g: spec.generation,
    t: spec.trim,
    b: spec.body,
    x: spec.transmission,
    c: spec.color,
    o: spec.options.join(","),
  });
  return p.toString();
}

export function specFromParams(params: Record<string, string | string[] | undefined>): BuildSpec {
  const get = (k: string) => (Array.isArray(params[k]) ? params[k]![0] : (params[k] as string | undefined));
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

export function defaultBuildName(spec: BuildSpec) {
  return `${spec.generation} ${spec.trim} in ${spec.color.replace(" (PTS)", "")}`;
}

export const usd = (n: number) =>
  n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export const usdK = (n: number) => `$${Math.round(n / 1000)}K`;
