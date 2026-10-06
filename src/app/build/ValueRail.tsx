import type { BuildSpec } from "@/data/types";
import type { Confidence, Estimate } from "@/lib/engine";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { formatMiles, formatUsd } from "@/lib/format";
import type { PricedAt } from "@/lib/spec";
import { BreakdownList, type BreakdownRow } from "./BreakdownList";
import { RailChart, type ChartMode } from "./RailChart";
import { SaveToGarageButton } from "./SaveToGarageButton";
import type { Analysis } from "./useLiveAnalysis";

const CONFIDENCE_LABELS: Record<Confidence, { text: string; colorClass: string }> = {
  high: { text: "High confidence", colorClass: "text-positive" },
  medium: { text: "Medium confidence", colorClass: "text-ink" },
  low: { text: "Low confidence", colorClass: "text-negative" },
};

interface ValueRailProps {
  analysis: Analysis;
  /** True while newer numbers are loading; the old ones are dimmed meanwhile. */
  pending: boolean;
  chartMode: ChartMode;
  onChartModeChange: (mode: ChartMode) => void;
  paintHex: string;
  /** The build as it is right now (used for saving). */
  spec: BuildSpec;
  pricedAt: PricedAt;
  signedIn: boolean;
}

/** The right-hand card: estimated value, chart, line-by-line breakdown, typical range, and save. */
export function ValueRail({ analysis, pending, chartMode, onChartModeChange, paintHex, spec, pricedAt, signedIn }: ValueRailProps) {
  const estimate = analysis.estimate;
  const fadeClass = pending ? "opacity-50" : "opacity-100";

  return (
    <aside className="flex w-full max-w-full flex-col gap-[22px] self-start rounded-rail border border-hairline bg-surface px-[26px] pt-[26px] pb-[22px] lg:w-[392px] lg:flex-none">
      {estimate ? (
        <div className={`flex flex-col gap-[22px] transition-opacity duration-300 ${fadeClass}`}>
          <HeadlineValue estimate={estimate} />
          <RailChart
            mode={chartMode}
            onModeChange={onChartModeChange}
            estimate={estimate}
            pricesByYear={analysis.priceByYear}
            perMile={analysis.slopes.perMile}
            paintHex={paintHex}
          />
          <BreakdownList rows={breakdownRows(analysis.spec, estimate)} />
          <div className="flex justify-between gap-3 border-t border-hairline pt-4 text-caption text-muted">
            <span>Typical asking range</span>
            <span className="tabular font-semibold text-ink">
              {formatUsd(estimate.low)} – {formatUsd(estimate.high)}
            </span>
          </div>
        </div>
      ) : (
        <div>
          <Eyebrow>Estimated market value</Eyebrow>
          <p className="mt-3 text-small text-muted">Not enough market data for this spec yet. Try another model or generation.</p>
        </div>
      )}
      <SaveToGarageButton spec={spec} pricedAt={pricedAt} signedIn={signedIn} />
    </aside>
  );
}

/** The big price, with how confident we are and how many listings it's based on. */
function HeadlineValue({ estimate }: { estimate: Estimate }) {
  const confidence = CONFIDENCE_LABELS[estimate.confidence];
  return (
    <div>
      <Eyebrow>Estimated market value</Eyebrow>
      <div className="tabular mt-2 text-price leading-[1.1] font-semibold tracking-[-.02em]">{formatUsd(estimate.mid)}</div>
      <div className="mt-2 flex flex-wrap items-center gap-x-2.5 text-small">
        <span className={`font-semibold ${confidence.colorClass}`}>{confidence.text}</span>
        <span className="text-muted">from {estimate.sample} comparable listings</span>
      </div>
    </div>
  );
}

/** Each part of the estimate as a row. The amounts add up exactly to the headline value. */
function breakdownRows(spec: BuildSpec, estimate: Estimate): BreakdownRow[] {
  const parts = estimate.breakdown;
  const selectedOptionCount = spec.options.length;
  const optionsText = selectedOptionCount > 0 ? `${selectedOptionCount} selected` : "None";

  return [
    { label: "Base car", value: `${spec.generation} ${spec.trim} ${spec.body}`, amount: parts.bareCar, isBase: true },
    { label: "Model year", value: String(estimate.modelYear), amount: parts.modelYear },
    { label: "Mileage", value: formatMiles(estimate.mileage), amount: parts.mileage },
    { label: "Paint", value: spec.color, amount: parts.paint },
    { label: "Transmission", value: spec.transmission, amount: parts.transmission },
    { label: "Options", value: optionsText, amount: parts.options },
  ];
}
