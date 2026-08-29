"use client";

import { formatCountdown, useNetworkingRound } from "@/lib/networking/useNetworkingRound";

/**
 * The round status marks in the wall's header corners.
 *
 * The clock sits top-right rather than inside the dashboard grid on purpose:
 * the four panels below are all live data that changes as people play, and a
 * countdown buried among them competes with the numbers it is supposed to be
 * pressuring. In a corner, at this size, it reads from across the hall in a
 * glance without stealing attention from the leaderboards.
 */

export function LiveBadge() {
  const { isOpen, secondsLeft, loaded } = useNetworkingRound();
  const finished = loaded && secondsLeft !== null && !isOpen;

  return (
    <div
      className={`flex items-center gap-[0.9vh] rounded-full border px-[1.4vh] py-[0.7vh] backdrop-blur-sm ${
        finished ? "border-white/25 bg-black/45" : "border-white/20 bg-black/35"
      }`}
    >
      <span className="relative flex h-[1.3vh] w-[1.3vh]" aria-hidden="true">
        {!finished && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-70" />
        )}
        <span
          className={`relative inline-flex h-full w-full rounded-full ${
            finished ? "bg-white/45" : "bg-red-500"
          }`}
        />
      </span>
      <span className="text-[1.7vh] font-semibold uppercase tracking-[0.18em] text-white">
        {finished ? "Round closed" : "Live now"}
      </span>
    </div>
  );
}

export function RoundClock() {
  const { secondsLeft, isOpen, loaded } = useNetworkingRound();

  // Before a host presses start there is no deadline to show. Rendering a
  // frozen "5:00" there would be a lie the room could time against.
  if (!loaded || secondsLeft === null) return null;

  const finished = !isOpen;
  // Under a minute the clock turns; that last stretch is when people
  // actually move, and it should feel different from the first four minutes.
  const urgent = !finished && secondsLeft <= 60;

  return (
    <div
      className={`rounded-[1vh] border px-[1.6vh] py-[0.6vh] text-center backdrop-blur-sm ${
        finished
          ? "border-white/25 bg-black/45"
          : urgent
            ? "border-red-400/60 bg-red-950/40"
            : "border-gold-500/40 bg-black/35"
      }`}
    >
      <div
        className={`text-[1.4vh] font-semibold uppercase tracking-[0.16em] ${
          finished ? "text-white/70" : urgent ? "text-red-300" : "text-gold-400"
        }`}
      >
        {finished ? "Time" : "Time left"}
      </div>
      <div
        className={`font-display text-[4.6vh] font-bold leading-none tabular-nums ${
          finished ? "text-white/80" : urgent ? "text-red-200" : "text-white"
        }`}
      >
        {finished ? "UP" : formatCountdown(secondsLeft)}
      </div>
    </div>
  );
}
