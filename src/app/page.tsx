import Link from "next/link";
import { Car911 } from "@/components/Car911";
import { bangForBuck } from "@/lib/engine";
import { LISTINGS, getPremiumTable } from "@/lib/market";
import { specToQuery, normalizeSpec, usdK } from "@/lib/spec";

export default function Home() {
  const leaders = bangForBuck(LISTINGS).slice(0, 8);
  const opts = Object.values(getPremiumTable().options).sort((a, b) => b.payback - a.payback);
  const best = opts[0];
  const worst = opts.filter((o) => o.msrpCost >= 5000).sort((a, b) => a.payback - b.payback)[0];

  return (
    <main>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(ellipse_at_50%_20%,#2a2620_0%,transparent_60%)]" />
        <div className="relative mx-auto max-w-7xl px-5 pt-16 pb-10">
          <p className="eyebrow rise">991 &amp; 992 · Carrera through Turbo S</p>
          <h1 className="rise mt-4 max-w-5xl font-display text-6xl leading-[0.95] tracking-tight md:text-8xl" style={{ animationDelay: "80ms" }}>
            Build the 911 that <em className="text-accent">holds its value.</em>
          </h1>
          <p className="rise mt-6 max-w-xl text-lg text-muted" style={{ animationDelay: "160ms" }}>
            Spec your car, see what it&apos;s actually listed for at your mileage, which options pay you back, and where the deals are.
          </p>
          <div className="rise mt-8 flex flex-wrap gap-3" style={{ animationDelay: "240ms" }}>
            <Link href="/build" className="rounded-full bg-ink px-6 py-3 font-medium text-bg hover:bg-white">
              Spec your dream 911
            </Link>
            <Link href="/deals" className="rounded-full border border-line px-6 py-3 hover:border-ink">
              Browse deals
            </Link>
          </div>
          <Car911 color="#1d2f6b" className="paint-cycle rise mx-auto mt-6 w-full max-w-5xl" />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-5 pb-24 md:grid-cols-[1.4fr_1fr]">
        <div>
          <p className="eyebrow">Leaderboard</p>
          <h2 className="mt-2 font-display text-4xl">Best value 911 right now</h2>
          <p className="mt-2 text-sm text-muted">Horsepower per $1,000 of median asking price, from {LISTINGS.length.toLocaleString()} real listings.</p>
          <ol className="mt-6 divide-y divide-line border-y border-line">
            {leaders.map((r, i) => (
              <li key={`${r.generation}-${r.trim}`}>
                <Link
                  href={`/build?${specToQuery(normalizeSpec({ generation: r.generation, trim: r.trim }))}`}
                  className="grid grid-cols-[2rem_1fr_auto_auto] items-baseline gap-4 py-3 hover:bg-panel"
                >
                  <span className="tabular text-muted">{String(i + 1).padStart(2, "0")}</span>
                  <span>
                    <span className="text-muted">{r.generation}</span> {r.trim}
                  </span>
                  <span className="tabular text-muted">{r.hp} hp · {usdK(r.medianPrice)}</span>
                  <span className="tabular w-20 text-right font-medium text-accent">{r.hpPerK.toFixed(2)}</span>
                </Link>
              </li>
            ))}
          </ol>
        </div>
        <div className="space-y-4 self-start md:pt-16">
          <div className="rounded-2xl border border-line bg-panel p-6">
            <p className="eyebrow">Best payback · modeled</p>
            <p className="mt-2 font-display text-3xl">{best.name}</p>
            <p className="mt-1 text-muted">
              You get back <span className="text-holder">{Math.round(best.payback * 100)}%</span> of what it cost.
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-panel p-6">
            <p className="eyebrow">Worst big-ticket option · modeled</p>
            <p className="mt-2 font-display text-3xl">{worst.name}</p>
            <p className="mt-1 text-muted">
              ${worst.msrpCost.toLocaleString()} new, <span className="text-pit">{Math.round(worst.payback * 100)}%</span> back at resale.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
