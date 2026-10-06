import { useEffect, useRef, useState, useTransition } from "react";
import type { BuildSpec } from "@/data/types";
import { configuratorLink, type PricedAt } from "@/lib/spec";
import { analyzeSpec } from "../actions";

export type Analysis = Awaited<ReturnType<typeof analyzeSpec>>;

/** Wait this long after the last change before asking the server, so dragging a slider sends one request. */
const DEBOUNCE_MS = 120;

/**
 * Keeps the price analysis in sync with the build the user is configuring.
 *
 * Every time the spec, model year or mileage changes, it:
 *   1. Updates the URL so the build can be shared or bookmarked.
 *   2. Waits briefly, then asks the server for a fresh analysis.
 *   3. Ignores any answer that comes back after a newer request was sent.
 *
 * It skips the very first render, because the server already sent the initial analysis.
 * `pending` is true while a request is in flight, so the UI can dim stale numbers.
 */
export function useLiveAnalysis(spec: BuildSpec, pricedAt: PricedAt, initialAnalysis: Analysis) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [pending, startTransition] = useTransition();
  // Refs (not state) because changing them must not trigger a re-render.
  const isFirstRender = useRef(true);
  const latestRequestId = useRef(0);
  const { modelYear, mileage } = pricedAt;

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    window.history.replaceState(null, "", configuratorLink(spec, { modelYear, mileage }));

    latestRequestId.current += 1;
    const requestId = latestRequestId.current;

    const fetchAnalysis = () => {
      startTransition(async () => {
        const nextAnalysis = await analyzeSpec(spec, { modelYear, mileage });
        // Rapid changes can resolve out of order; only the newest request may update the screen.
        if (requestId === latestRequestId.current) setAnalysis(nextAnalysis);
      });
    };
    const timer = setTimeout(fetchAnalysis, DEBOUNCE_MS);
    // If anything changes again before the timer fires, cancel this request.
    return () => clearTimeout(timer);
  }, [spec, modelYear, mileage]);

  return { analysis, pending };
}
