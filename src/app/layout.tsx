import type { Metadata } from "next";
import Link from "next/link";
import { Archivo, Instrument_Serif } from "next/font/google";
import { signOut } from "./actions";
import { createClient } from "@/lib/supabase/server";
import "./globals.css";

const serif = Instrument_Serif({ subsets: ["latin"], weight: "400", variable: "--font-serif" });
const body = Archivo({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "Dream 911 Chaser",
  description: "Spec a 991 or 992 Porsche 911 and see what it costs, which options hold value, and where the deals are.",
};

/** Shared page shell: fonts, the top nav, and a sign-in or sign-out button. */
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className={`${serif.variable} ${body.variable}`}>
      <body className="min-h-screen">
        <header className="sticky top-0 z-20 border-b border-line/70 bg-bg/80 backdrop-blur">
          <nav className="mx-auto flex max-w-7xl items-center gap-4 px-5 py-4 text-sm">
            <Link href="/" className="whitespace-nowrap font-display text-xl tracking-tight">
              Dream 911 <span className="italic text-accent">Chaser</span>
            </Link>
            <div className="ml-auto flex items-center gap-3 whitespace-nowrap text-muted sm:gap-5">
              <Link href="/build" className="hover:text-ink">Build</Link>
              <Link href="/deals" className="hover:text-ink">Deals</Link>
              <Link href="/garage" className="hover:text-ink">Garage</Link>
              {user ? (
                <form action={signOut}>
                  <button className="rounded-full border border-line px-3 py-1.5 hover:border-ink hover:text-ink" title={user.email}>
                    Sign out
                  </button>
                </form>
              ) : (
                <Link href="/login" className="rounded-full bg-ink px-3.5 py-1.5 text-bg hover:bg-white">
                  Sign in
                </Link>
              )}
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
