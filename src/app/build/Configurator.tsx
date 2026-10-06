"use client";

import { useState } from "react";
import { colorDef } from "@/data/catalog";
import type { BuildSpec } from "@/data/types";
import type { OptionValue } from "@/lib/engine";
import { normalizeSpec } from "@/lib/spec";
import { BuildPicker } from "./BuildPicker";
import { OptionsList } from "./OptionsList";
import { PriceByYearChart } from "./PriceByYearChart";
import { PriceCard } from "./PriceCard";
import { useLiveAnalysis, type Analysis } from "./useLiveAnalysis";

/** How much of the paint color goes into the accent; the rest is off-white. */
const ACCENT_PAINT_PERCENT = 65;
const ACCENT_BLEND_COLOR = "#f2efea";

interface Props {
  initialSpec: BuildSpec;
  initialAnalysis: Analysis;
  optionValues: OptionValue[];
  signedIn: boolean;
  /** Month the listing data is current to, e.g. "Oct 2026". */
  dataAsOf: string;
}

/**
 * The /build page. Holds the spec being built and the mileage override, and wires them to:
 *   - BuildPicker       (left: car preview and pickers)
 *   - PriceCard         (estimate, mileage slider, save)
 *   - OptionsList       (option payback, checkboxes)
 *   - PriceByYearChart  (depreciation chart)
 */
export function Configurator({ initialSpec, initialAnalysis, optionValues, signedIn, dataAsOf }: Props) {
  const [spec, setSpec] = useState(initialSpec);
  /** Mileage the user picked on the slider; undefined means "use the typical mileage". */
  const [mileage, setMileage] = useState<number | undefined>(undefined);
  const { analysis, pending } = useLiveAnalysis(spec, mileage, initialAnalysis);

  const updateSpec = (patch: Partial<BuildSpec>) => {
    // A different car has a different typical mileage, so drop the slider override.
    if (patch.generation || patch.trim) setMileage(undefined);
    // normalizeSpec fixes any combination that doesn't exist (e.g. a manual Turbo).
    setSpec((current) => normalizeSpec({ ...current, ...patch }));
  };

  const toggleOption = (code: string) => {
    const isSelected = spec.options.includes(code);
    const options = isSelected
      ? spec.options.filter((optionCode) => optionCode !== code)
      : [...spec.options, code];
    updateSpec({ options });
  };

  // The page's accent color is a lighter blend of the chosen paint.
  const paint = colorDef(spec.color)!;
  const accentColor = `color-mix(in oklab, ${paint.hex} ${ACCENT_PAINT_PERCENT}%, ${ACCENT_BLEND_COLOR})`;

  return (
    <main className="mx-auto grid max-w-7xl gap-10 px-5 py-10 lg:grid-cols-[1.15fr_1fr]" style={{ ["--accent" as string]: accentColor }}>
      <BuildPicker spec={spec} onChange={updateSpec} />

      <section className="space-y-8">
        <PriceCard
          spec={spec}
          shownSpec={analysis.spec}
          estimate={analysis.estimate}
          pending={pending}
          mileage={mileage}
          onMileageChange={setMileage}
          signedIn={signedIn}
          dataAsOf={dataAsOf}
        />
        <OptionsList optionValues={optionValues} spec={spec} onToggle={toggleOption} />
        <PriceByYearChart analysis={analysis} pending={pending} />
      </section>
    </main>
  );
}
