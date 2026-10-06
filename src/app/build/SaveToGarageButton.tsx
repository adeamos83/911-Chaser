"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { BuildSpec } from "@/data/types";
import { PRIMARY_BUTTON } from "@/components/ui/buttonStyles";
import { configuratorLink, type PricedAt } from "@/lib/spec";
import { saveBuild } from "../actions";

interface SaveToGarageButtonProps {
  spec: BuildSpec;
  pricedAt: PricedAt;
  signedIn: boolean;
}

const BUTTON_CLASSES = `${PRIMARY_BUTTON} w-full p-3.5 text-[14px]`;

/**
 * Visitors: "Log in to save", which comes back to this exact build after logging in.
 * Members: "Save to garage", then "Saved. Open garage" once it's stored.
 */
export function SaveToGarageButton({ spec, pricedAt, signedIn }: SaveToGarageButtonProps) {
  const [status, setStatus] = useState<{ saved?: boolean; error?: string }>({});
  // pending is true while the save request is running.
  const [pending, startTransition] = useTransition();

  // Any change to the build means it hasn't been saved yet.
  useEffect(() => {
    setStatus({});
  }, [spec, pricedAt.modelYear, pricedAt.mileage]);

  if (!signedIn) {
    const returnTo = configuratorLink(spec, pricedAt);
    return (
      <Link href={`/login?next=${encodeURIComponent(returnTo)}`} className={BUTTON_CLASSES}>
        Log in to save to garage
      </Link>
    );
  }

  if (status.saved) {
    return (
      <Link href="/garage" className={BUTTON_CLASSES}>
        Saved. Open garage →
      </Link>
    );
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await saveBuild(spec, pricedAt);
      setStatus(result.error ? { error: result.error } : { saved: true });
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={handleSave} disabled={pending} className={`${BUTTON_CLASSES} cursor-pointer border-0`}>
        {pending ? "Saving…" : "Save to garage"}
      </button>
      {status.error && <p className="text-caption text-negative">{status.error}</p>}
    </div>
  );
}
