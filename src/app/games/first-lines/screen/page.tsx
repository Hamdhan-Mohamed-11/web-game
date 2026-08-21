"use client";

import { useRound } from "@/lib/realtime/useRound";
import { useQuestionState } from "@/lib/realtime/useQuestionState";
import { useLeaderboard } from "@/lib/realtime/useLeaderboard";
import { useLeadIn } from "@/lib/realtime/useLeadIn";
import { QUESTION_DURATION_MS } from "@/lib/scoring/lockstep";
import CountdownTimer from "@/components/shared/CountdownTimer";
import Scoreboard from "@/components/shared/Scoreboard";
import LeadIn from "@/components/shared/LeadIn";
import WinnerReveal from "@/components/screen/WinnerReveal";
import ScreenShell from "@/components/screen/ScreenShell";
import GlassPanel from "@/components/screen/GlassPanel";
import ScreenFooter from "@/components/screen/ScreenFooter";
import FirstLinesRegalia from "@/components/screen/FirstLinesRegalia";

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
  const leadIn = useLeadIn(current?.startedAt);

  if (!round || round.status === "pending") {
    return (
      <ScreenShell gameName={TITLE} decor={<FirstLinesRegalia />} center>
        <p className="animate-rise-in font-display text-[4vh] font-semibold uppercase tracking-[0.4em] text-gold-500">
          Ready
        </p>
      </ScreenShell>
    );
  }

  if (round.status === "confirmed") {
    return (
      <ScreenShell decor={<FirstLinesRegalia />} center>
        <WinnerReveal roundId={round.id} title="The Famous First Lines Challenge" />
      </ScreenShell>
    );
  }

  if (current?.questionIndex === 0 && leadIn.pending) {
    return (
      <ScreenShell gameName={TITLE} decor={<FirstLinesRegalia />} center>
        <LeadIn
          count={leadIn.count}
          label={`Question ${current.questionIndex + 1} / ${round.totalQuestions}`}
          alert
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell gameName={TITLE} decor={<FirstLinesRegalia />}>
      <GlassPanel
        title="Live Top 10"
        aside={
          current ? (
            <ScreenFooter
              label={`Question ${current.questionIndex + 1} / ${round.totalQuestions}`}
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
