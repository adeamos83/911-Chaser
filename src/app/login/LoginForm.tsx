"use client";

import { useActionState, useState } from "react";
import { authenticate, type AuthState } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [state, action, pending] = useActionState<AuthState, FormData>(authenticate, {});

  return (
    <form action={action} className="mt-8 space-y-4">
      <div className="flex rounded-full border border-line p-1 text-sm">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`flex-1 rounded-full py-2 ${mode === m ? "bg-ink text-bg" : "text-muted"}`}
          >
            {m === "signin" ? "Sign in" : "Create account"}
          </button>
        ))}
      </div>
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="eyebrow">Email</span>
        <input name="email" type="email" required autoComplete="email" className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2.5 outline-none focus:border-accent" />
      </label>
      <label className="block">
        <span className="eyebrow">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2.5 outline-none focus:border-accent"
        />
      </label>
      {state.error && <p className="text-sm text-pit">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-full bg-ink py-3 font-medium text-bg hover:bg-white disabled:opacity-50">
        {pending ? "One moment…" : mode === "signin" ? "Sign in" : "Create account"}
      </button>
    </form>
  );
}
