import type { ReactNode } from "react";

/**
 * Status pill for the LED screens — question number plus the live countdown.
 *
 * Sits in GlassPanel's header (to the right of "Live Top 10") rather than in
 * a page footer: the footer's height is what the tenth leaderboard row needs.
 * Sized in vh so it stays proportional from a laptop rehearsal to the hall's
 * projector without a breakpoint ladder.
 */
export default function ScreenFooter({ label, timer }: { label: ReactNode; timer?: ReactNode }) {
  return (
    <div className="flex items-center gap-[1.4vh] rounded-full border border-white/12 bg-white/[0.06] px-[1.8vh] py-[0.7vh] backdrop-blur-xl">
      <span className="whitespace-nowrap font-display text-[2vh] font-semibold text-white/85">{label}</span>
      {timer && (
        <>
          <span aria-hidden="true" className="h-[3vh] w-px bg-white/15" />
          {timer}
        </>
      )}
    </div>
  );
}
