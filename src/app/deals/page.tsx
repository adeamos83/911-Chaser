import Link from "next/link";
import { GENERATIONS, colorDef, trimsFor } from "@/data/catalog";
import { dealScore } from "@/lib/engine";
import { LISTINGS, getPremiumTable } from "@/lib/market";
import { specFromParams, specToQuery, usd } from "@/lib/spec";

export default async function DealsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const spec = specFromParams(await searchParams);
  const ctx = { listings: LISTINGS, table: getPremiumTable() };

  const deals = LISTINGS.filter((l) => l.status === "for_sale" && l.generation === spec.generation && l.trim === spec.trim)
    .map((l) => {
      const matches = [
        l.transmission === spec.transmission && l.transmission,
        l.body === spec.body && l.body,
        l.color === spec.color && "Your paint",
        ...spec.options.filter((o) => l.options.includes(o)).map((o) => ctx.table.options[o]?.name),
      ].filter(Boolean) as string[];
      return { listing: l, score: dealScore(l, ctx), matches };
    })
    .sort((a, b) => b.score - a.score);

  return (
    <main className="mx-auto max-w-7xl px-5 py-10">
      <p className="eyebrow">For sale now</p>
      <h1 className="mt-2 font-display text-5xl">
        Best deals: {spec.generation} <span className="italic text-accent">{spec.trim}</span>
      </h1>
      <p className="mt-2 max-w-2xl text-muted">
        Every car is priced against what the model expects for its exact year, mileage, gearbox, paint and options. Positive means
        it is listed under market.
      </p>

      <form className="mt-6 flex flex-wrap items-end gap-3 text-sm">
        <label>
          <span className="eyebrow block">Generation</span>
          <select name="g" defaultValue={spec.generation} className="mt-1 rounded-lg border border-line bg-panel px-3 py-2">
            {GENERATIONS.map((g) => <option key={g}>{g}</option>)}
          </select>
        </label>
        <label>
          <span className="eyebrow block">Model</span>
          <select name="t" defaultValue={spec.trim} className="mt-1 rounded-lg border border-line bg-panel px-3 py-2">
            {[...new Set(GENERATIONS.flatMap((g) => trimsFor(g).map((t) => t.trim)))].map((t) => <option key={t}>{t}</option>)}
          </select>
        </label>
        <input type="hidden" name="x" value={spec.transmission} />
        <input type="hidden" name="c" value={spec.color} />
        <input type="hidden" name="o" value={spec.options.join(",")} />
        <button className="rounded-full border border-line px-4 py-2 hover:border-ink">Show deals</button>
        <Link href={`/build?${specToQuery(spec)}`} className="ml-auto text-muted hover:text-ink">← Back to configurator</Link>
      </form>

      {deals.length === 0 ? (
        <p className="mt-10 text-muted">No {spec.generation} {spec.trim} listings for sale right now.</p>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2">
          {deals.map(({ listing: l, score, matches }) => {
            const under = score > 0;
            return (
              <li key={l.id} className="rounded-2xl border border-line bg-panel p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-display text-2xl">
                      {l.modelYear} {l.trim} {l.body}
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm text-muted">
                      <span className="inline-block h-3 w-3 rounded-full border border-white/20" style={{ background: colorDef(l.color)?.hex }} />
                      {l.color} · {l.transmission} · {l.mileage.toLocaleString()} mi
                    </p>
                  </div>
                  <span className={`tabular shrink-0 rounded-full px-3 py-1 text-sm ${under ? "bg-holder/15 text-holder" : "bg-pit/15 text-pit"}`}>
                    {Math.abs(Math.round(score * 100))}% {under ? "under" : "over"}
                  </span>
                </div>
                <div className="tabular mt-4 flex items-baseline gap-3">
                  <span className="text-2xl">{usd(l.price)}</span>
                  <span className="text-sm text-muted">asking</span>
                </div>
                {matches.length > 0 && (
                  <p className="mt-3 text-xs text-muted">
                    Matches your spec: <span className="text-ink">{matches.join(" · ")}</span>
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
