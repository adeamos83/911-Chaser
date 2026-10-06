import Link from "next/link";
import { redirect } from "next/navigation";
import { colorDef } from "@/data/catalog";
import type { BuildSpec } from "@/data/types";
import { Car911 } from "@/components/Car911";
import { estimateBuild } from "@/lib/engine";
import { LISTINGS, getPremiumTable } from "@/lib/market";
import { normalizeSpec, specToQuery, usd } from "@/lib/spec";
import { createClient } from "@/lib/supabase/server";
import { deleteBuild, renameBuild } from "../actions";

export default async function GaragePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/garage");

  const { data: builds, error } = await supabase
    .from("builds")
    .select("id, name, spec, created_at")
    .order("created_at", { ascending: false });

  const ctx = { listings: LISTINGS, table: getPremiumTable() };

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <p className="eyebrow">{user.email}</p>
      <h1 className="mt-2 font-display text-5xl">Your garage</h1>
      {error && <p className="mt-4 text-pit">Couldn&apos;t load builds: {error.message}</p>}

      {builds?.length === 0 && (
        <div className="mt-10 rounded-2xl border border-dashed border-line p-10 text-center">
          <p className="text-muted">No saved builds yet.</p>
          <Link href="/build" className="mt-4 inline-block rounded-full bg-ink px-5 py-2.5 font-medium text-bg">
            Spec your first 911
          </Link>
        </div>
      )}

      <ul className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {builds?.map((b) => {
          const spec = normalizeSpec(b.spec as BuildSpec);
          const est = estimateBuild(spec, ctx);
          return (
            <li key={b.id} className="flex flex-col rounded-2xl border border-line bg-panel p-5">
              <Car911 color={colorDef(spec.color)?.hex ?? "#888"} className="w-full" />
              <form action={renameBuild} className="mt-2 flex gap-2">
                <input type="hidden" name="id" value={b.id} />
                <input
                  name="name"
                  defaultValue={b.name}
                  maxLength={80}
                  aria-label="Build name"
                  className="min-w-0 flex-1 border-b border-transparent bg-transparent font-display text-2xl outline-none hover:border-line focus:border-accent"
                />
                <button className="text-xs text-muted hover:text-ink">Rename</button>
              </form>
              <p className="mt-1 text-sm text-muted">
                {spec.generation} {spec.trim} {spec.body} · {spec.transmission} · {spec.color} · {spec.options.length} options
              </p>
              {est && <p className="tabular mt-3 text-xl">{usd(est.mid)} <span className="text-sm text-muted">typical asking at {Math.round(est.mileage / 1000)}K mi</span></p>}
              <div className="mt-auto flex items-center gap-4 pt-5 text-sm">
                <Link href={`/build?${specToQuery(spec)}`} className="rounded-full bg-ink px-4 py-2 font-medium text-bg hover:bg-white">Open</Link>
                <Link href={`/deals?${specToQuery(spec)}`} className="text-muted hover:text-ink">Deals</Link>
                <form action={deleteBuild} className="ml-auto">
                  <input type="hidden" name="id" value={b.id} />
                  <button className="text-pit/80 hover:text-pit">Delete</button>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
