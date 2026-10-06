import { LoginForm } from "./LoginForm";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <main className="mx-auto flex max-w-md flex-col px-5 py-20">
      <p className="eyebrow">Your garage</p>
      <h1 className="mt-2 font-display text-5xl">Sign in to save builds</h1>
      <LoginForm next={next ?? "/garage"} />
    </main>
  );
}
