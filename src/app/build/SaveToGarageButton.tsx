"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { BuildSpec } from "@/data/types";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "@/components/ui/buttonStyles";
import { configuratorLink, type PricedAt } from "@/lib/spec";
import { saveBuild, updateBuild } from "../actions";

interface SaveToGarageButtonProps {
  spec: BuildSpec;
  pricedAt: PricedAt;
  signedIn: boolean;
  /** Set when editing a saved build: the main button updates it, and a second one saves a copy. */
  editBuildId?: string;
}

const BUTTON_CLASSES = `${PRIMARY_BUTTON} w-full p-3.5 text-[14px]`;

/**
 * Visitors: "Log in to save", which comes back to this exact build after logging in.
 * Members: "Save to garage", then "Saved. Open garage" once it's stored.
 * Editing a saved build: "Update build" changes it in place, "Save as new build" adds a copy.
 */
export function SaveToGarageButton({ spec, pricedAt, signedIn, editBuildId }: SaveToGarageButtonProps) {
  const [status, setStatus] = useState<{ saved?: "updated" | "added"; error?: string }>({});
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
        {status.saved === "updated" ? "Updated" : "Saved"}. Open garage →
      </Link>
    );
  }

  const saveAsNewBuild = () => {
    startTransition(async () => {
      const result = await saveBuild(spec, pricedAt);
      setStatus(result.error ? { error: result.error } : { saved: "added" });
    });
  };

  const updateSavedBuild = (buildId: string) => {
    startTransition(async () => {
      const result = await updateBuild(buildId, spec, pricedAt);
      setStatus(result.error ? { error: result.error } : { saved: "updated" });
    });
  };

  const isEditing = editBuildId !== undefined;
  const mainAction = isEditing ? () => updateSavedBuild(editBuildId) : saveAsNewBuild;
  let mainLabel = isEditing ? "Update build" : "Save to garage";
  if (pending) mainLabel = "Saving…";

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={mainAction} disabled={pending} className={`${BUTTON_CLASSES} cursor-pointer border-0`}>
        {mainLabel}
      </button>
      {isEditing && (
        <button
          type="button"
          onClick={saveAsNewBuild}
          disabled={pending}
          className={`${OUTLINE_BUTTON} w-full cursor-pointer rounded-input p-3 text-small`}
        >
          Save as new build
        </button>
      )}
      {status.error && <p className="text-caption text-negative">{status.error}</p>}
    </div>
  );
}
