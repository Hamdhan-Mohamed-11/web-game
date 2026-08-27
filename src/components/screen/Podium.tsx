"use client";

import Medal, { isMedalRank } from "@/components/shared/Medal";
import { LaurelWreath } from "@/components/screen/ornaments";

export interface PodiumWinner {
  place: number;
  displayName: string;
  points: number;
}

/**
 * Per-place metal. Column heights are what carry the ranking at a distance —
 * by the time the room can read the names, the shape has already said who
 * won.
 *
 * Heights are deliberately shorter than a podium drawn on a laptop would be:
 * the wall is 1536x640, and the runners-up now sit underneath rather than
 * beside, so the plinths have to give that band its room.
 */
const COLUMN = {
  1: {
    height: "24vh",
    plinth: "linear-gradient(180deg, #FBE49C 0%, #F0C868 22%, #E0982C 62%, #B8791F 100%)",
    lip: "linear-gradient(180deg, #C98A28 0%, #8A5A16 100%)",
    plaque: "linear-gradient(160deg, #FFF8E6 0%, #FBEDD1 45%, #F2DCA8 100%)",
    rim: "#8A5A16",
    /** Plaque text. Darker than the rim: the rim is a metal edge, and at
        silver it fails contrast on a near-white plaque. */
    ink: "#7A4E12",
    medal: "9vh",
    laurel: "19vh",
  },
  2: {
    height: "17.5vh",
    plinth: "linear-gradient(180deg, #FAFCFF 0%, #EDF1F6 22%, #CBD2DC 62%, #A7B0BE 100%)",
    lip: "linear-gradient(180deg, #B4BCC9 0%, #7E8794 100%)",
    plaque: "linear-gradient(160deg, #FFFFFF 0%, #F2F5F9 45%, #DCE2EA 100%)",
    rim: "#8A94A3",
    ink: "#495260",
    medal: "7.5vh",
    laurel: "15.5vh",
  },
  3: {
    height: "13.5vh",
    plinth: "linear-gradient(180deg, #E8BE95 0%, #D9A273 22%, #B2723A 62%, #8A5426 100%)",
    lip: "linear-gradient(180deg, #9A5F2C 0%, #6E4118 100%)",
    plaque: "linear-gradient(160deg, #FDEEDF 0%, #F5DEC6 45%, #E4C09B 100%)",
    rim: "#6E4118",
    ink: "#6E4118",
    medal: "7.5vh",
    laurel: "15.5vh",
  },
} as const;

/** Visual left-to-right: runner-up, winner, third — the classic arrangement. */
const DISPLAY_ORDER = [2, 1, 3] as const;

/**
 * Award-ceremony podium for the LED screen.
 *
 * Each column is a medal wreathed in laurel above an engraved plinth whose
 * face carries a plaque with the name and score. The plaque matters more
 * than it looks: names sit on a light ground rather than on the metal, which
 * is the only way a long name stays readable against a gradient that runs
 * from near-white to dark bronze down its own height.
 *
 * Reveal runs lowest place first so the room's attention arrives on the
 * winner last: the delay is derived from the place, not from DOM order,
 * which is why the columns can sit in visual order in the markup. The
 * caller supplies the base offset so the podium can continue a countdown
 * that started with the runners-up below it.
 */
export default function Podium({
  winners,
  baseDelayMs = 0,
  stepMs = 700,
}: {
  winners: PodiumWinner[];
  baseDelayMs?: number;
  stepMs?: number;
}) {
  const byPlace = new Map(winners.map((w) => [w.place, w]));

  return (
    <div className="flex w-full max-w-2xl items-end justify-center gap-[1vw]">
      {DISPLAY_ORDER.map((place) => {
        const winner = byPlace.get(place);
        if (!winner) return null;

        const col = COLUMN[place];
        const medalIndex = place - 1;
        const first = place === 1;
        // 3rd reveals first, 1st last.
        const delayMs = baseDelayMs + (3 - place) * stepMs;

        return (
          <div
            key={place}
            className="animate-podium-rise flex min-w-0 flex-1 flex-col items-center"
            style={{ animationDelay: `${delayMs}ms` }}
          >
            {/* ---- Medal, wreathed ----
                 The box is sized to the wreath rather than the disc so the
                 leaves reserve their own space; sized to the medal instead,
                 they overlapped the heading above. */}
            <div
              className="relative grid shrink-0 place-items-center"
              style={{ height: col.laurel, width: col.laurel }}
            >
              <LaurelWreath className="absolute inset-0 h-full w-full" />
              {isMedalRank(medalIndex) && (
                <span className="relative z-10">
                  <Medal rank={medalIndex} size={col.medal} />
                </span>
              )}
            </div>

            {/* ---- Plinth ---- */}
            <div
              className="relative mt-[0.8vh] flex w-full flex-col items-center justify-start overflow-hidden rounded-t-[0.8vh] px-[1.4vh] pt-[1.5vh] pb-[1.5vh]"
              style={{
                height: col.height,
                background: col.plinth,
                boxShadow: `inset 0 0 0 1px ${col.rim}, inset 0 1px 0 rgba(255,255,255,0.7), 0 -12px 34px -14px rgba(224,152,44,0.55)`,
              }}
            >
              {first && (
                <span
                  aria-hidden="true"
                  className="animate-crown-glow pointer-events-none absolute inset-0"
                  style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.55) 0%, transparent 55%)" }}
                />
              )}

              {/* The plaque. Double-ruled like an engraved nameplate. */}
              <div
                className="relative flex w-full min-w-0 flex-1 flex-col items-center justify-center rounded-[0.5vh] px-[0.8vh] py-[0.7vh]"
                style={{
                  background: col.plaque,
                  boxShadow: `inset 0 0 0 1px ${col.rim}66, inset 0 0 0 3px rgba(255,255,255,0.55), 0 2px 6px -2px rgba(0,0,0,0.45)`,
                }}
              >
                <span
                  className={`max-w-full truncate font-display font-bold leading-tight text-navy-950 ${
                    first ? "text-[3vh]" : "text-[2.4vh]"
                  }`}
                  title={winner.displayName}
                >
                  {winner.displayName}
                </span>

                <svg
                  viewBox="0 0 12 12"
                  className={`my-[0.3vh] ${first ? "h-[0.9vh] w-[0.9vh]" : "h-[0.7vh] w-[0.7vh]"}`}
                  aria-hidden="true"
                >
                  <path d="M6 0 L12 6 L6 12 L0 6 Z" fill={col.rim} />
                </svg>

                <span
                  className={`font-display font-bold leading-none ${first ? "text-[2.4vh]" : "text-[2vh]"}`}
                  style={{ color: col.ink }}
                >
                  {winner.points} pts
                </span>
              </div>
            </div>

            {/* ---- Base lip. Wider than the plinth, so the column reads as
                    standing on something rather than being a flat bar. ---- */}
            <div
              className="h-[1.8vh] w-[102%] rounded-[0.4vh]"
              style={{
                background: col.lip,
                boxShadow: `inset 0 1px 0 rgba(255,255,255,0.45), 0 8px 18px -8px rgba(0,0,0,0.85)`,
              }}
              aria-hidden="true"
            />
          </div>
        );
      })}
    </div>
  );
}
