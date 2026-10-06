"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { trimSpec } from "@/data/catalog";
import type { BuildSpec } from "@/data/types";
import { cohort, estimateBuild, fitCohort, priceByYear } from "@/lib/engine";
import type { StoredBuildSpec } from "@/lib/garage";
import { LISTINGS, getPremiumTable } from "@/lib/market";
import { defaultBuildName, normalizeSpec, type PricedAt } from "@/lib/spec";
import { createClient } from "@/lib/supabase/server";
import { MAX_BUILD_NAME_LENGTH } from "@/lib/limits";

/** Keeps a requested model year inside the years this generation and trim were sold. */
function clampModelYear(spec: BuildSpec, modelYear: number | undefined): number | undefined {
  if (modelYear === undefined) return undefined;
  const years = trimSpec(spec.generation, spec.trim)?.years;
  if (!years) return undefined;
  const [firstYear, lastYear] = years;
  return Math.min(lastYear, Math.max(firstYear, Math.round(modelYear)));
}

/**
 * Everything the configurator shows for a spec: the estimate and its breakdown, the median
 * price by model year, and how much value each extra mile and each older year costs.
 */
export async function analyzeSpec(input: BuildSpec, pricedAt: PricedAt = {}) {
  const spec = normalizeSpec(input);
  const modelYear = clampModelYear(spec, pricedAt.modelYear);

  const context = { listings: LISTINGS, table: getPremiumTable() };
  const estimate = estimateBuild(spec, context, { mileage: pricedAt.mileage, modelYear });

  const fit = fitCohort(cohort(LISTINGS, spec));
  const slopes = { perMile: fit.perMile, perYear: fit.perYear };

  const pricesByYear = priceByYear(LISTINGS, spec);
  return { spec, estimate, priceByYear: pricesByYear, slopes };
}

/**
 * Saves a build to the signed-in user's garage, along with today's estimate so the garage
 * can later show how far its value has moved. Returns the new id, or an error message.
 */
export async function saveBuild(input: BuildSpec, pricedAt: PricedAt): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Log in to save builds." };

  // Price the build on the server, so the saved value can't be tampered with.
  const analysis = await analyzeSpec(input, pricedAt);
  const storedSpec: StoredBuildSpec = {
    ...analysis.spec,
    modelYear: analysis.estimate?.modelYear,
    mileage: analysis.estimate?.mileage,
    savedValue: analysis.estimate?.mid,
  };
  const name = defaultBuildName(analysis.spec).slice(0, MAX_BUILD_NAME_LENGTH);

  const { data, error } = await supabase
    .from("builds")
    .insert({ user_id: user.id, name, spec: storedSpec })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/garage");
  return { id: data.id };
}

/** Deletes a saved build (form action from the garage page). */
export async function deleteBuild(formData: FormData) {
  const id = String(formData.get("id"));
  const supabase = await createClient();
  await supabase.from("builds").delete().eq("id", id);
  revalidatePath("/garage");
}

/** Signs the user out and sends them to the home page. */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
