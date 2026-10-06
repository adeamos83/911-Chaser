import { useEffect, useRef, useState, useTransition } from "react";
import type { BuildSpec } from "@/data/types";
import { specToQuery } from "@/lib/spec";
import { analyzeSpec } from "../actions";

export type Analysis = Awaited<ReturnType<typeof analyzeSpec>>;

/** Wait this long after the last click before asking the server, so fast clicking sends one request. */
const DEBOUNCE_MS = 120;

/**
 * Keeps the price analysis in sync with the spec the user is building.
 *
 * Every time the spec or mileage changes, it:
 *   1. Updates the URL so the build can be shared or bookmarked.
 *   2. Waits briefly, then asks the server for a fresh analysis.
 *   3. Ignores any answer that comes back after a newer request was sent.
 *
 * It skips the very first render, because the server already sent the initial analysis.
 * `pending` is true while a request is in flight, so the UI can dim stale numbers.
 */
export function useLiveAnalysis(spec: BuildSpec, mileage: number | undefined, initialAnalysis: Analysis) {
  const [analysis, setAnalysis] = useState(initialAnalysis);
  const [pending, startTransition] = useTransition();
  const isFirstRender = useRef(true);
  const latestRequestId = useRef(0);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    window.history.replaceState(null, "", `/build?${specToQuery(spec)}`);

    const requestId = ++latestRequestId.current;
    const timer = setTimeout(
      () =>
        startTransition(async () => {
          const next = await analyzeSpec(spec, mileage);
          // Rapid clicks can resolve out of order; only the newest request may update the screen.
          if (requestId === latestRequestId.current) setAnalysis(next);
        }),
      DEBOUNCE_MS,
    );
    // If the spec changes again before the timer fires, cancel this request.
    return () => clearTimeout(timer);
  }, [spec, mileage]);

  return { analysis, pending };
}
