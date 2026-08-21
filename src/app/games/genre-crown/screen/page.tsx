"use client";

import { useRound } from "@/lib/realtime/useRound";
import { useQuestionState } from "@/lib/realtime/useQuestionState";
import { useLeaderboard } from "@/lib/realtime/useLeaderboard";
import { useLeadIn } from "@/lib/realtime/useLeadIn";
import { QUESTION_DURATION_MS } from "@/lib/scoring/lockstep";
import { getGameMeta } from "@/lib/games";
import CountdownTimer from "@/components/shared/CountdownTimer";
import Scoreboard from "@/components/shared/Scoreboard";
import LeadIn from "@/components/shared/LeadIn";
import WinnerReveal from "@/components/screen/WinnerReveal";
import ScreenShell from "@/components/screen/ScreenShell";
import GlassPanel from "@/components/screen/GlassPanel";
import ScreenFooter from "@/components/screen/ScreenFooter";
import CrownRegalia from "@/components/screen/CrownRegalia";

const GAME_SLUG = "genre-crown";
const meta = getGameMeta(GAME_SLUG)!;

export default function GenreCrownScreenPage() {
  const { round: fictionRound } = useRound(GAME_SLUG, "fiction");
  const { round: nonfictionRound } = useRound(GAME_SLUG, "nonfiction");

  const activeRound =
    fictionRound?.status === "active" ? fictionRound : nonfictionRound?.status === "active" ? nonfictionRound : null;

  const { current } = useQuestionState(activeRound?.id);
  const { rows } = useLeaderboard(activeRound?.id);
  const leadIn = useLeadIn(current?.startedAt);

  const showReady = fictionRound?.status === "pending" && nonfictionRound?.status === "pending";
  const showFictionReveal =
    fictionRound?.status === "confirmed" && nonfictionRound?.status !== "active" && nonfictionRound?.status !== "confirmed";
  const showNonfictionReveal = nonfictionRound?.status === "confirmed";

  if (showReady) {
    return (
      <ScreenShell gameName={meta.name} decor={<CrownRegalia />} center>
        <p className="animate-rise-in font-display text-[4vh] font-semibold uppercase tracking-[0.4em] text-gold-500">
          Ready
        </p>
      </ScreenShell>
    );
  }

  if (showNonfictionReveal && nonfictionRound) {
    return (
      <ScreenShell decor={<CrownRegalia />} center>
        <WinnerReveal roundId={nonfictionRound.id} title="Ruler of Non-Fiction" variant="single" />
      </ScreenShell>
    );
  }

  if (showFictionReveal && fictionRound) {
    return (
      <ScreenShell decor={<CrownRegalia />} center>
        <WinnerReveal roundId={fictionRound.id} title="Ruler of Fiction" variant="single" />
      </ScreenShell>
    );
  }

  const isFiction = activeRound?.roundKey === "fiction";
  const title = (
    <>
      <span className="text-gold-400">{isFiction ? "Fiction" : "Non-Fiction"}</span> Round
    </>
  );

  if (current?.questionIndex === 0 && leadIn.pending && activeRound) {
    return (
      <ScreenShell gameName={title} decor={<CrownRegalia />} center>
        <LeadIn
          count={leadIn.count}
          label={`Question ${current.questionIndex + 1} / ${activeRound.totalQuestions}`}
          alert
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell gameName={title} decor={<CrownRegalia />}>
      <GlassPanel
        title="Live Top 10"
        aside={
          current && activeRound ? (
            <ScreenFooter
              label={`Question ${current.questionIndex + 1} / ${activeRound.totalQuestions}`}
              timer={
                <CountdownTimer startedAt={current.startedAt} durationMs={QUESTION_DURATION_MS} size="5vh" theme="dark" />
              }
            />
          ) : undefined
        }
      >
        <Scoreboard rows={rows} theme="dark" />
      </GlassPanel>
    </ScreenShell>
  );
}
