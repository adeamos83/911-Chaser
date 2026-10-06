import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { trimSpec } from "@/data/catalog";
import { usd, usdK } from "@/lib/spec";
import type { Analysis } from "./useLiveAnalysis";

const AXIS_COLOR = "#6b675f";
const TOOLTIP_STYLE = { background: "#131315", border: "1px solid #26262a", borderRadius: 8 };

/** Padding (in years) on each side of the x-axis so the first and last dots aren't on the edge. */
const YEAR_AXIS_PADDING = 0.5;
/** The y-axis starts 10% below the cheapest year and ends 5% above the priciest, so the line doesn't touch the edges. */
const Y_AXIS_BOTTOM_FACTOR = 0.9;
const Y_AXIS_TOP_FACTOR = 1.05;

interface Props {
  analysis: Analysis;
  pending: boolean;
}

/** Median asking price per model year, plus the "each year older / each 10K miles" depreciation line. */
export function PriceByYearChart({ analysis, pending }: Props) {
  // Uses the spec the numbers were computed for, so the axis never switches before its data arrives.
  const shown = analysis.spec;
  const { years } = trimSpec(shown.generation, shown.trim)!;
  const [firstYear, lastYear] = years;
  // One tick per model year, e.g. [2020, 2021, 2022].
  const yearCount = lastYear - firstYear + 1;
  const yearTicks = Array.from({ length: yearCount }, (_unused, index) => firstYear + index);
  const { perYear, perTenKMiles } = analysis.slopes;

  return (
    <div className="relative rounded-2xl border border-line bg-panel p-6">
      {pending && (
        <span className="absolute top-5 right-6 flex items-center gap-2 text-xs text-muted" aria-live="polite">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent" />
          Updating…
        </span>
      )}
      <div className={`transition-opacity duration-300 ${pending ? "opacity-40" : "opacity-100"}`}>
        <p className="eyebrow">
          Price by model year · {shown.generation} {shown.trim}
        </p>
        <p className="mt-1 text-sm text-muted">
          Median asking price for each model year ({firstYear}
          {lastYear > firstYear && `-${lastYear}`}), from real listings.
        </p>

        {/* Only show a rate when it points the expected way (older and higher-mileage cars cost less). */}
        <p className="mt-3 min-h-5 text-sm">
          {perYear > 0 && (
            <>
              Each year older: <span className="tabular text-pit">-{usd(perYear)}</span>
              <span className="text-muted"> at equal mileage. </span>
            </>
          )}
          {perTenKMiles < 0 && (
            <>
              Each 10K miles: <span className="tabular text-pit">-{usd(-perTenKMiles)}</span>
              <span className="text-muted"> at equal age.</span>
            </>
          )}
        </p>

        {/* The key restarts the fade-in animation whenever a different model is shown. */}
        <div key={`${shown.generation}-${shown.trim}`} className="fade-in mt-4 h-56">
          {analysis.priceByYear.length === 0 ? (
            <p className="pt-20 text-center text-sm text-muted">Not enough listings yet to chart this model.</p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analysis.priceByYear} margin={{ top: 16, right: 12, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="year"
                  type="number"
                  domain={[firstYear - YEAR_AXIS_PADDING, lastYear + YEAR_AXIS_PADDING]}
                  ticks={yearTicks}
                  stroke={AXIS_COLOR}
                  tickLine={false}
                  fontSize={12}
                />
                <YAxis
                  stroke={AXIS_COLOR}
                  tickLine={false}
                  fontSize={12}
                  width={48}
                  domain={[(min: number) => min * Y_AXIS_BOTTOM_FACTOR, (max: number) => max * Y_AXIS_TOP_FACTOR]}
                  tickFormatter={(price) => usdK(price)}
                />
                <Tooltip
                  contentStyle={TOOLTIP_STYLE}
                  // Returns [value text, series label] for the hovered point.
                  formatter={(price, _seriesName, point) => [`${usd(Number(price))} median · ${point.payload.sample} listings`, "Asking"]}
                  labelFormatter={(year) => `${year} model year`}
                />
                <Line
                  type="monotone"
                  dataKey="medianPrice"
                  stroke="var(--accent)"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                  animationDuration={700}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
