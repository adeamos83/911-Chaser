"use server";

import { revalidatePath } from "next/cache";
import type { BuildSpec } from "@/data/types";
import { cohort, estimateBuild, fitCohort, priceByYear } from "@/lib/engine";
import { LISTINGS, getPremiumTable } from "@/lib/market";
import { normalizeSpec } from "@/lib/spec";
import { createClient } from "@/lib/supabase/server";
import { MAX_BUILD_NAME_LENGTH } from "@/lib/limits";

// The mileage depreciation rate is shown per 10,000 miles.
const MILES_PER_SLOPE_STEP = 10000;

/** Everything the configurator shows for a spec: price estimate, price-by-year chart, and depreciation rates. */
export async function analyzeSpec(input: BuildSpec, mileage?: number) {
  const spec = normalizeSpec(input);

  const context = { listings: LISTINGS, table: getPremiumTable() };
  const estimate = estimateBuild(spec, context, mileage === undefined ? undefined : { mileage });

  const similarListings = cohort(LISTINGS, spec);
  const fit = fitCohort(similarListings);
  const slopes = { perTenKMiles: fit.perMile * MILES_PER_SLOPE_STEP, perYear: fit.perYear };

  const pricesByYear = priceByYear(LISTINGS, spec);
  return { spec, estimate, priceByYear: pricesByYear, slopes };
}

const cleanBuildName = (name: string) => name.trim().slice(0, MAX_BUILD_NAME_LENGTH);

/** Saves a build to the signed-in user's garage. Returns the new id, or an error message. */
export async function saveBuild(name: string, input: BuildSpec): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to save builds." };

  const cleanName = cleanBuildName(name);
  if (!cleanName) return { error: "Give the build a name." };

  const { data, error } = await supabase
    .from("builds")
    .insert({ user_id: user.id, name: cleanName, spec: normalizeSpec(input) })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/garage");
  return { id: data.id };
}

/** Renames a saved build (form action from the garage page). */
export async function renameBuild(formData: FormData) {
  const id = String(formData.get("id"));
  const name = cleanBuildName(String(formData.get("name") ?? ""));
  if (!name) return;
  const supabase = await createClient();
  await supabase.from("builds").update({ name }).eq("id", id);
  revalidatePath("/garage");
}

/** Deletes a saved build (form action from the garage page). */
export async function deleteBuild(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("builds").delete().eq("id", id);
  revalidatePath("/garage");
}

/** Signs the user out and refreshes every page so the header updates. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
