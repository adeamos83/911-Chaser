import { Eyebrow } from "./Eyebrow";

interface SectionHeaderProps {
  /** The uppercase label on the left, e.g. "Paint". */
  label: string;
  /** The current value or a short note on the right, e.g. "Shark Blue +$6,500". */
  children?: React.ReactNode;
  /** Space below the header. Sliders use a little more than the others. */
  spacing?: "normal" | "roomy";
}

/** A section's header row: uppercase label on the left, its current value on the right. */
export function SectionHeader({ label, children, spacing = "normal" }: SectionHeaderProps) {
  const marginBelow = spacing === "roomy" ? "mb-3.5" : "mb-3";
  return (
    <div className={`flex flex-wrap items-baseline justify-between gap-3 ${marginBelow}`}>
      <Eyebrow>{label}</Eyebrow>
      <span className="text-small">{children}</span>
    </div>
  );
}
