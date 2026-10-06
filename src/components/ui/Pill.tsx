import Link from "next/link";

interface PillProps {
  selected: boolean;
  children: React.ReactNode;
  /** Give either `onClick` (acts as a button) or `href` (acts as a link). */
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  /** Tooltip, e.g. why a choice is disabled. */
  title?: string;
  /** "regular" for the configurator, "compact" for the deals filters. */
  size?: "regular" | "compact";
}

const SIZE_CLASSES = {
  regular: "px-3.5 py-[9px]",
  compact: "px-[13px] py-2",
};

/**
 * A rounded choice chip. The selected one is filled dark; the rest are light with a thin border.
 * As a link it keeps the scroll position, because it only changes a filter on the same page.
 */
export function Pill({ selected, children, onClick, href, disabled = false, title, size = "regular" }: PillProps) {
  const colorClasses = selected
    ? "border-ink bg-ink text-inverse"
    : "border-line bg-surface text-ink hover:border-muted";
  const disabledClasses = disabled ? "cursor-not-allowed opacity-40 hover:border-line" : "cursor-pointer";
  const className = `inline-block rounded-pill border text-small font-medium no-underline transition-all duration-150 ${SIZE_CLASSES[size]} ${colorClasses} ${disabledClasses}`;

  if (href && !disabled) {
    return (
      <Link href={href} scroll={false} className={className} title={title} aria-current={selected ? "true" : undefined}>
        {children}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} aria-pressed={selected} className={className}>
      {children}
    </button>
  );
}
