"use server";

import { revalidatePath } from "next/cache";
import type { BuildSpec } from "@/data/types";
import { cohort, estimateBuild, fitCohort, priceByYear } from "@/lib/engine";
import { LISTINGS, getPremiumTable } from "@/lib/market";
import { normalizeSpec } from "@/lib/spec";
import { createClient } from "@/lib/supabase/server";

/** Everything the configurator shows for a spec: price estimate, price-by-year chart, and depreciation rates. */
export async function analyzeSpec(input: BuildSpec, mileage?: number) {
  const spec = normalizeSpec(input);

  const context = { listings: LISTINGS, table: getPremiumTable() };
  const estimate = estimateBuild(spec, context, mileage === undefined ? undefined : { mileage });

  const fit = fitCohort(cohort(LISTINGS, spec));
  const slopes = { perTenKMiles: fit.perMile * 10000, perYear: fit.perYear };

  return { spec, estimate, priceByYear: priceByYear(LISTINGS, spec), slopes };
}

const MAX_BUILD_NAME_LENGTH = 80;
const cleanBuildName = (name: string) => name.trim().slice(0, MAX_BUILD_NAME_LENGTH);

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

export async function renameBuild(formData: FormData) {
  const id = String(formData.get("id"));
  const name = cleanBuildName(String(formData.get("name") ?? ""));
  if (!name) return;
  const supabase = await createClient();
  await supabase.from("builds").update({ name }).eq("id", id);
  revalidatePath("/garage");
}

export async function deleteBuild(formData: FormData) {
  const supabase = await createClient();
  await supabase.from("builds").delete().eq("id", String(formData.get("id")));
  revalidatePath("/garage");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
