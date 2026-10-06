import type { Generation, Transmission, Trim } from "@/data/types";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { formatSignedUsd } from "@/lib/format";
import { ChoiceCard } from "./ChoiceCard";

interface TransmissionPickerProps {
  generation: Generation;
  trim: Trim;
  selected: Transmission;
  manualAvailable: boolean;
  /** What a manual adds (or takes away) at resale, compared with PDK. */
  manualPremium: number;
  onSelect: (transmission: Transmission) => void;
}

/** PDK or manual. The manual card is disabled on models that never offered one (e.g. every Turbo). */
export function TransmissionPicker({ generation, trim, selected, manualAvailable, manualPremium, onSelect }: TransmissionPickerProps) {
  // The 991 PDK has seven gears; the 992 PDK has eight.
  const pdkGears = generation.startsWith("991") ? 7 : 8;
  const manualPremiumText = `${formatSignedUsd(manualPremium)} at resale`;
  const headerNote = manualAvailable ? `Manual ${manualPremiumText}` : "PDK only";
  const manualSubtitle = manualAvailable ? manualPremiumText : `Not offered on the ${trim}`;

  return (
    <div>
      <SectionHeader label="Transmission">
        <span className="text-muted">{headerNote}</span>
      </SectionHeader>
      <div className="flex gap-2">
        <ChoiceCard title="PDK" subtitle={`${pdkGears}-speed dual clutch`} selected={selected === "PDK"} onClick={() => onSelect("PDK")} />
        <ChoiceCard
          title="Manual"
          subtitle={manualSubtitle}
          selected={selected === "Manual"}
          disabled={!manualAvailable}
          onClick={() => onSelect("Manual")}
        />
      </div>
    </div>
  );
}
