"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";
import type { LeaderboardTieBreak } from "@/lib/realtime/useLeaderboard";
import { playResults } from "@/lib/audio/sfx";
import Medal, { isMedalRank } from "@/components/shared/Medal";
import BrandMark from "@/components/shared/BrandMark";

export interface ResultRound {
  /** Shown above the score — e.g. "Fiction". Omit for single-round games. */
  label?: string;
  roundId: string;
  tieBreak?: LeaderboardTieBreak;
}

interface Placing {
  label?: string;
  rank: number;
  totalParticipants: number;
  points: number;
}

function ordinal(n: number): string {
  // 11th/12th/13th are the exceptions the naive rule gets wrong.
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  const suffix = { 1: "st", 2: "nd", 3: "rd" }[n % 10] ?? "th";
  return `${n}${suffix}`;
}

/**
 * End-of-game screen on the player's phone: what they scored and where they
 * finished. Placings come from get_participant_rank rather than being
 * derived client-side from the Top-10 leaderboard, because most players
 * finish outside the top ten and would otherwise be told nothing at all.
 *
 * Games with more than one round (Genre Crown) pass several: each is ranked
 * on its own, since they are separate competitions with separate winners.
 */
export default function FinalResult({
  displayName,
  participantId,
  rounds,
  heading = "Game over!",
}: {
  displayName: string;
  participantId: string;
  rounds: ResultRound[];
  heading?: string;
}) {
  const [placings, setPlacings] = useState<Placing[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserSupabaseClient();

    Promise.all(
      rounds.map(async (r) => {
        const { data } = await supabase.rpc("get_participant_rank", {
          p_round_id: r.roundId,
          p_participant_id: participantId,
          p_tie_break: r.tieBreak ?? "elapsed",
        });
        const row = data?.[0];
        return {
          label: r.label,
          rank: row?.rank ?? 0,
          totalParticipants: row?.total_participants ?? 0,
          points: row?.total_points ?? 0,
        };
      })
    ).then((result) => {
      if (cancelled) return;
      setPlacings(result);
      playResults();
    });

    return () => {
      cancelled = true;
    };
    // rounds is rebuilt inline by the callers on every render; the round ids
    // are what actually identify the query, so key the effect on those.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId, rounds.map((r) => r.roundId).join(",")]);

  // The player's best placing across the rounds drives the celebration, so a
  // Ruler of Fiction still gets a medal even if non-fiction went badly.
  const bestRank = placings?.length ? Math.min(...placings.map((p) => p.rank)) : null;
  const medalIndex = bestRank === null ? null : bestRank - 1;
  const podium = medalIndex !== null && isMedalRank(medalIndex);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6 py-10 text-center">
      <BrandMark />

      {podium && medalIndex !== null && isMedalRank(medalIndex) && (
        <div className="mt-6 animate-pop-in">
          <Medal rank={medalIndex} size={92} />
        </div>
      )}

      <h1 className="mt-6 font-display text-3xl font-bold text-navy-900">{heading}</h1>
      <p className="mt-1 text-base text-ink-600">{displayName}</p>

      {!placings && <p className="mt-8 text-sm text-ink-600">Counting up the scores…</p>}

      {placings && (
        <div className="mt-8 flex w-full max-w-sm flex-col gap-4">
          {placings.map((p, i) => (
            <div
              key={p.label ?? i}
              className="animate-rise-in rounded-2xl border border-navy-100 bg-white px-6 py-5 shadow-card"
              style={{ animationDelay: `${i * 120}ms` }}
            >
              {p.label && (
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-ink-600">{p.label}</div>
              )}

              <div className="mt-1 font-display text-4xl font-bold text-gold-700">
                {p.points}
                <span className="ml-1 text-xl font-semibold text-ink-600">pts</span>
              </div>

              {p.totalParticipants > 0 && (
                <div className="mt-2 text-base font-semibold text-navy-900">
                  {ordinal(p.rank)}{" "}
                  <span className="font-normal text-ink-600">of {p.totalParticipants} players</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 text-sm text-ink-600">Look at the LED screen for the winners.</p>
    </main>
  );
}
