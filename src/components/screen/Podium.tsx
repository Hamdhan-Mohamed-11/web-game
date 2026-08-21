"use client";

import Medal, { isMedalRank } from "@/components/shared/Medal";

export interface PodiumWinner {
  place: number;
  displayName: string;
  points: number;
}

/**
 * Column heights are what carry the ranking at a distance — by the time the
 * room can read the names, the shape has already told them who won.
 */
const COLUMN = {
  1: { height: "34vh", plinth: "linear-gradient(180deg, #F0C868 0%, #E0982C 40%, #B8791F 100%)", rim: "#8A5A16" },
  2: { height: "25vh", plinth: "linear-gradient(180deg, #EDF1F6 0%, #CBD2DC 40%, #A7B0BE 100%)", rim: "#8A94A3" },
  3: { height: "19vh", plinth: "linear-gradient(180deg, #D9A273 0%, #B2723A 40%, #8A5426 100%)", rim: "#6E4118" },
} as const;

/** Visual left-to-right: runner-up, winner, third — the classic arrangement. */
const DISPLAY_ORDER = [2, 1, 3] as const;

/**
 * Kahoot-style top-three podium for the LED screen.
 *
 * Reveal runs lowest place first so the room's attention arrives on the
 * winner last: the delay is derived from the place, not from DOM order,
 * which is why the columns can sit in visual order in the markup.
 */
export default function Podium({ winners }: { winners: PodiumWinner[] }) {
  const byPlace = new Map(winners.map((w) => [w.place, w]));

  return (
    <div className="flex w-full max-w-4xl items-end justify-center gap-[2vw]">
      {DISPLAY_ORDER.map((place) => {
        const winner = byPlace.get(place);
        if (!winner) return null;

        const col = COLUMN[place];
        const medalIndex = place - 1;
        // 3rd reveals first, 1st last.
        const delayMs = (3 - place) * 260;

        return (
          <div
            key={place}
            className="animate-podium-rise flex min-w-0 flex-1 flex-col items-center"
            style={{ animationDelay: `${delayMs}ms` }}
          >
            {isMedalRank(medalIndex) && (
              <Medal rank={medalIndex} size={place === 1 ? "7vh" : "5.4vh"} />
            )}

            <div
              className={`mt-[1.2vh] max-w-full truncate px-2 text-center font-display font-bold text-white ${
                place === 1 ? "text-[3.4vh]" : "text-[2.6vh]"
              }`}
              title={winner.displayName}
            >
              {winner.displayName}
            </div>

            <div
              className={`font-display font-semibold text-gold-400 ${
                place === 1 ? "text-[2.6vh]" : "text-[2vh]"
              }`}
            >
              {winner.points} pts
            </div>

            {/* The plinth. The place numeral is engraved on its face so the
                column still reads as a podium even in a photo with the
                medals cropped out. */}
            <div
              className="relative mt-[1.2vh] flex w-full items-start justify-center overflow-hidden rounded-t-xl"
              style={{
                height: col.height,
                background: col.plinth,
                boxShadow: `inset 0 0 0 2px ${col.rim}, 0 -10px 40px -12px rgba(224,152,44,0.5)`,
              }}
            >
              {place === 1 && (
                <span
                  aria-hidden="true"
                  className="animate-crown-glow pointer-events-none absolute inset-0"
                  style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, transparent 55%)" }}
                />
              )}
              <span
                className="relative mt-[1.4vh] font-display text-[4.6vh] font-bold leading-none"
                style={{ color: col.rim }}
              >
                {place}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
