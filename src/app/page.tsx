"use client";

import Link from "next/link";
import { GAMES, gamePlayUrl } from "@/lib/games";
import { useGameLocks, isGameUnlocked } from "@/lib/realtime/useGameLocks";
import BrandMark from "@/components/shared/BrandMark";

export default function Home() {
  const { locks, loaded } = useGameLocks();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <BrandMark />
        <h1 className="mt-6 font-display text-3xl font-bold text-navy-900">Book Club Quiz Night</h1>
        <p className="mt-3 text-sm text-ink-600">
          {loaded && locks.every((l) => !l.isUnlocked)
            ? "Waiting for the next game to open…"
            : "Tap the open game to join."}
        </p>

        <div className="mt-8 flex flex-col gap-3">
          {GAMES.map((game) => {
            const unlocked = loaded && isGameUnlocked(locks, game.slug);
            if (!unlocked) {
              return (
                <div
                  key={game.slug}
                  className="flex items-center gap-3 rounded-xl border border-navy-100 bg-white/60 px-5 py-4 text-left opacity-60"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-5 w-5 shrink-0 text-ink-600" aria-hidden="true">
                    <rect x="5" y="11" width="14" height="9" rx="2" />
                    <path d="M8 11V7a4 4 0 0 1 8 0v4" />
                  </svg>
                  <div>
                    <div className="font-display font-semibold text-navy-900">{game.name}</div>
                    <div className="text-sm text-ink-600">Not open yet</div>
                  </div>
                </div>
              );
            }
            return (
              <Link
                key={game.slug}
                href={gamePlayUrl(game.slug)}
                className="rounded-xl border-2 border-gold-400 bg-white px-5 py-4 text-left shadow-card transition-colors hover:bg-cream-100"
              >
                <div className="font-display font-semibold text-navy-900">{game.name}</div>
                <div className="text-sm text-gold-700">{game.tagline} — open now</div>
              </Link>
            );
          })}

          {/* Always available, never locked: the networking game runs for the
              whole evening alongside whichever quiz is open, so anyone who
              scans the main code at any point can still take part. */}
          <Link
            href="/networking"
            className="rounded-xl border-2 border-navy-900 bg-navy-900 px-5 py-4 text-left shadow-card transition-colors hover:bg-navy-800"
          >
            <div className="font-display font-semibold text-white">The Networking Game</div>
            <div className="text-sm text-gold-400">Meet a reader, discover a book — open all night</div>
          </Link>
        </div>
      </div>
    </main>
  );
}
