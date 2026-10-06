import { amountColorClass, formatSignedUsd, formatUsd } from "@/lib/format";

export interface BreakdownRow {
  label: string;
  /** What was picked, e.g. "Shark Blue" or "9,800 mi". */
  value: string;
  amount: number;
  /** The base row shows a plain price; every other row shows a signed adjustment. */
  isBase?: boolean;
}

/** The estimate, line by line: the base car, then what each choice adds or takes away. */
export function BreakdownList({ rows }: { rows: BreakdownRow[] }) {
  return (
    <div className="flex flex-col gap-[9px] border-t border-hairline pt-[18px] text-small">
      {rows.map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-3">
          <span className="flex-none text-muted">{row.label}</span>
          <span className="flex-1 truncate text-right text-ink">{row.value}</span>
          <AmountCell amount={row.amount} isBase={row.isBase} />
        </div>
      ))}
    </div>
  );
}

function AmountCell({ amount, isBase = false }: { amount: number; isBase?: boolean }) {
  const cellClasses = "tabular min-w-[76px] text-right font-semibold";
  if (isBase) return <span className={`${cellClasses} text-ink`}>{formatUsd(amount)}</span>;

  const isZero = Math.round(amount) === 0;
  const text = isZero ? "—" : formatSignedUsd(amount);
  return <span className={`${cellClasses} ${amountColorClass(amount)}`}>{text}</span>;
}
