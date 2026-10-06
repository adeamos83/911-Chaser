import Link from "next/link";
import { signOut } from "@/app/actions";
import { StatusDot } from "./ui/StatusDot";

export type AppPage = "configure" | "garage" | "deals";

const NAV_LINKS: { page: AppPage; label: string; href: string }[] = [
  { page: "configure", label: "Configure", href: "/build" },
  { page: "garage", label: "Garage", href: "/garage" },
  { page: "deals", label: "Deals", href: "/deals" },
];

interface AppShellProps {
  activePage: AppPage;
  /** The status line next to the green dot, e.g. "Market data updated Oct 6, 2026". */
  status: string;
  signedIn: boolean;
  children: React.ReactNode;
}

/**
 * The frame around Configure, Garage and Deals: a warm grey page with one large card on it.
 * The card starts with the top bar (wordmark, page links, status, account button).
 */
export function AppShell({ activePage, status, signedIn, children }: AppShellProps) {
  return (
    <div className="flex min-h-screen justify-center bg-page px-3 py-4 sm:px-6 sm:py-8">
      <div className="w-full max-w-[1280px] overflow-hidden rounded-frame border border-black/[.08] bg-card shadow-card">
        <header className="flex flex-wrap items-center justify-between gap-4 px-5 pt-[22px] sm:px-9">
          <div className="flex items-center gap-7">
            <Link href="/" className="text-value font-bold tracking-[.14em] text-ink no-underline">
              911 CHASER
            </Link>
            <nav className="flex gap-[18px] text-small">
              {NAV_LINKS.map((link) => {
                const isActive = link.page === activePage;
                const stateClasses = isActive ? "font-semibold text-ink" : "text-muted hover:text-ink";
                return (
                  <Link key={link.page} href={link.href} className={`no-underline ${stateClasses}`} aria-current={isActive ? "page" : undefined}>
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-5">
            <StatusDot>{status}</StatusDot>
            <AccountButton signedIn={signedIn} />
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}

/** "Sign out" for members, "Log in" for visitors. Kept small so the status line stays the focus. */
function AccountButton({ signedIn }: { signedIn: boolean }) {
  const className = "cursor-pointer border-0 bg-transparent p-0 text-caption font-semibold text-muted no-underline hover:text-ink";
  if (!signedIn) {
    return (
      <Link href="/login" className={className}>
        Log in
      </Link>
    );
  }
  return (
    <form action={signOut}>
      <button className={className}>Sign out</button>
    </form>
  );
}
