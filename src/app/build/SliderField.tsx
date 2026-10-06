import { Eyebrow } from "@/components/ui/Eyebrow";
import { Slider } from "@/components/ui/Slider";

interface SliderFieldProps {
  label: string;
  /** The value as shown in the header, e.g. "9,800 mi". */
  valueText: string;
  minimum: number;
  maximum: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  /** Labels under each end of the track, e.g. "0 mi" and "80,000 mi". */
  minimumLabel: string;
  maximumLabel: string;
}

/** A slider with its label and current value above it, and the range ends below it. */
export function SliderField({ label, valueText, minimum, maximum, step, value, onChange, minimumLabel, maximumLabel }: SliderFieldProps) {
  return (
    <div>
      <div className="mb-3.5 flex flex-wrap items-baseline justify-between gap-3">
        <Eyebrow>{label}</Eyebrow>
        <span className="tabular text-value font-semibold">{valueText}</span>
      </div>
      <Slider
        label={label}
        minimum={minimum}
        maximum={maximum}
        step={step}
        value={value}
        onChange={onChange}
        valueText={valueText}
      />
      <div className="mt-1 flex justify-between text-micro text-muted">
        <span>{minimumLabel}</span>
        <span>{maximumLabel}</span>
      </div>
    </div>
  );
}
