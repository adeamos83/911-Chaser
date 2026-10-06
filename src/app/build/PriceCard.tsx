import Link from "next/link";
import type { BuildSpec } from "@/data/types";
import type { Confidence, Estimate } from "@/lib/engine";
import { specToQuery, usd } from "@/lib/spec";
import { SaveButton } from "./SaveButton";

/** The mileage slider's range, in miles. */
const MAX_SLIDER_MILES = 120000;
const SLIDER_STEP_MILES = 1000;

interface Props {
  /** The spec being built right now (used for saving and the deals link). */
  spec: BuildSpec;
  /** The spec the current numbers were computed for. Lags `spec` while a request is in flight. */
  shownSpec: BuildSpec;
  estimate: Estimate | null;
  pending: boolean;
  /** Mileage the user picked on the slider, or undefined to use the typical mileage. */
  mileage: number | undefined;
  onMileageChange: (mileage: number | undefined) => void;
  signedIn: boolean;
  /** Month the listing data is current to, e.g. "Oct 2026". */
  dataAsOf: string;
}

/** The headline price estimate, mileage slider, and save / deals buttons. */
export function PriceCard({ spec, shownSpec, estimate, pending, mileage, onMileageChange, signedIn, dataAsOf }: Props) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-6">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Estimated asking price</p>
        {estimate && <ConfidencePill level={estimate.confidence} />}
      </div>

      {estimate ? (
        <div className={`transition-opacity duration-300 ${pending ? "opacity-40" : "opacity-100"}`}>
          <p className="tabular mt-3 font-display text-6xl">{usd(estimate.mid)}</p>
          <p className="tabular mt-1 text-muted">
            Typical range {usd(estimate.low)} to {usd(estimate.high)} at {Math.round(estimate.mileage / 1000)}K miles
          </p>
          <p className="mt-1 text-xs text-muted">
            Based on {estimate.sample} real {shownSpec.generation} {shownSpec.trim} listings (MarketCheck, {dataAsOf}). Typical car in this set has{" "}
            {Math.round(estimate.medianMileage / 1000)}K miles.
          </p>
          <label className="mt-5 block">
            <span className="flex justify-between text-xs text-muted">
              <span className="eyebrow">Mileage</span>
              <span className="tabular">
                {estimate.mileage.toLocaleString()} mi
                {mileage !== undefined && (
                  <button type="button" onClick={() => onMileageChange(undefined)} className="ml-2 underline hover:text-ink">
                    reset to typical
                  </button>
                )}
              </span>
            </span>
            <input
              type="range"
              min={0}
              max={MAX_SLIDER_MILES}
              step={SLIDER_STEP_MILES}
              value={mileage ?? estimate.medianMileage}
              onChange={(e) => onMileageChange(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--accent)]"
            />
          </label>
        </div>
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
  );
}

const CONFIDENCE_COLORS: Record<Confidence, string> = {
  high: "var(--holder)",
  medium: "var(--neutral)",
  low: "var(--pit)",
};

function ConfidencePill({ level }: { level: Confidence }) {
  const color = CONFIDENCE_COLORS[level];
  return (
    <span className="rounded-full border px-2.5 py-0.5 text-xs" style={{ borderColor: color, color }}>
      {level} confidence
    </span>
  );
}
