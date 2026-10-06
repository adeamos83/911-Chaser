import { optionAvailableOn } from "@/data/catalog";
import type { BuildSpec } from "@/data/types";
import type { OptionValue, ValueTier } from "@/lib/engine";
import { usd } from "@/lib/spec";

const TIERS: { tier: ValueTier; blurb: string; color: string }[] = [
  { tier: "Value Holder", blurb: "Recovers 80%+ of its cost at resale", color: "var(--holder)" },
  { tier: "Neutral", blurb: "Recovers 30 to 80%", color: "var(--neutral)" },
  { tier: "Money Pit", blurb: "Recovers under 30%", color: "var(--pit)" },
];

/** The payback bar is full at 150% payback (an option worth 1.5x its cost at resale). */
const FULL_BAR_PAYBACK = 1.5;
/** Even a negative payback shows a sliver of bar, so the row doesn't look broken. */
const MIN_BAR_PERCENT = 2;
/** A payback at or above FULL_BAR_PAYBACK fills the bar completely. */
const MAX_BAR_PERCENT = 100;

interface Props {
  optionValues: OptionValue[];
  spec: BuildSpec;
  onToggle: (code: string) => void;
}

/** Options grouped into Value Holder / Neutral / Money Pit, each with a checkbox and payback bar. */
export function OptionsList({ optionValues, spec, onToggle }: Props) {
  return (
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
          // This tier's options that fit the chosen body, best payback first.
          const optionsInTier = optionValues.filter(
            (option) => option.tier === tier && optionAvailableOn(option.code, spec.body),
          );
          const rows = optionsInTier.sort((first, second) => second.payback - first.payback);
          return (
            <div key={tier}>
              <div className="flex items-baseline gap-3 border-b border-line pb-2">
                <h3 className="font-display text-2xl" style={{ color }}>{tier}</h3>
                <span className="text-xs text-muted">{blurb}</span>
              </div>
              <ul>
                {rows.map((option) => (
                  <OptionRow
                    key={option.code}
                    option={option}
                    color={color}
                    checked={spec.options.includes(option.code)}
                    onToggle={() => onToggle(option.code)}
                  />
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** One option: checkbox, name and price, a payback bar, and the payback percent. */
function OptionRow({ option, color, checked, onToggle }: { option: OptionValue; color: string; checked: boolean; onToggle: () => void }) {
  // Paint to Sample can't be ticked by hand: it follows the paint choice.
  const locked = option.code === "PTS";
  const rawBarPercent = (option.payback / FULL_BAR_PAYBACK) * 100;
  const barPercent = Math.max(MIN_BAR_PERCENT, Math.min(MAX_BAR_PERCENT, rawBarPercent));
  const paybackPercent = Math.round(option.payback * 100);

  return (
    <li>
      <label className={`grid cursor-pointer grid-cols-[1.25rem_1fr_7rem_3.5rem] items-center gap-3 py-2.5 ${locked ? "cursor-default opacity-70" : ""}`}>
        <input type="checkbox" checked={checked} disabled={locked} onChange={onToggle} className="accent-[var(--accent)]" />
        <span className="text-sm">
          {option.name}
          <span className="ml-2 text-xs text-muted">
            {usd(option.msrpCost)}
            {locked && " · set by paint"}
            {option.confidence === "low" && " · thin data"}
          </span>
        </span>
        <span className="h-1.5 rounded-full bg-line">
          <span className="block h-full rounded-full" style={{ width: `${barPercent}%`, background: color }} />
        </span>
        <span className="tabular text-right text-sm" style={{ color }}>{paybackPercent}%</span>
      </label>
    </li>
  );
}
