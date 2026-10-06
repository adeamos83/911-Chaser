import { Eyebrow } from "./ui/Eyebrow";

interface PageTitleProps {
  /** Small uppercase label, e.g. "Garage". */
  eyebrow: string;
  /** The big headline, e.g. "5 dream builds". */
  headline: React.ReactNode;
  /** Optional muted line under the headline. */
  description?: React.ReactNode;
  /** Optional content on the right: stats, a sort control. */
  aside?: React.ReactNode;
}

/** The title block at the top of Garage and Deals: eyebrow, 40px headline, and an optional right side. */
export function PageTitle({ eyebrow, headline, description, aside }: PageTitleProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-6 px-5 pt-[34px] sm:px-9">
      <div>
        <Eyebrow>{eyebrow}</Eyebrow>
        <h1 className="mt-1.5 text-[32px] leading-[1.1] font-semibold tracking-[-.02em] sm:text-[40px]">{headline}</h1>
        {description && <p className="mt-2 max-w-[620px] text-small text-muted text-pretty">{description}</p>}
      </div>
      {aside}
    </div>
  );
}
