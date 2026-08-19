"use client";

import { useRound } from "@/lib/realtime/useRound";
import { useQuestionState } from "@/lib/realtime/useQuestionState";
import { useLeaderboard } from "@/lib/realtime/useLeaderboard";
import { QUESTION_DURATION_MS } from "@/lib/scoring/lockstep";
import { getGameMeta } from "@/lib/games";
import CountdownTimer from "@/components/shared/CountdownTimer";
import Scoreboard from "@/components/shared/Scoreboard";
import WinnerReveal from "@/components/screen/WinnerReveal";
import ScreenShell from "@/components/screen/ScreenShell";
import GlassPanel from "@/components/screen/GlassPanel";
import ScreenFooter from "@/components/screen/ScreenFooter";

const GAME_SLUG = "genre-crown";
const meta = getGameMeta(GAME_SLUG)!;

export default function GenreCrownScreenPage() {
  const { round: fictionRound } = useRound(GAME_SLUG, "fiction");
  const { round: nonfictionRound } = useRound(GAME_SLUG, "nonfiction");

  const activeRound =
    fictionRound?.status === "active" ? fictionRound : nonfictionRound?.status === "active" ? nonfictionRound : null;

  const { current } = useQuestionState(activeRound?.id);
  const { rows } = useLeaderboard(activeRound?.id);

  const showReady = fictionRound?.status === "pending" && nonfictionRound?.status === "pending";
  const showFictionReveal =
    fictionRound?.status === "confirmed" && nonfictionRound?.status !== "active" && nonfictionRound?.status !== "confirmed";
  const showNonfictionReveal = nonfictionRound?.status === "confirmed";

  if (showReady) {
    return (
      <ScreenShell gameName={meta.name} center>
        <p className="animate-rise-in font-display text-3xl font-semibold uppercase tracking-[0.4em] text-gold-500 lg:text-5xl">
          Ready
        </p>
      </ScreenShell>
    );
  }

  if (showNonfictionReveal && nonfictionRound) {
    return (
      <ScreenShell center>
        <WinnerReveal roundId={nonfictionRound.id} title="Ruler of Non-Fiction" />
      </ScreenShell>
    );
  }

  if (showFictionReveal && fictionRound) {
    return (
      <ScreenShell center>
        <WinnerReveal roundId={fictionRound.id} title="Ruler of Fiction" />
      </ScreenShell>
    );
  }

  const isFiction = activeRound?.roundKey === "fiction";

  return (
    <ScreenShell
      gameName={
        <>
          <span className="text-gold-400">{isFiction ? "Fiction" : "Non-Fiction"}</span> Round
        </>
      }
      footer={
        current && activeRound ? (
          <ScreenFooter
            label={`Question ${current.questionIndex + 1} / ${activeRound.totalQuestions}`}
            timer={
              <CountdownTimer startedAt={current.startedAt} durationMs={QUESTION_DURATION_MS} size={64} theme="dark" />
            }
          />
        ) : undefined
      }
    >
      <GlassPanel title="Live Top 10">
        <Scoreboard rows={rows} theme="dark" />
      </GlassPanel>
    </ScreenShell>
  );
}
