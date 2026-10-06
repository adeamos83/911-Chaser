import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import type { BuildSpec } from "@/data/types";
import { defaultBuildName, specToQuery } from "@/lib/spec";
import { saveBuild } from "../actions";

/** Signed out: a "Sign in to save" link. Signed in: a name field and a "Save to Garage" button. */
export function SaveButton({ spec, signedIn }: { spec: BuildSpec; signedIn: boolean }) {
  const [name, setName] = useState(defaultBuildName(spec));
  const [status, setStatus] = useState<{ saved?: boolean; error?: string }>({});
  const [pending, startTransition] = useTransition();

  // When the spec changes, suggest a fresh name and clear the old "Saved" message.
  useEffect(() => {
    setName(defaultBuildName(spec));
    setStatus({});
  }, [spec]);

  if (!signedIn) {
    const returnTo = `/build?${specToQuery(spec)}`;
    return (
      <Link href={`/login?next=${encodeURIComponent(returnTo)}`} className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg hover:bg-white">
        Sign in to save
      </Link>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const result = await saveBuild(name, spec);
      setStatus(result.error ? { error: result.error } : { saved: true });
    });
  };

  return (
    <form className="flex flex-wrap items-center gap-2" onSubmit={handleSubmit}>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} aria-label="Build name" className="w-56 rounded-full border border-line bg-bg px-4 py-2 text-sm outline-none focus:border-accent" />
      <button disabled={pending} className="rounded-full bg-ink px-5 py-2.5 text-sm font-medium text-bg hover:bg-white disabled:opacity-50">
        {pending ? "Saving…" : "Save to Garage"}
      </button>
      {status.saved && (
        <Link href="/garage" className="text-sm text-holder">Saved. View garage →</Link>
      )}
      {status.error && <span className="text-sm text-pit">{status.error}</span>}
    </form>
  );
}
