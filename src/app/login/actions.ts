"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MIN_PASSWORD_LENGTH } from "@/lib/limits";

export interface AuthState {
  error?: string;
}

/** Where members land after logging in, unless the page sent them somewhere specific. */
const DEFAULT_AFTER_LOGIN = "/build";

/** Only allow redirects to paths on this site ("/x", not "//evil.com"). Falls back to Configure. */
function safeNext(value: FormDataEntryValue | null) {
  const next = String(value ?? "");
  return next.startsWith("/") && !next.startsWith("//") ? next : DEFAULT_AFTER_LOGIN;
}

/** Logs in or creates an account with email and password, then redirects to the `next` page. */
export async function authenticate(_previousState: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const mode = formData.get("mode") === "signup" ? "signup" : "login";
  if (!email || password.length < MIN_PASSWORD_LENGTH) {
    return { error: `Enter an email and a password of at least ${MIN_PASSWORD_LENGTH} characters.` };
  }

  const supabase = await createClient();
  let errorMessage: string | undefined;
  if (mode === "signup") {
    const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
    errorMessage = error?.message;
  } else {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    errorMessage = error?.message;
  }
  if (errorMessage) return { error: errorMessage };

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next")));
}
