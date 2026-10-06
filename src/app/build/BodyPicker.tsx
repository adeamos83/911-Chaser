import { BODIES, bodiesFor } from "@/data/catalog";
import type { Body, Trim } from "@/data/types";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { ChoiceCard } from "./ChoiceCard";

const BODY_SUBTITLES: Record<Body, string> = {
  Coupe: "Fixed roof",
  Cabriolet: "Soft top",
  Targa: "All-wheel drive",
};

interface BodyPickerProps {
  trim: Trim;
  selected: Body;
  onSelect: (body: Body) => void;
}

/** Coupe, Cabriolet or Targa. Targa only exists on the all-wheel-drive models. */
export function BodyPicker({ trim, selected, onSelect }: BodyPickerProps) {
  const availableBodies = bodiesFor(trim);

  return (
    <div>
      <SectionHeader label="Body">
        <span className="text-muted">{selected}</span>
      </SectionHeader>
      <div className="flex gap-2">
        {BODIES.map((body) => {
          const isAvailable = availableBodies.includes(body);
          const subtitle = isAvailable ? BODY_SUBTITLES[body] : "Not offered";
          return (
            <ChoiceCard
              key={body}
              title={body}
              subtitle={subtitle}
              selected={body === selected}
              disabled={!isAvailable}
              onClick={() => onSelect(body)}
            />
          );
        })}
      </div>
    </div>
  );
}
