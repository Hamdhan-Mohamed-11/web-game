"use client";

import { useRound } from "@/lib/realtime/useRound";
import { useLeaderboard } from "@/lib/realtime/useLeaderboard";
import { useLeadIn } from "@/lib/realtime/useLeadIn";
import { MATCH_ROUND_DURATION_MS, TOTAL_PAIRS } from "@/lib/scoring/bookmatch";
import CountdownTimer from "@/components/shared/CountdownTimer";
import Scoreboard from "@/components/shared/Scoreboard";
import LeadIn from "@/components/shared/LeadIn";
import WinnerReveal from "@/components/screen/WinnerReveal";
import ScreenShell from "@/components/screen/ScreenShell";
import GlassPanel from "@/components/screen/GlassPanel";
import ScreenFooter from "@/components/screen/ScreenFooter";
import BookMatchRegalia from "@/components/screen/BookMatchRegalia";

const GAME_SLUG = "book-match";

const TITLE = (
  <>
    The <span className="text-gold-400">Book Match</span> Challenge
  </>
);

export default function BookMatchScreenPage() {
  const { round } = useRound(GAME_SLUG, "match");
  const { rows } = useLeaderboard(round?.id, 10, "reachedAt");
  // Book Match has no per-question row, so its ceremony hangs off the round
  // itself — which is also what keeps the boards on every phone from opening
  // before the room has finished counting down together.
  const leadIn = useLeadIn(round?.status === "active" ? round.startedAt : null);

  if (!round || round.status === "pending") {
    return (
      <ScreenShell gameName={TITLE} decor={<BookMatchRegalia />} center>
        <p className="animate-rise-in font-display text-[4vh] font-semibold uppercase tracking-[0.4em] text-gold-500">
          Get Ready
        </p>
      </ScreenShell>
    );
  }

  if (round.status === "confirmed") {
    return (
      <ScreenShell decor={<BookMatchRegalia />} center>
        <WinnerReveal roundId={round.id} title="The Book Match Challenge" />
      </ScreenShell>
    );
  }

  if (leadIn.pending) {
    return (
      <ScreenShell gameName={TITLE} decor={<BookMatchRegalia />} center>
        <LeadIn count={leadIn.count} label={`${TOTAL_PAIRS} pairs · 75 seconds`} alert />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell gameName={TITLE} decor={<BookMatchRegalia />}>
      <GlassPanel
        title="Live Top 10"
        aside={
          <ScreenFooter
            label={`${TOTAL_PAIRS} pairs`}
            // The room could see the boards filling but had no idea how long
            // was left — every other screen has a clock, and this one is the
            // only game actually racing one.
            timer={
              <CountdownTimer
                startedAt={round.startedAt}
                durationMs={MATCH_ROUND_DURATION_MS}
                size="5vh"
                theme="dark"
              />
            }
          />
        }
      >
        <Scoreboard rows={rows} showProgress progressTotal={TOTAL_PAIRS} theme="dark" />
      </GlassPanel>
    </ScreenShell>
  );
}
