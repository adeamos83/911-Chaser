"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCard, type AuthTab } from "@/components/auth/AuthCard";
import { Eyebrow } from "@/components/ui/Eyebrow";
import { StatusDot } from "@/components/ui/StatusDot";
import { OUTLINE_BUTTON, PRIMARY_BUTTON } from "@/components/ui/buttonStyles";
import { signOut } from "./actions";

const NAV_PILL = "rounded-pill px-3.5 py-[9px] text-small";
const HERO_BUTTON = "px-[22px] py-[15px] text-value";

interface HomeTopProps {
  /** The signed-in member's email, or null for visitors. */
  memberEmail: string | null;
  /** The line next to the green dot under the hero buttons. */
  sourceLine: string;
}

/**
 * The top of the home page: navigation, the hero, and the account card.
 * The nav and hero buttons switch the card between "Log in" and "Create account",
 * so all three share the tab state here.
 */
export function HomeTop({ memberEmail, sourceLine }: HomeTopProps) {
  const [tab, setTab] = useState<AuthTab>("login");
  const isMember = memberEmail !== null;

  return (
    <>
      <nav className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center justify-between gap-4 px-5 py-[26px] sm:px-12">
        <div className="text-value font-bold tracking-[.14em]">911 CHASER</div>
        <div className="flex flex-wrap items-center gap-[22px] text-small">
          <Link href="/deals" className="text-muted no-underline hover:text-ink">
            Deals
          </Link>
          <Link href="/build" className="text-muted no-underline hover:text-ink">
            Pricing model
          </Link>
          {isMember ? (
            <>
              <Link href="/garage" className={`${OUTLINE_BUTTON} ${NAV_PILL}`}>
                Garage
              </Link>
              <Link href="/build" className={`${PRIMARY_BUTTON} ${NAV_PILL}`}>
                Open configurator
              </Link>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setTab("login")} className={`${OUTLINE_BUTTON} ${NAV_PILL} cursor-pointer`}>
                Log in
              </button>
              <button type="button" onClick={() => setTab("signup")} className={`${PRIMARY_BUTTON} ${NAV_PILL} cursor-pointer border-0`}>
                Create account
              </button>
            </>
          )}
        </div>
      </nav>

      <section className="mx-auto flex w-full max-w-[1280px] flex-wrap items-center gap-12 px-5 pt-10 sm:px-12">
        <div className="min-w-0 flex-[1_1_420px]">
          <Eyebrow className="tracking-[.12em]">Porsche 911 · 991 and 992</Eyebrow>
          <h1 className="mt-3.5 text-[44px] leading-[1.02] font-semibold tracking-[-.03em] text-balance sm:text-[60px]">
            Chase the 911 you want.
          </h1>
          <p className="mt-[22px] max-w-[520px] text-[17px] leading-normal text-body text-pretty">
            Build the exact 911 you dream about, down to the paint and options. See what it really sells for, and spot the
            ones listed under the market before anyone else does.
          </p>
          <div className="mt-[30px] flex flex-wrap gap-2.5">
            {isMember ? (
              <>
                <Link href="/build" className={`${PRIMARY_BUTTON} ${HERO_BUTTON}`}>
                  Open configurator
                </Link>
                <Link href="/garage" className={`${OUTLINE_BUTTON} ${HERO_BUTTON} border-line-strong`}>
                  Go to garage
                </Link>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setTab("signup")} className={`${PRIMARY_BUTTON} ${HERO_BUTTON} cursor-pointer border-0`}>
                  Start chasing, free
                </button>
                <button type="button" onClick={() => setTab("login")} className={`${OUTLINE_BUTTON} ${HERO_BUTTON} cursor-pointer border-line-strong`}>
                  Log in
                </button>
              </>
            )}
          </div>
          <div className="mt-[22px]">
            <StatusDot>{sourceLine}</StatusDot>
          </div>
        </div>

        <div className="w-full flex-[0_1_400px]">
          {isMember ? <MemberCard email={memberEmail} /> : <AuthCard tab={tab} onTabChange={setTab} />}
        </div>
      </section>
    </>
  );
}

/** Takes the account card's place for members: where to go next, and sign out. */
function MemberCard({ email }: { email: string }) {
  return (
    <div className="w-full rounded-auth border border-hairline bg-surface p-[26px] shadow-auth">
      <h2 className="text-[22px] font-semibold tracking-[-.01em]">Welcome back</h2>
      <p className="mt-1 truncate text-small text-muted">Logged in as {email}</p>
      <div className="mt-5 flex flex-col gap-2.5">
        <Link href="/build" className={`${PRIMARY_BUTTON} rounded-input p-3.5 text-[14px]`}>
          Open configurator
        </Link>
        <Link href="/garage" className={`${OUTLINE_BUTTON} rounded-input p-3 text-small`}>
          Go to your garage
        </Link>
      </div>
      <form action={signOut} className="mt-4 text-center">
        <button className="cursor-pointer border-0 bg-transparent p-0 text-caption font-semibold text-muted hover:text-ink">Sign out</button>
      </form>
    </div>
  );
}
