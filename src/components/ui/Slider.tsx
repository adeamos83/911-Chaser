"use client";

import { useRef } from "react";

interface SliderProps {
  /** Read out by screen readers, e.g. "Model year". */
  label: string;
  minimum: number;
  maximum: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  /** How the value is read out, e.g. "9,800 mi". */
  valueText: string;
}

/** Keyboard steps: arrows move one step, Page Up / Page Down move ten. */
const BIG_STEP_MULTIPLIER = 10;

/**
 * A drag slider: a thin track, a dark fill up to the value, and a round thumb.
 * Dragging uses pointer capture, so the drag keeps working when the pointer leaves the track.
 */
export function Slider({ label, minimum, maximum, step, value, onChange, valueText }: SliderProps) {
  const isDragging = useRef(false);
  const range = maximum - minimum;
  const hasRange = range > 0;
  // How far along the track the thumb sits, from 0 to 100.
  const filledPercent = hasRange ? ((value - minimum) / range) * 100 : 100;

  /** Snaps a raw value to the nearest step and keeps it inside the track. */
  const snapToStep = (rawValue: number) => {
    const stepped = Math.round(rawValue / step) * step;
    return Math.min(maximum, Math.max(minimum, stepped));
  };

  /** Turns the pointer's horizontal position into a value and reports it. */
  const updateFromPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const track = event.currentTarget.getBoundingClientRect();
    const shareOfTrack = Math.min(1, Math.max(0, (event.clientX - track.left) / track.width));
    const nextValue = snapToStep(minimum + shareOfTrack * range);
    if (nextValue !== value) onChange(nextValue);
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!hasRange) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    isDragging.current = true;
    updateFromPointer(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging.current) updateFromPointer(event);
  };

  const stopDragging = () => {
    isDragging.current = false;
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const keySteps: Record<string, number> = {
      ArrowRight: step,
      ArrowUp: step,
      ArrowLeft: -step,
      ArrowDown: -step,
      PageUp: step * BIG_STEP_MULTIPLIER,
      PageDown: -step * BIG_STEP_MULTIPLIER,
    };
    if (event.key === "Home") onChange(minimum);
    else if (event.key === "End") onChange(maximum);
    else if (event.key in keySteps) onChange(snapToStep(value + keySteps[event.key]));
    else return;
    event.preventDefault();
  };

  return (
    <div
      role="slider"
      tabIndex={hasRange ? 0 : -1}
      aria-label={label}
      aria-valuemin={minimum}
      aria-valuemax={maximum}
      aria-valuenow={value}
      aria-valuetext={valueText}
      aria-disabled={!hasRange}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={stopDragging}
      onPointerCancel={stopDragging}
      onKeyDown={handleKeyDown}
      className={`relative h-7 touch-none select-none rounded-pill outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${hasRange ? "cursor-pointer" : "cursor-default"}`}
    >
      <div className="absolute top-3 right-0 left-0 h-1 rounded-[2px] bg-track" />
      <div className="absolute top-3 left-0 h-1 rounded-[2px] bg-ink" style={{ width: `${filledPercent}%` }} />
      <div
        className="absolute top-[3px] h-[22px] w-[22px] rounded-full border border-line-strong bg-surface shadow-thumb"
        style={{ left: `calc(${filledPercent}% - 11px)` }}
      />
    </div>
  );
}
