import { BODIES, GENERATIONS, bodiesFor, colorDef, colorsFor, trimSpec, trimsFor } from "@/data/catalog";
import type { BuildSpec, ColorTier } from "@/data/types";
import { Car911 } from "@/components/Car911";
import { usdK } from "@/lib/spec";

const COLOR_TIERS: ColorTier[] = ["Standard", "Metallic", "Special", "PTS"];
const GEARBOXES = ["Manual", "PDK"] as const;

interface Props {
  spec: BuildSpec;
  onChange: (patch: Partial<BuildSpec>) => void;
}

/** Left column: the car preview plus the generation, model, body, gearbox and paint pickers. */
export function BuildPicker({ spec, onChange }: Props) {
  const paint = colorDef(spec.color)!;
  const trim = trimSpec(spec.generation, spec.trim)!;

  return (
    <section className="lg:sticky lg:top-20 lg:self-start">
      <p className="eyebrow">Configurator</p>
      <h1 className="mt-2 font-display text-5xl leading-none">
        {spec.generation} <span className="italic text-accent">{spec.trim}</span>
      </h1>
      <p className="mt-2 text-sm text-muted">
        {trim.hp} hp · 0-60 in {trim.zeroToSixty}s · {trim.years[0]}-{trim.years[1]} · {usdK(trim.baseMsrp)} base MSRP
      </p>

      <Car911 color={paint.hex} className="mt-4 w-full" />
      <p className="text-center text-sm text-muted">
        {paint.name} <span className="eyebrow ml-2">{paint.tier}</span>
      </p>

      <div className="mt-6 space-y-5">
        <ChoiceRow label="Generation">
          {GENERATIONS.map((generation) => (
            <ChoiceButton key={generation} active={spec.generation === generation} onClick={() => onChange({ generation })}>
              {generation}
            </ChoiceButton>
          ))}
        </ChoiceRow>

        <ChoiceRow label="Model">
          {trimsFor(spec.generation).map((t) => (
            <ChoiceButton key={t.trim} active={spec.trim === t.trim} onClick={() => onChange({ trim: t.trim })}>
              {t.trim}
            </ChoiceButton>
          ))}
        </ChoiceRow>

        <ChoiceRow label="Body">
          {BODIES.map((body) => {
            const available = bodiesFor(spec.trim).includes(body);
            return (
              <ChoiceButton
                key={body}
                active={spec.body === body}
                disabled={!available}
                title={available ? undefined : "Targa is AWD only (4S, GTS)"}
                onClick={() => onChange({ body })}
              >
                {body}
              </ChoiceButton>
            );
          })}
        </ChoiceRow>

        <ChoiceRow label="Gearbox">
          {GEARBOXES.map((transmission) => {
            const available = transmission === "PDK" || trim.manualAvailable;
            return (
              <ChoiceButton
                key={transmission}
                active={spec.transmission === transmission}
                disabled={!available}
                title={available ? undefined : `No manual for the ${spec.generation} ${spec.trim}`}
                onClick={() => onChange({ transmission })}
              >
                {transmission}
              </ChoiceButton>
            );
          })}
        </ChoiceRow>

        <div>
          <p className="eyebrow mb-2">Paint</p>
          <div className="space-y-2">
            {COLOR_TIERS.map((tier) => {
              const colors = colorsFor(spec.generation).filter((c) => c.tier === tier);
              if (!colors.length) return null;
              return (
                <div key={tier} className="flex items-center gap-3">
                  <span className="w-20 text-xs text-muted">{tier}</span>
                  <div className="flex flex-wrap gap-2">
                    {colors.map((c) => (
                      <button
                        key={c.name}
                        title={c.name}
                        aria-label={c.name}
                        onClick={() => onChange({ color: c.name })}
                        className={`h-7 w-7 rounded-full border transition ${spec.color === c.name ? "scale-110 ring-2 ring-ink ring-offset-2 ring-offset-bg" : "border-white/20 hover:scale-110"}`}
                        style={{ background: c.hex }}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function ChoiceRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/** A pill-shaped button for picking one choice from a row. Disabled choices are struck through. */
function ChoiceButton({
  active,
  disabled,
  title,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  title?: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`rounded-full border px-3.5 py-1.5 text-sm transition ${
        active ? "border-ink bg-ink text-bg" : "border-line text-ink hover:border-muted"
      } disabled:cursor-not-allowed disabled:border-line/50 disabled:text-muted/40 disabled:line-through`}
    >
      {children}
    </button>
  );
}
