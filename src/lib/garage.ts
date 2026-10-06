import type { BuildSpec } from "@/data/types";
import { normalizeSpec } from "@/lib/spec";
import { createClient } from "@/lib/supabase/server";

/**
 * What we store in the `spec` column of a saved build. On top of the spec itself it keeps
 * the model year and mileage the build was priced at, and the estimate on the day it was saved.
 * Builds saved before these fields existed simply don't have them.
 */
export interface StoredBuildSpec extends BuildSpec {
  modelYear?: number;
  mileage?: number;
  /** Our estimate on the day the build was saved, so the garage can show how far it has moved. */
  savedValue?: number;
}

export interface SavedBuild {
  id: string;
  name: string;
  /** ISO timestamp, e.g. "2026-08-06T10:00:00Z". */
  createdAt: string;
  spec: BuildSpec;
  modelYear?: number;
  mileage?: number;
  savedValue?: number;
}

interface BuildRow {
  id: string;
  name: string;
  spec: StoredBuildSpec;
  created_at: string;
}

/** Turns a database row into a SavedBuild, snapping the spec onto a combination Porsche actually built. */
function readSavedBuild(row: BuildRow): SavedBuild {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    spec: normalizeSpec(row.spec),
    modelYear: row.spec.modelYear,
    mileage: row.spec.mileage,
    savedValue: row.spec.savedValue,
  };
}

/** The signed-in user's saved builds, newest first. Signed-out visitors get an empty list. */
export async function loadSavedBuilds(): Promise<{ builds: SavedBuild[]; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("builds")
    .select("id, name, spec, created_at")
    .order("created_at", { ascending: false });

  if (error) return { builds: [], error: error.message };
  const rows = (data ?? []) as BuildRow[];
  return { builds: rows.map(readSavedBuild) };
}

/** The signed-in user, or null for visitors. */
export async function getSignedInUser() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return data.user;
}
