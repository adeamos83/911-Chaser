interface EyebrowProps {
  children: React.ReactNode;
  className?: string;
}

/** The small uppercase label that sits above a headline or section, e.g. "GARAGE". */
export function Eyebrow({ children, className = "" }: EyebrowProps) {
  return (
    <div className={`text-caption font-semibold tracking-[.1em] text-muted uppercase ${className}`}>
      {children}
    </div>
  );
}
