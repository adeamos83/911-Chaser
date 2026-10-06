import { GENERATIONS, trimsFor } from "@/data/catalog";
import type { Generation, Trim } from "@/data/types";
import { Pill } from "@/components/ui/Pill";
import { SegmentedControl } from "@/components/ui/SegmentedControl";

// Newest generation first, like the design's "992 | 991".
const GENERATIONS_NEWEST_FIRST = [...GENERATIONS].reverse();
const GENERATION_OPTIONS = GENERATIONS_NEWEST_FIRST.map((generation) => ({ value: generation, label: generation }));

interface ModelBarProps {
  generation: Generation;
  trim: Trim;
  onGenerationChange: (generation: Generation) => void;
  onTrimChange: (trim: Trim) => void;
}

/** Top of the configurator: model pills on the left, the generation switch on the right. */
export function ModelBar({ generation, trim, onGenerationChange, onTrimChange }: ModelBarProps) {
  const trimsInGeneration = trimsFor(generation);

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-wrap gap-1.5">
        {trimsInGeneration.map((trimOption) => (
          <Pill key={trimOption.trim} selected={trimOption.trim === trim} onClick={() => onTrimChange(trimOption.trim)}>
            {trimOption.trim}
          </Pill>
        ))}
      </div>
      <SegmentedControl
        ariaLabel="Generation"
        options={GENERATION_OPTIONS}
        selectedValue={generation}
        onSelect={onGenerationChange}
      />
    </div>
  );
}
