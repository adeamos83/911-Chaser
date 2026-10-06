import Link from "next/link";

export interface SegmentOption<Value extends string> {
  value: Value;
  label: string;
  /** Set this to make the segment a link (server pages). Leave it out to use `onSelect`. */
  href?: string;
}

interface SegmentedControlProps<Value extends string> {
  options: SegmentOption<Value>[];
  selectedValue: Value;
  onSelect?: (value: Value) => void;
  /** "regular" (12px text), "small" (11px, inside the value rail) or "large" (13px, the login tabs). */
  size?: "regular" | "small" | "large";
  /** Stretch the segments to fill the full width (the login tabs do this). */
  fullWidth?: boolean;
  ariaLabel: string;
}

const TRACK_PADDING = { regular: "p-[3px]", small: "p-0.5", large: "p-[3px]" };
const SEGMENT_SIZE = {
  regular: "px-3.5 py-[7px] text-caption",
  small: "px-2.5 py-[5px] text-micro",
  large: "p-[9px] text-small",
};

/** A pill-shaped track of options where one is raised and highlighted, e.g. "992.1 | 991.2". */
export function SegmentedControl<Value extends string>({
  options,
  selectedValue,
  onSelect,
  size = "regular",
  fullWidth = false,
  ariaLabel,
}: SegmentedControlProps<Value>) {
  const trackWidth = fullWidth ? "flex w-full" : "inline-flex";

  return (
    <div role="group" aria-label={ariaLabel} className={`${trackWidth} shrink-0 rounded-pill bg-well ${TRACK_PADDING[size]}`}>
      {options.map((option) => {
        const isSelected = option.value === selectedValue;
        const stateClasses = isSelected ? "bg-surface text-ink shadow-segment" : "bg-transparent text-muted hover:text-ink";
        const widthClass = fullWidth ? "flex-1 text-center" : "";
        const className = `rounded-pill border-0 font-semibold no-underline transition-all duration-150 ${SEGMENT_SIZE[size]} ${stateClasses} ${widthClass}`;

        if (option.href) {
          return (
            <Link key={option.value} href={option.href} scroll={false} className={className} aria-current={isSelected ? "true" : undefined}>
              {option.label}
            </Link>
          );
        }

        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={isSelected}
            onClick={() => onSelect?.(option.value)}
            className={`cursor-pointer ${className}`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
