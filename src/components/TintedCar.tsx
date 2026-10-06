import Image from "next/image";

/** A grey 992 side profile on a transparent background (1325 x 443). It gets painted at runtime. */
const CAR_IMAGE_PATH = "/911.png";
const CAR_IMAGE_WIDTH = 1325;
const CAR_IMAGE_HEIGHT = 443;

interface TintedCarProps {
  /** Paint color, e.g. "#2b80b9". */
  paintHex: string;
  /** Describes the car for screen readers, e.g. "Porsche 911 in Shark Blue". */
  label: string;
  className?: string;
  /** Width the browser should expect, for picking the image size, e.g. "720px". */
  sizes?: string;
  /** Load the image right away. Use it for the big car at the top of a page. */
  priority?: boolean;
}

/**
 * Paints the grey car photo in any color, with no canvas work:
 *   1. Draw the grey photo.
 *   2. Lay the paint color on top in "color" blend mode, which keeps the photo's shading.
 *   3. Lay it again in "luminosity" mode, which pulls the brightness toward the paint.
 * Both color layers are masked by the photo's own shape, so only the car gets painted.
 * Same recipe as the design: color at 88% strength, then luminosity at 60%.
 */
export function TintedCar({ paintHex, label, className = "", sizes = "720px", priority = false }: TintedCarProps) {
  const paintLayerStyle: React.CSSProperties = {
    backgroundColor: paintHex,
    maskImage: `url(${CAR_IMAGE_PATH})`,
    maskSize: "contain",
    maskRepeat: "no-repeat",
    maskPosition: "center",
    WebkitMaskImage: `url(${CAR_IMAGE_PATH})`,
    WebkitMaskSize: "contain",
    WebkitMaskRepeat: "no-repeat",
    WebkitMaskPosition: "center",
    transition: "background-color 150ms",
  };

  return (
    <div role="img" aria-label={label} className={`relative isolate ${className}`}>
      <Image
        src={CAR_IMAGE_PATH}
        alt=""
        width={CAR_IMAGE_WIDTH}
        height={CAR_IMAGE_HEIGHT}
        sizes={sizes}
        priority={priority}
        className="absolute inset-0 h-full w-full object-contain"
      />
      <div className="absolute inset-0 opacity-[.88] mix-blend-color" style={paintLayerStyle} />
      <div className="absolute inset-0 opacity-60 mix-blend-luminosity" style={paintLayerStyle} />
    </div>
  );
}
