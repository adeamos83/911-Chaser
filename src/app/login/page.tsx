import Link from "next/link";
import { LoginPanel } from "./LoginPanel";

/** Log in page. `next` is where to send the user afterwards (e.g. back to the build they wanted to save). */
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="flex min-h-screen flex-col bg-card">
      <div className="mx-auto w-full max-w-[1280px] px-5 py-[26px] sm:px-12">
        <Link href="/" className="text-value font-bold tracking-[.14em] text-ink no-underline">
          911 CHASER
        </Link>
      </div>
      <div className="mx-auto flex w-full max-w-[400px] flex-1 items-start px-5 pt-10 pb-16">
        <LoginPanel next={next} />
      </div>
    </main>
  );
}
