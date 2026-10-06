"use client";

import { useActionState, useState } from "react";
import { authenticate, type AuthState } from "./actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/limits";

// Shared demo login so visitors can try the garage without signing up.
const DEMO = { email: "demo@dream911chaser.com", password: "FlatSix911!" };


type Mode = "signin" | "signup";

function submitLabel(pending: boolean, mode: Mode) {
  if (pending) return "One moment…";
  return mode === "signin" ? "Continue" : "Create account";
}

/** Email and password form with tabs for signing in or creating an account. */
export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState<AuthState, FormData>(authenticate, {});

  return (
    <form action={action} className="mt-8 space-y-4">
      <div role="tablist" className="flex rounded-full border border-line p-1 text-xs uppercase tracking-widest">
        {(["signin", "signup"] as const).map((tabMode) => (
          <button
            key={tabMode}
            type="button"
            role="tab"
            aria-selected={mode === tabMode}
            onClick={() => setMode(tabMode)}
            className={`flex-1 rounded-full py-2 ${mode === tabMode ? "bg-line text-ink" : "text-muted hover:text-ink"}`}
          >
            {tabMode === "signin" ? "Existing account" : "New account"}
          </button>
        ))}
      </div>
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="eyebrow">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2.5 outline-none focus:border-accent"
        />
      </label>
      <label className="block">
        <span className="eyebrow">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={MIN_PASSWORD_LENGTH}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2.5 outline-none focus:border-accent"
        />
      </label>
      {state.error && <p className="text-sm text-pit">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-full bg-ink py-3 font-medium text-bg hover:bg-white disabled:opacity-50">
        {submitLabel(pending, mode)}
      </button>
      {mode === "signin" && (
        <button
          type="button"
          onClick={() => {
            setEmail(DEMO.email);
            setPassword(DEMO.password);
          }}
          className="w-full text-center text-sm text-muted underline hover:text-ink"
        >
          Use demo account
        </button>
      )}
    </form>
  );
}
