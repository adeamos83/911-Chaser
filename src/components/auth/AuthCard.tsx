"use client";

import { startTransition, useActionState, useId, useState } from "react";
import { authenticate, type AuthState } from "@/app/login/actions";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "@/components/ui/buttonStyles";
import { MIN_PASSWORD_LENGTH } from "@/lib/limits";

export type AuthTab = "login" | "signup";

// Shared demo login so visitors can try the garage without signing up.
const DEMO_ACCOUNT = { email: "demo@dream911chaser.com", password: "FlatSix911!" };

const TAB_OPTIONS: { value: AuthTab; label: string }[] = [
  { value: "login", label: "Log in" },
  { value: "signup", label: "Create account" },
];

/** Every piece of text that changes between the two tabs. */
const TAB_COPY = {
  login: {
    title: "Welcome back",
    subtitle: "Your dream garage and new deals are waiting.",
    submit: "Log in",
    footerQuestion: "New to 911 Chaser?",
    footerLink: "Create one",
  },
  signup: {
    title: "Start chasing your 911",
    subtitle: "Free. Save your dream builds and see the deals that match them.",
    submit: "Start chasing",
    footerQuestion: "Already have an account?",
    footerLink: "Log in",
  },
};

const INPUT_CLASSES =
  "w-full rounded-input border border-line bg-card px-3.5 py-[13px] text-[14px] text-ink outline-none placeholder:text-muted focus:border-ink";
const LABEL_CLASSES = "mb-1 block text-caption font-medium text-body";

interface AuthCardProps {
  tab: AuthTab;
  onTabChange: (tab: AuthTab) => void;
  /** Where to go after logging in, e.g. "/garage". */
  next?: string;
}

/** The "Log in | Create account" card: tabs, email and password fields, a demo shortcut, and a link to switch tabs. */
export function AuthCard({ tab, onTabChange, next }: AuthCardProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [state, formAction, pending] = useActionState<AuthState, FormData>(authenticate, {});
  const copy = TAB_COPY[tab];
  const isSignup = tab === "signup";
  const otherTab: AuthTab = isSignup ? "login" : "signup";
  const fieldId = useId();

  // Logs straight in, rather than just filling the form and leaving the visitor to press Log in.
  const logInWithDemoAccount = () => {
    onTabChange("login");
    setEmail(DEMO_ACCOUNT.email);
    setPassword(DEMO_ACCOUNT.password);
    const formData = new FormData();
    formData.set("mode", "login");
    if (next) formData.set("next", next);
    formData.set("email", DEMO_ACCOUNT.email);
    formData.set("password", DEMO_ACCOUNT.password);
    startTransition(() => formAction(formData));
  };

  return (
    <div id="account" className="w-full rounded-auth border border-hairline bg-surface p-[26px] shadow-auth">
      <SegmentedControl ariaLabel="Log in or create an account" size="large" fullWidth options={TAB_OPTIONS} selectedValue={tab} onSelect={onTabChange} />

      <h2 className="mt-[22px] text-[22px] font-semibold tracking-[-.01em]">{copy.title}</h2>
      <p className="mt-1 text-small text-muted">{copy.subtitle}</p>

      <form action={formAction} className="mt-5 flex flex-col gap-2.5">
        <input type="hidden" name="mode" value={tab} />
        {next && <input type="hidden" name="next" value={next} />}
        {isSignup && (
          <div>
            <label htmlFor={`${fieldId}-name`} className={LABEL_CLASSES}>
              Full name
            </label>
            <input id={`${fieldId}-name`} name="fullName" placeholder="Jane Driver" autoComplete="name" className={INPUT_CLASSES} />
          </div>
        )}
        <div>
          <label htmlFor={`${fieldId}-email`} className={LABEL_CLASSES}>
            Email
          </label>
          <input
            id={`${fieldId}-email`}
            name="email"
            type="email"
            placeholder="you@example.com"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={INPUT_CLASSES}
          />
        </div>
        <div>
          <label htmlFor={`${fieldId}-password`} className={LABEL_CLASSES}>
            Password
          </label>
          <input
            id={`${fieldId}-password`}
            name="password"
            type="password"
            placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
            required
            minLength={MIN_PASSWORD_LENGTH}
            autoComplete={isSignup ? "new-password" : "current-password"}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className={INPUT_CLASSES}
          />
        </div>
        {state.error && <p className="text-caption text-negative">{state.error}</p>}
        <button disabled={pending} className={`${PRIMARY_BUTTON} mt-1 cursor-pointer rounded-input border-0 p-3.5 text-[14px]`}>
          {pending ? "One moment…" : copy.submit}
        </button>
      </form>

      <div className="mt-[18px] mb-3.5 flex items-center gap-3 text-micro text-muted">
        <span className="h-px flex-1 bg-ink/10" />
        or
        <span className="h-px flex-1 bg-ink/10" />
      </div>
      <button
        type="button"
        onClick={logInWithDemoAccount}
        disabled={pending}
        className={`${OUTLINE_BUTTON} w-full cursor-pointer rounded-input p-3 text-small`}
      >
        Try the demo account
      </button>

      <p className="mt-4 text-center text-caption text-muted">
        {copy.footerQuestion}{" "}
        <button type="button" onClick={() => onTabChange(otherTab)} className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-ink">
          {copy.footerLink}
        </button>
      </p>
    </div>
  );
}
