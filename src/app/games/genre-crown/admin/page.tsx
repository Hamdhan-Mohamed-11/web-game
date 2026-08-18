"use client";

import { useState } from "react";
import Link from "next/link";
import { useRound } from "@/lib/realtime/useRound";
import { GENRE_CROWN_FICTION_QUESTIONS, GENRE_CROWN_NONFICTION_QUESTIONS } from "@/lib/data/genreCrown.questions";
import { getGameMeta } from "@/lib/games";
import RoundAdminControls from "@/components/admin/RoundAdminControls";
import Button from "@/components/shared/Button";
import BrandMark from "@/components/shared/BrandMark";

const GAME_SLUG = "genre-crown";
const meta = getGameMeta(GAME_SLUG)!;

export default function GenreCrownAdminPage() {
  const { round: fictionRound } = useRound(GAME_SLUG, "fiction");
  const { round: nonfictionRound } = useRound(GAME_SLUG, "nonfiction");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleReset() {
    if (!confirm("Reset all Genre Crown data? This clears participants and scores for both rounds.")) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/games/${GAME_SLUG}/reset`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(data.error ?? "Request failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>
        <Link href="/admin" className="mb-4 inline-block text-sm text-ink-600 hover:text-navy-900">
          ← Back to admin hub
        </Link>

        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-semibold text-navy-900">{meta.name}</h1>
          <Button variant="danger" onClick={handleReset} disabled={busy}>
            Reset
          </Button>
        </div>

        {error && <p className="mb-4 text-sm text-danger-600">{error}</p>}

        <RoundAdminControls
          gameSlug={GAME_SLUG}
          round={fictionRound}
          title="Fiction Round"
          questionPrompt={(i) => GENRE_CROWN_FICTION_QUESTIONS[i]?.question}
          winnersCount={1}
        />

        <RoundAdminControls
          gameSlug={GAME_SLUG}
          round={nonfictionRound}
          title="Non-Fiction Round"
          questionPrompt={(i) => GENRE_CROWN_NONFICTION_QUESTIONS[i]?.question}
          winnersCount={1}
        />
      </div>
    </main>
  );
}
