interface ChoiceCardProps {
  title: string;
  /** A short line under the title, e.g. "8-speed dual clutch". */
  subtitle: string;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}

/** A two-line choice card (used for transmission and body). The selected one is filled dark. */
export function ChoiceCard({ title, subtitle, selected, disabled = false, onClick }: ChoiceCardProps) {
  const colorClasses = selected ? "border-ink bg-ink text-inverse" : "border-line bg-surface text-ink hover:border-muted";
  const disabledClasses = disabled ? "cursor-not-allowed opacity-40 hover:border-line" : "cursor-pointer";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex-1 rounded-button border px-3.5 py-3 text-left transition-all duration-150 ${colorClasses} ${disabledClasses}`}
    >
      <div className="text-small font-semibold">{title}</div>
      <div className="mt-0.5 text-caption opacity-70">{subtitle}</div>
    </button>
  );
}
