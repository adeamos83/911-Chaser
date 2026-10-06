import { colorsFor } from "@/data/catalog";
import type { Generation } from "@/data/types";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { amountColorClass, formatSignedUsd } from "@/lib/format";

interface PaintPickerProps {
  generation: Generation;
  selectedColor: string;
  /** What the selected paint adds or takes away at resale. */
  paintPremium: number;
  onSelect: (colorName: string) => void;
}

/** A ring around the selected swatch: a thin gap in the card color, then a dark ring. */
const SELECTED_RING = "0 0 0 2px #f6f3ed, 0 0 0 4px #1c1b19";
/** Unselected swatches get a faint inner edge, so white paint doesn't vanish into the card. */
const UNSELECTED_RING = "inset 0 0 0 1px rgba(28,27,25,.12)";

/** Round paint swatches. Only paints offered for the chosen generation are shown. */
export function PaintPicker({ generation, selectedColor, paintPremium, onSelect }: PaintPickerProps) {
  const roundedPremium = Math.round(paintPremium);
  const premiumText = roundedPremium === 0 ? "baseline" : formatSignedUsd(roundedPremium);

  return (
    <div>
      <SectionHeader label="Paint">
        {selectedColor} <span className={`font-semibold ${amountColorClass(roundedPremium)}`}>{premiumText}</span>
      </SectionHeader>
      <div className="flex flex-wrap gap-2.5">
        {colorsFor(generation).map((color) => {
          const isSelected = color.name === selectedColor;
          return (
            <button
              key={color.name}
              type="button"
              title={`${color.name} (${color.tier})`}
              aria-label={color.name}
              aria-pressed={isSelected}
              onClick={() => onSelect(color.name)}
              className="h-[34px] w-[34px] cursor-pointer rounded-full border-0 p-0 transition-shadow duration-150"
              style={{ background: color.hex, boxShadow: isSelected ? SELECTED_RING : UNSELECTED_RING }}
            />
          );
        })}
      </div>
    </div>
  );
}
