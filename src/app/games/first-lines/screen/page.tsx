"use client";

import { useRound } from "@/lib/realtime/useRound";
import { useQuestionState } from "@/lib/realtime/useQuestionState";
import { useLeaderboard } from "@/lib/realtime/useLeaderboard";
import { QUESTION_DURATION_MS } from "@/lib/scoring/lockstep";
import CountdownTimer from "@/components/shared/CountdownTimer";
import Scoreboard from "@/components/shared/Scoreboard";
import WinnerReveal from "@/components/screen/WinnerReveal";
import ScreenShell from "@/components/screen/ScreenShell";
import GlassPanel from "@/components/screen/GlassPanel";
import ScreenFooter from "@/components/screen/ScreenFooter";

const GAME_SLUG = "first-lines";

const TITLE = (
  <>
    The Famous <span className="text-gold-400">First Lines</span> Challenge
  </>
);

export default function FirstLinesScreenPage() {
  const { round } = useRound(GAME_SLUG, "main");
  const { current } = useQuestionState(round?.id);
  const { rows } = useLeaderboard(round?.id);

  if (!round || round.status === "pending") {
    return (
      <ScreenShell gameName={TITLE} center>
        <p className="animate-rise-in font-display text-3xl font-semibold uppercase tracking-[0.4em] text-gold-500 lg:text-5xl">
          Ready
        </p>
      </ScreenShell>
    );
  }

  if (round.status === "confirmed") {
    return (
      <ScreenShell center>
        <WinnerReveal roundId={round.id} title="The Famous First Lines Challenge" />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      gameName={TITLE}
      footer={
        current ? (
          <ScreenFooter
            label={`Question ${current.questionIndex + 1} / ${round.totalQuestions}`}
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
