// The deals page keeps its filters in the URL, so every filter is a plain link and every view is shareable.
import { GENERATIONS } from "@/data/catalog";
import type { Generation, Trim } from "@/data/types";

export type SortKey = "best" | "newest" | "price";

export interface DealFilters {
  generation: Generation | "all";
  model: Trim | "all";
  sort: SortKey;
  /** Only show models that are in the user's garage. */
  garageOnly: boolean;
  /** How many rows to show; "Show more" raises it. */
  limit: number;
}

export const ROWS_PER_PAGE = 30;
const SORT_KEYS: SortKey[] = ["best", "newest", "price"];
/** Every model name, from the entry-level Carrera up to the Turbo S. */
export const ALL_MODELS: Trim[] = ["Carrera", "Carrera T", "Carrera S", "Carrera 4S", "GTS", "Turbo", "Turbo S"];

const DEFAULT_FILTERS: DealFilters = { generation: "all", model: "all", sort: "best", garageOnly: false, limit: ROWS_PER_PAGE };

/** Reads the filters out of the URL. Anything missing or unrecognized falls back to the default. */
export function readFilters(params: Record<string, string | string[] | undefined>): DealFilters {
  const read = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const generation = GENERATIONS.find((option) => option === read("gen")) ?? "all";
  const model = ALL_MODELS.find((option) => option === read("model")) ?? "all";
  const sort = SORT_KEYS.find((option) => option === read("sort")) ?? "best";
  const garageOnly = read("garage") === "1";
  const requestedLimit = Number(read("show"));
  const limit = Number.isFinite(requestedLimit) && requestedLimit > 0 ? requestedLimit : ROWS_PER_PAGE;

  return { generation, model, sort, garageOnly, limit };
}

/** A link to the deals page with some filters changed. Only non-default filters go in the URL. */
export function dealsHref(current: DealFilters, changes: Partial<DealFilters>): string {
  // Changing any filter starts the list over from the first page.
  const next: DealFilters = { ...current, limit: ROWS_PER_PAGE, ...changes };
  const params = new URLSearchParams();
  if (next.generation !== DEFAULT_FILTERS.generation) params.set("gen", next.generation);
  if (next.model !== DEFAULT_FILTERS.model) params.set("model", next.model);
  if (next.sort !== DEFAULT_FILTERS.sort) params.set("sort", next.sort);
  if (next.garageOnly) params.set("garage", "1");
  if (next.limit !== ROWS_PER_PAGE) params.set("show", String(next.limit));

  const query = params.toString();
  return query ? `/deals?${query}` : "/deals";
}
