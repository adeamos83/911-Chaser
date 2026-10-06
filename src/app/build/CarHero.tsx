import { TintedCar } from "@/components/TintedCar";
import { softGlowColor } from "@/lib/paint";

interface CarHeroProps {
  paintHex: string;
  paintName: string;
  /** Top-left caption, e.g. "2022 992.1 · Carrera S". */
  leftCaption: string;
  /** Top-right caption, e.g. "Shark Blue · Manual". */
  rightCaption: string;
}

/** The big car in the middle of the configurator, sitting on a soft glow of its own paint color. */
export function CarHero({ paintHex, paintName, leftCaption, rightCaption }: CarHeroProps) {
  const glow = `radial-gradient(ellipse 70% 60% at 50% 60%, ${softGlowColor(paintHex)}, rgba(246,243,237,0) 70%)`;

  return (
    <div className="relative flex h-[260px] items-center justify-center rounded-hero sm:h-[400px]" style={{ background: glow }}>
      <TintedCar
        paintHex={paintHex}
        label={`Porsche 911 side profile in ${paintName}`}
        className="aspect-[720/340] w-full max-w-[720px]"
        priority
      />
      <div className="absolute top-4 left-[18px] text-caption text-muted">{leftCaption}</div>
      <div className="absolute top-4 right-[18px] text-caption text-muted">{rightCaption}</div>
    </div>
  );
}
