"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BODIES, GENERATIONS, bodiesFor, colorDef, colorsFor, trimSpec, trimsFor } from "@/data/catalog";
import type { BuildSpec, ColorTier } from "@/data/types";
import { Car911 } from "@/components/Car911";
import type { OptionValue, ValueTier } from "@/lib/engine";
import { defaultBuildName, normalizeSpec, specToQuery, usd, usdK } from "@/lib/spec";
import { analyzeSpec, saveBuild } from "../actions";

type Analysis = Awaited<ReturnType<typeof analyzeSpec>>;

interface Props {
  initialSpec: BuildSpec;
  initialAnalysis: Analysis;
  optionValues: OptionValue[];
  signedIn: boolean;
}

const TIERS: { tier: ValueTier; blurb: string; color: string }[] = [
  { tier: "Value Holder", blurb: "Recovers 80%+ of its cost at resale", color: "var(--holder)" },
  { tier: "Neutral", blurb: "Recovers 30 to 80%", color: "var(--neutral)" },
  { tier: "Money Pit", blurb: "Recovers under 30%", color: "var(--pit)" },
];

const COLOR_TIERS: ColorTier[] = ["Standard", "Metallic", "Special", "PTS"];

export function Configurator({ initialSpec, initialAnalysis, optionValues, signedIn }: Props) {
  const [spec, setSpec] = useState(initialSpec);
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [mileage, setMileage] = useState<number | undefined>(undefined);
  const [pending, startTransition] = useTransition();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    window.history.replaceState(null, "", `/build?${specToQuery(spec)}`);
    const t = setTimeout(() => startTransition(async () => setAnalysis(await analyzeSpec(spec, mileage))), 120);
    return () => clearTimeout(t);
  }, [spec, mileage]);

  const update = (patch: Partial<BuildSpec>) => {
    if (patch.generation || patch.trim) setMileage(undefined);
    setSpec((s) => normalizeSpec({ ...s, ...patch }));
  };
  const toggleOption = (code: string) =>
    update({ options: spec.options.includes(code) ? spec.options.filter((o) => o !== code) : [...spec.options, code] });

  const paint = colorDef(spec.color)!;
  const trim = trimSpec(spec.generation, spec.trim)!;
  const est = analysis.estimate;

  return (
    <main className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-[1.15fr_1fr]" style={{ ["--accent" as string]: `color-mix(in oklab, ${paint.hex} 65%, #f2efea)` }}>
      <section className="lg:sticky lg:top-20 lg:self-start">
        <p className="eyebrow">Configurator</p>
        <h1 className="mt-2 font-display text-5xl leading-none">
          {spec.generation} <span className="italic text-accent">{spec.trim}</span>
        </h1>
        <p className="mt-2 text-sm text-muted">
          {trim.hp} hp · 0-60 in {trim.zeroToSixty}s · {trim.years[0]}-{trim.years[1]} · {usdK(trim.baseMsrp)} base MSRP
        </p>

        <Car911 color={paint.hex} className="mt-4 w-full" />
        <p className="text-center text-sm text-muted">
          {paint.name} <span className="eyebrow ml-2">{paint.tier}</span>
        </p>

        <div className="mt-6 space-y-5">
          <Row label="Generation">
            {GENERATIONS.map((g) => (
              <Seg key={g} active={spec.generation === g} onClick={() => update({ generation: g })}>{g}</Seg>
            ))}
          </Row>
          <Row label="Model">
            {trimsFor(spec.generation).map((t) => (
              <Seg key={t.trim} active={spec.trim === t.trim} onClick={() => update({ trim: t.trim })}>{t.trim}</Seg>
            ))}
          </Row>
          <Row label="Body">
            {BODIES.map((b) => {
              const ok = bodiesFor(spec.trim).includes(b);
              return (
                <Seg key={b} active={spec.body === b} disabled={!ok} title={ok ? undefined : "Targa is AWD only (4S, GTS)"} onClick={() => update({ body: b })}>
                  {b}
                </Seg>
              );
            })}
          </Row>
          <Row label="Gearbox">
            {(["Manual", "PDK"] as const).map((x) => {
              const ok = x === "PDK" || trim.manualAvailable;
              return (
                <Seg key={x} active={spec.transmission === x} disabled={!ok} title={ok ? undefined : `No manual for the ${spec.generation} ${spec.trim}`} onClick={() => update({ transmission: x })}>
                  {x}
                </Seg>
              );
            })}
          </Row>
          <div>
            <p className="eyebrow mb-2">Paint</p>
            <div className="space-y-2">
              {COLOR_TIERS.map((tier) => {
                const colors = colorsFor(spec.generation).filter((c) => c.tier === tier);
                if (!colors.length) return null;
                return (
                  <div key={tier} className="flex items-center gap-3">
                    <span className="w-20 text-xs text-muted">{tier}</span>
                    <div className="flex flex-wrap gap-2">
                      {colors.map((c) => (
                        <button
                          key={c.name}
                          title={c.name}
                          aria-label={c.name}
                          onClick={() => update({ color: c.name })}
                          className={`h-7 w-7 rounded-full border transition ${spec.color === c.name ? "scale-110 ring-2 ring-ink ring-offset-2 ring-offset-bg" : "border-white/20 hover:scale-110"}`}
                          style={{ background: c.hex }}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-8">
        <div className="rounded-2xl border border-line bg-panel p-6">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Estimated asking price</p>
            {est && <ConfidencePill level={est.confidence} />}
          </div>
          {est ? (
            <>
              <p className={`tabular mt-3 font-display text-6xl transition-opacity ${pending ? "opacity-40" : ""}`}>{usd(est.mid)}</p>
              <p className="tabular mt-1 text-muted">
                Typical range {usd(est.low)} to {usd(est.high)} at {Math.round(est.mileage / 1000)}K miles
              </p>
              <p className="mt-1 text-xs text-muted">
                Based on {est.sample} real {spec.generation} {spec.trim} listings (MarketCheck, Oct 2026). Typical car in this set has{" "}
                {Math.round(est.medianMileage / 1000)}K miles.
              </p>
              <label className="mt-5 block">
                <span className="flex justify-between text-xs text-muted">
                  <span className="eyebrow">Mileage</span>
                  <span className="tabular">
                    {est.mileage.toLocaleString()} mi
                    {mileage !== undefined && (
                      <button type="button" onClick={() => setMileage(undefined)} className="ml-2 underline hover:text-ink">
                        reset to typical
                      </button>
                    )}
                  </span>
                </span>
                <input
                  type="range"
                  min={0}
                  max={120000}
                  step={1000}
                  value={mileage ?? est.medianMileage}
                  onChange={(e) => setMileage(Number(e.target.value))}
                  className="mt-2 w-full accent-[var(--accent)]"
                />
              </label>
            </>
          ) : (
            <p className="mt-3 text-muted">Not enough market data for this spec.</p>
          )}
          <div className="mt-5 flex flex-wrap gap-3">
            <SaveButton spec={spec} signedIn={signedIn} />
            <Link href={`/deals?${specToQuery(spec)}`} className="rounded-full border border-line px-5 py-2.5 text-sm hover:border-ink">
              Best deals for this spec →
            </Link>
          </div>
        </div>

        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="eyebrow">Options · what you get back at resale</p>
            <span className="rounded-full border border-neutral/60 px-2.5 py-0.5 text-xs text-neutral">Modeled, not yet measured</span>
          </div>
          <p className="mt-2 text-xs text-muted">
            Payback figures come from a modeled dataset built on 911 market knowledge. Real listings rarely include a reliable
            option sheet, so measuring this from live data is the next step.
          </p>
          <div className="mt-3 space-y-6">
            {TIERS.map(({ tier, blurb, color }) => {
              const rows = optionValues.filter((o) => o.tier === tier && (o.code !== "SUNROOF" || spec.body === "Coupe")).sort((a, b) => b.payback - a.payback);
              return (
                <div key={tier}>
                  <div className="flex items-baseline gap-3 border-b border-line pb-2">
                    <h3 className="font-display text-2xl" style={{ color }}>{tier}</h3>
                    <span className="text-xs text-muted">{blurb}</span>
                  </div>
                  <ul>
                    {rows.map((o) => {
                      const checked = spec.options.includes(o.code);
                      const locked = o.code === "PTS";
                      return (
                        <li key={o.code}>
                          <label className={`grid cursor-pointer grid-cols-[1.25rem_1fr_7rem_3.5rem] items-center gap-3 py-2.5 ${locked ? "cursor-default opacity-70" : ""}`}>
                            <input type="checkbox" checked={checked} disabled={locked} onChange={() => toggleOption(o.code)} className="accent-[var(--accent)]" />
                            <span className="text-sm">
                              {o.name}
                              <span className="ml-2 text-xs text-muted">
                                {usd(o.msrpCost)}
                                {locked && " · set by paint"}
                                {o.confidence === "low" && " · thin data"}
                              </span>
                            </span>
                            <span className="h-1.5 rounded-full bg-line">
                              <span className="block h-full rounded-full" style={{ width: `${Math.max(2, Math.min(100, (o.payback / 1.5) * 100))}%`, background: color }} />
                            </span>
                            <span className="tabular text-right text-sm" style={{ color }}>{Math.round(o.payback * 100)}%</span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-line bg-panel p-6">
          <p className="eyebrow">Depreciation · {spec.trim}, all generations</p>
          <p className="mt-1 text-sm text-muted">
            Median asking price by model year, from real listings. Shaded: the {spec.generation} years.
          </p>
          <div className="mt-4 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analysis.priceByYear} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <ReferenceArea x1={trim.years[0]} x2={trim.years[1]} fill="var(--accent)" fillOpacity={0.12} ifOverflow="extendDomain" />
                <XAxis dataKey="year" type="number" domain={["dataMin", "dataMax"]} allowDecimals={false} stroke="#6b675f" tickLine={false} fontSize={12} />
                <YAxis stroke="#6b675f" tickLine={false} fontSize={12} width={48} domain={["auto", "auto"]} tickFormatter={(v) => usdK(v)} />
                <Tooltip
                  contentStyle={{ background: "#131315", border: "1px solid #26262a", borderRadius: 8 }}
                  formatter={(v, _n, item) => [`${usd(Number(v))} median · ${item.payload.sample} listings`, "Asking"]}
                  labelFormatter={(y) => `${y} model year`}
                />
                <Line type="monotone" dataKey="medianPrice" stroke="var(--accent)" strokeWidth={2.5} dot={{ r: 3 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </main>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Seg({ active, disabled, title, onClick, children }: { active: boolean; disabled?: boolean; title?: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
        active ? "border-ink bg-ink text-bg" : "border-line text-ink hover:border-muted"
      } disabled:cursor-not-allowed disabled:border-line/50 disabled:text-muted/40 disabled:line-through`}
    >
      {children}
    </button>
  );
}

function ConfidencePill({ level }: { level: "high" | "medium" | "low" }) {
  const color = level === "high" ? "var(--holder)" : level === "medium" ? "var(--neutral)" : "var(--pit)";
  return (
    <span className="rounded-full border px-2.5 py-0.5 text-xs" style={{ borderColor: color, color }}>
      {level} confidence
    </span>
  );
}

function SaveButton({ spec, signedIn }: { spec: BuildSpec; signedIn: boolean }) {
  const [name, setName] = useState(defaultBuildName(spec));
  const [status, setStatus] = useState<{ saved?: boolean; error?: string }>({});
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setName(defaultBuildName(spec));
    setStatus({});
  }, [spec]);

  if (!signedIn) {
    return (
      <Link href={`/login?next=${encodeURIComponent(`/build?${specToQuery(spec)}`)}`} className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg hover:bg-white">
        Sign in to save
      </Link>
    );
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await saveBuild(name, spec);
          setStatus(res.error ? { error: res.error } : { saved: true });
        });
      }}
    >
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label="Build name" className="w-56 rounded-full border border-line bg-bg px-4 py-2 text-sm outline-none focus:border-accent" />
      <button disabled={pending} className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg hover:bg-white disabled:opacity-50">
        {pending ? "Saving…" : "Save to Garage"}
      </button>
      {status.saved && (
        <Link href="/garage" className="text-sm text-holder">Saved. View garage →</Link>
      )}
      {status.error && <span className="text-sm text-pit">{status.error}</span>}
    </form>
  );
}
