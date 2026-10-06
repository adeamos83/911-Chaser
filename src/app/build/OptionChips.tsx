import { OPTIONS, optionAvailableOn, optionsConflict } from "@/data/catalog";
import type { Body } from "@/data/types";
import type { OptionValue } from "@/lib/engine";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { formatSignedUsd, formatUsd } from "@/lib/format";

/** Paint to Sample is never picked by hand: it follows the paint choice. */
const PAINT_TO_SAMPLE_CODE = "PTS";

interface OptionChipsProps {
  optionValues: OptionValue[];
  body: Body;
  selectedCodes: string[];
  /** Total resale value of the selected options. */
  selectedTotal: number;
  onToggle: (code: string) => void;
}

/** Factory options as toggle chips, each showing what it adds at resale. */
export function OptionChips({ optionValues, body, selectedCodes, selectedTotal, onToggle }: OptionChipsProps) {
  const pickableOptions = optionValues.filter(
    (option) => option.code !== PAINT_TO_SAMPLE_CODE && optionAvailableOn(option.code, body),
  );
  const selectedCount = selectedCodes.filter((code) => code !== PAINT_TO_SAMPLE_CODE).length;
  const summary = selectedCount > 0 ? `${selectedCount} selected · ${formatSignedUsd(selectedTotal)}` : "None selected";

  return (
    <div>
      <SectionHeader label="Factory options">
        <span className="text-muted">{summary}</span>
      </SectionHeader>
      <div className="flex flex-wrap gap-2">
        {pickableOptions.map((option) => (
          <OptionChip
            key={option.code}
            option={option}
            selected={selectedCodes.includes(option.code)}
            onToggle={() => onToggle(option.code)}
          />
        ))}
      </div>
      <p className="mt-3 text-caption text-muted">
        Option values are modeled from 911 market knowledge. Few listings include a reliable option sheet, so they aren&apos;t measured yet.
      </p>
    </div>
  );
}

interface OptionChipProps {
  option: OptionValue;
  selected: boolean;
  onToggle: () => void;
}

/** One option: its name and what it adds at resale. Hover shows how much of its cost it gets back. */
function OptionChip({ option, selected, onToggle }: OptionChipProps) {
  const colorClasses = selected ? "border-ink bg-ink text-inverse" : "border-line bg-surface text-ink hover:border-muted";
  const deltaColor = selected ? "text-inverse/70" : "text-muted";
  const paybackPercent = Math.round(option.payback * 100);
  const conflicts = OPTIONS.filter((other) => optionsConflict(option.code, other.code)).map((other) => other.name);
  const conflictNote = conflicts.length > 0 ? `. Replaces ${conflicts.join(" and ")}` : "";
  const tooltip = `Gets back about ${paybackPercent}% of its ${formatUsd(option.msrpCost)} cost at resale${conflictNote}`;

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={selected}
      title={tooltip}
      className={`flex cursor-pointer items-baseline gap-2 rounded-input border px-3 py-[9px] transition-all duration-150 ${colorClasses}`}
    >
      <span className="text-small font-medium">{option.name}</span>
      <span className={`tabular text-caption ${deltaColor}`}>{formatSignedUsd(option.premiumUsd)}</span>
    </button>
  );
}
