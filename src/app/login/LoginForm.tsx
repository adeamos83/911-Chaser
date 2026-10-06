"use client";

import { useActionState, useState } from "react";
import { authenticate, type AuthState } from "./actions";

const DEMO = { email: "demo@dream911chaser.com", password: "FlatSix911!" };

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, action, pending] = useActionState<AuthState, FormData>(authenticate, {});

  return (
    <form action={action} className="mt-8 space-y-4">
      <div role="tablist" className="flex rounded-full border border-line p-1 text-xs uppercase tracking-widest">
        {(["signin", "signup"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-full py-2 ${mode === m ? "bg-line text-ink" : "text-muted hover:text-ink"}`}
          >
            {m === "signin" ? "Existing account" : "New account"}
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
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2.5 outline-none focus:border-accent"
        />
      </label>
      <label className="block">
        <span className="eyebrow">Password</span>
        <input
          name="password"
          type="password"
          required
          minLength={6}
          autoComplete={mode === "signin" ? "current-password" : "new-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 w-full rounded-lg border border-line bg-panel px-3 py-2.5 outline-none focus:border-accent"
        />
      </label>
      {state.error && <p className="text-sm text-pit">{state.error}</p>}
      <button disabled={pending} className="w-full rounded-full bg-ink py-3 font-medium text-bg hover:bg-white disabled:opacity-50">
        {pending ? "One moment…" : mode === "signin" ? "Continue" : "Create account"}
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
