"use client";

import { useState } from "react";
import { colorDef, trimSpec } from "@/data/catalog";
import type { BuildSpec, ColorTier } from "@/data/types";
import type { OptionValue } from "@/lib/engine";
import { formatMiles } from "@/lib/format";
import { NEUTRAL_PAINT_HEX } from "@/lib/paint";
import { normalizeSpec, type PricedAt } from "@/lib/spec";
import { BodyPicker } from "./BodyPicker";
import { CarHero } from "./CarHero";
import { ModelBar } from "./ModelBar";
import { OptionChips } from "./OptionChips";
import { PaintPicker } from "./PaintPicker";
import { CHART_MAX_MILES, type ChartMode } from "./RailChart";
import { SliderField } from "./SliderField";
import { TransmissionPicker } from "./TransmissionPicker";
import { ValueRail } from "./ValueRail";
import { useLiveAnalysis, type Analysis } from "./useLiveAnalysis";

const MILEAGE_STEP = 500;
/** Shown on the mileage slider until the first estimate arrives. */
const FALLBACK_MILEAGE = 15000;

interface ConfiguratorProps {
  initialSpec: BuildSpec;
  initialPricedAt: PricedAt;
  initialAnalysis: Analysis;
  /** Every option's resale value, for the option chips. */
  optionValues: OptionValue[];
  /** What a manual adds at resale, for the transmission cards. */
  manualPremium: number;
  /** What each paint tier adds at resale, for the paint header. */
  paintTierPremiums: Record<ColorTier, number>;
  signedIn: boolean;
}

/**
 * The Configure page. Holds the build being configured and wires it to:
 *   - ModelBar, CarHero, PaintPicker, TransmissionPicker, BodyPicker, OptionChips, sliders  (left column)
 *   - ValueRail  (right column: value, chart, breakdown, save)
 */
export function Configurator({
  initialSpec,
  initialPricedAt,
  initialAnalysis,
  optionValues,
  manualPremium,
  paintTierPremiums,
  signedIn,
}: ConfiguratorProps) {
  const [spec, setSpec] = useState(initialSpec);
  /** Model year and mileage the user picked. Undefined means "use the typical one for this model". */
  const [modelYear, setModelYear] = useState(initialPricedAt.modelYear);
  const [mileage, setMileage] = useState(initialPricedAt.mileage);
  const [chartMode, setChartMode] = useState<ChartMode>("year");

  const pricedAt = { modelYear, mileage };
  const { analysis, pending } = useLiveAnalysis(spec, pricedAt, initialAnalysis);

  const trimInfo = trimSpec(spec.generation, spec.trim)!;
  const [firstYear, lastYear] = trimInfo.years;
  const keepYearInRange = (year: number, range: [number, number]) => Math.min(range[1], Math.max(range[0], year));

  const updateSpec = (patch: Partial<BuildSpec>) => {
    // normalizeSpec fixes any combination Porsche never built (e.g. a manual Turbo).
    const nextSpec = normalizeSpec({ ...spec, ...patch });
    // A different model may have been sold in different years, so keep the chosen year inside its range.
    const nextYears = trimSpec(nextSpec.generation, nextSpec.trim)!.years;
    if (modelYear !== undefined) setModelYear(keepYearInRange(modelYear, nextYears));
    setSpec(nextSpec);
  };

  const toggleOption = (code: string) => {
    const isSelected = spec.options.includes(code);
    const options = isSelected ? spec.options.filter((optionCode) => optionCode !== code) : [...spec.options, code];
    updateSpec({ options });
  };

  // What the sliders show: the user's pick, or the typical value from the latest estimate.
  const estimate = analysis.estimate;
  const shownYear = keepYearInRange(modelYear ?? estimate?.modelYear ?? lastYear, trimInfo.years);
  const shownMileage = mileage ?? estimate?.mileage ?? FALLBACK_MILEAGE;

  // These update instantly on click, without waiting for the server.
  const paint = colorDef(spec.color);
  const paintHex = paint?.hex ?? NEUTRAL_PAINT_HEX;
  const paintPremium = paint ? paintTierPremiums[paint.tier] : 0;
  const selectedOptionsTotal = optionValues
    .filter((option) => spec.options.includes(option.code))
    .reduce((total, option) => total + option.premiumUsd, 0);

  return (
    <div className="flex flex-wrap gap-8 px-5 pt-7 pb-9 sm:px-9">
      <div className="flex min-w-0 flex-[1_1_540px] flex-col gap-[26px]">
        <ModelBar
          generation={spec.generation}
          trim={spec.trim}
          onGenerationChange={(generation) => updateSpec({ generation })}
          onTrimChange={(trim) => updateSpec({ trim })}
        />

        <CarHero
          paintHex={paintHex}
          paintName={spec.color}
          leftCaption={`${shownYear} ${spec.generation} · ${spec.trim}`}
          rightCaption={`${spec.color} · ${spec.transmission}`}
        />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-7">
          <PaintPicker
            generation={spec.generation}
            selectedColor={spec.color}
            paintPremium={paintPremium}
            onSelect={(color) => updateSpec({ color })}
          />
          <div className="flex flex-col gap-6">
            <TransmissionPicker
              generation={spec.generation}
              trim={spec.trim}
              selected={spec.transmission}
              manualAvailable={trimInfo.manualAvailable}
              manualPremium={manualPremium}
              onSelect={(transmission) => updateSpec({ transmission })}
            />
            <BodyPicker trim={spec.trim} selected={spec.body} onSelect={(body) => updateSpec({ body })} />
          </div>
        </div>

        <OptionChips
          optionValues={optionValues}
          body={spec.body}
          selectedCodes={spec.options}
          selectedTotal={selectedOptionsTotal}
          onToggle={toggleOption}
        />

        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-7">
          <SliderField
            label="Model year"
            valueText={String(shownYear)}
            minimum={firstYear}
            maximum={lastYear}
            step={1}
            value={shownYear}
            onChange={setModelYear}
            minimumLabel={String(firstYear)}
            maximumLabel={String(lastYear)}
          />
          <SliderField
            label="Mileage"
            valueText={formatMiles(shownMileage)}
            minimum={0}
            maximum={CHART_MAX_MILES}
            step={MILEAGE_STEP}
            value={Math.min(shownMileage, CHART_MAX_MILES)}
            onChange={setMileage}
            minimumLabel="0 mi"
            maximumLabel={formatMiles(CHART_MAX_MILES)}
          />
        </div>
      </div>

      <ValueRail
        analysis={analysis}
        pending={pending}
        chartMode={chartMode}
        onChartModeChange={setChartMode}
        paintHex={paintHex}
        spec={spec}
        pricedAt={pricedAt}
        signedIn={signedIn}
      />
    </div>
  );
}
