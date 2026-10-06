"use server";

import { revalidatePath } from "next/cache";
import type { BuildSpec } from "@/data/types";
import { cohort, estimateBuild, fitCohort, priceByYear } from "@/lib/engine";
import { LISTINGS, getPremiumTable } from "@/lib/market";
import { normalizeSpec } from "@/lib/spec";
import { createClient } from "@/lib/supabase/server";

export async function analyzeSpec(input: BuildSpec, mileage?: number) {
  const spec = normalizeSpec(input);
  return {
    spec,
    estimate: estimateBuild(spec, { listings: LISTINGS, table: getPremiumTable() }, mileage === undefined ? undefined : { mileage }),
    priceByYear: priceByYear(LISTINGS, spec),
    slopes: (({ perMile, perYear }) => ({ perTenKMiles: perMile * 10000, perYear }))(fitCohort(cohort(LISTINGS, spec))),
  };
}

export async function saveBuild(name: string, input: BuildSpec): Promise<{ error?: string; id?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to save builds." };

  const trimmed = name.trim().slice(0, 80);
  if (!trimmed) return { error: "Give the build a name." };

  const { data, error } = await supabase
    .from("builds")
    .insert({ user_id: user.id, name: trimmed, spec: normalizeSpec(input) })
    .select("id")
    .single();
  if (error) return { error: error.message };
  revalidatePath("/garage");
  return { id: data.id };
}

export async function renameBuild(formData: FormData) {
  const id = String(formData.get("id"));
  const name = String(formData.get("name") ?? "").trim().slice(0, 80);
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
