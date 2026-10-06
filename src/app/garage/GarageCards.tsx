"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { deleteBuild } from "../actions";
import { BuildCard, type BuildCardData } from "./BuildCard";

/** How long "Undo" stays on screen before a removed build is actually deleted. */
const UNDO_WINDOW_MS = 6000;

interface PendingRemoval {
  id: string;
  name: string;
  timer: ReturnType<typeof setTimeout>;
}

/**
 * The garage's build cards. "Remove" hides a card straight away but only deletes it once
 * the undo window has passed, so an accidental tap doesn't lose the build and its history.
 */
export function GarageCards({ cards, children }: { cards: BuildCardData[]; children: ReactNode }) {
  const router = useRouter();
  const [pending, setPending] = useState<PendingRemoval | null>(null);
  // Builds removed this visit stay hidden while the delete and page refresh finish.
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  // A copy of `pending` the cleanup effect below can read. That effect is set up once, on the
  // first render, so on its own it would only ever see the first value of `pending` (null).
  const pendingRef = useRef<PendingRemoval | null>(null);
  pendingRef.current = pending;

  const commitRemoval = async (id: string) => {
    await deleteBuild(id);
    router.refresh();
  };

  const remove = (card: BuildCardData) => {
    // Only one removal waits at a time: a second Remove finishes the first one now.
    if (pending) {
      clearTimeout(pending.timer);
      commitRemoval(pending.id);
    }
    const timer = setTimeout(() => {
      setPending(null);
      commitRemoval(card.id);
    }, UNDO_WINDOW_MS);
    setPending({ id: card.id, name: card.name, timer });
    setRemovedIds((ids) => [...ids, card.id]);
  };

  const undo = () => {
    if (!pending) return;
    clearTimeout(pending.timer);
    setRemovedIds((ids) => ids.filter((id) => id !== pending.id));
    setPending(null);
  };

  // Leaving the garage mid-window still deletes the build the user removed.
  useEffect(() => {
    return () => {
      const removal = pendingRef.current;
      if (!removal) return;
      clearTimeout(removal.timer);
      deleteBuild(removal.id);
    };
  }, []);

  return (
    <>
      {cards
        .filter((card) => !removedIds.includes(card.id))
        .map((card) => (
          <BuildCard key={card.id} build={card} onRemove={() => remove(card)} />
        ))}
      {children}

      {pending && (
        <div
          role="status"
          className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-4 rounded-pill bg-ink px-5 py-3 text-small text-inverse shadow-auth"
        >
          <span>Removed {pending.name}</span>
          <button type="button" onClick={undo} className="cursor-pointer border-0 bg-transparent p-0 font-semibold text-inverse underline">
            Undo
          </button>
        </div>
      )}
    </>
  );
}
