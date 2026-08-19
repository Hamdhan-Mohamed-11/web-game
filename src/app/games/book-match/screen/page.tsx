"use client";

import { useRound } from "@/lib/realtime/useRound";
import { useLeaderboard } from "@/lib/realtime/useLeaderboard";
import { TOTAL_PAIRS } from "@/lib/scoring/bookmatch";
import Scoreboard from "@/components/shared/Scoreboard";
import WinnerReveal from "@/components/screen/WinnerReveal";
import ScreenShell from "@/components/screen/ScreenShell";
import GlassPanel from "@/components/screen/GlassPanel";
import ScreenFooter from "@/components/screen/ScreenFooter";

const GAME_SLUG = "book-match";

const TITLE = (
  <>
    The <span className="text-gold-400">Book Match</span> Challenge
  </>
);

export default function BookMatchScreenPage() {
  const { round } = useRound(GAME_SLUG, "match");
  const { rows } = useLeaderboard(round?.id, 10, "reachedAt");

  if (!round || round.status === "pending") {
    return (
      <ScreenShell gameName={TITLE} center>
        <p className="animate-rise-in font-display text-3xl font-semibold uppercase tracking-[0.4em] text-gold-500 lg:text-5xl">
          Get Ready
        </p>
      </ScreenShell>
    );
  }

  if (round.status === "confirmed") {
    return (
      <ScreenShell center>
        <WinnerReveal roundId={round.id} title="The Book Match Challenge" />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      gameName={TITLE}
      footer={<ScreenFooter label={`${TOTAL_PAIRS} pairs · 75 seconds`} />}
    >
      <GlassPanel title="Live Top 10">
        <Scoreboard rows={rows} showProgress progressTotal={TOTAL_PAIRS} theme="dark" />
      </GlassPanel>
    </ScreenShell>
  );
}
