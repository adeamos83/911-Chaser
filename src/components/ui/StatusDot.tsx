interface StatusDotProps {
  children: React.ReactNode;
}

/** A small green dot followed by a muted status line, e.g. "Market data updated Oct 6, 2026". */
export function StatusDot({ children }: StatusDotProps) {
  return (
    <div className="flex items-center gap-2.5 text-caption text-muted">
      <span className="inline-block h-[7px] w-[7px] shrink-0 rounded-full bg-positive" />
      <span>{children}</span>
    </div>
  );
}
