const MEDAL_THEME = {
  0: {
    face: "linear-gradient(145deg, #FDE9A9 0%, #E0982C 45%, #B8791F 70%, #F0C868 100%)",
    rim: "#8A5A16",
    text: "#3A2408",
    glow: "0 0 18px -2px rgba(224,152,44,0.75)",
  },
  1: {
    face: "linear-gradient(145deg, #FFFFFF 0%, #D5DBE4 45%, #A7B0BE 70%, #EDF1F6 100%)",
    rim: "#8A94A3",
    text: "#2B3442",
    glow: "0 0 14px -3px rgba(203,210,220,0.7)",
  },
  2: {
    face: "linear-gradient(145deg, #EFC49B 0%, #B2723A 45%, #8A5426 70%, #D9A273 100%)",
    rim: "#6E4118",
    text: "#2E1B08",
    glow: "0 0 14px -3px rgba(178,114,58,0.6)",
  },
} as const;

export type MedalRank = keyof typeof MEDAL_THEME;

export function isMedalRank(index: number): index is MedalRank {
  return index === 0 || index === 1 || index === 2;
}

/**
 * Physical-feeling medal for the top three ranks: a metallic disc with a
 * ribbon, plus a crown on first place. Gradients run light→dark→light so
 * the disc reads as a curved metal surface rather than a flat colour chip,
 * which is what makes it legible as a *medal* from across a room on the
 * LED screen.
 *
 * Every internal dimension is expressed in `em` off the wrapper's font-size,
 * so `size` accepts any CSS length — the LED screen sizes medals in vh so
 * all ten rows fit whatever the projector's resolution.
 */
export default function Medal({ rank, size = 40 }: { rank: MedalRank; size?: number | string }) {
  const theme = MEDAL_THEME[rank];
  const length = typeof size === "number" ? `${size}px` : size;

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: length, height: length, fontSize: length }}
    >
      {rank === 0 && (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden="true"
          className="absolute text-gold-400 drop-shadow"
          style={{ width: "0.5em", height: "0.5em", top: "-0.3em" }}
        >
          <path d="M3 18h18l-1.6-9.6-4.9 3.9L12 5l-2.5 7.3-4.9-3.9L3 18Zm0 2h18v2H3v-2Z" />
        </svg>
      )}

      {/* Ribbon tails behind the disc */}
      <span
        aria-hidden="true"
        className="absolute"
        style={{
          bottom: "-0.16em",
          width: "0.52em",
          height: "0.34em",
          background: theme.face,
          opacity: 0.55,
          clipPath: "polygon(0 0, 100% 0, 78% 100%, 50% 72%, 22% 100%)",
        }}
      />

      <span
        className="relative flex h-full w-full items-center justify-center rounded-full"
        style={{
          background: theme.face,
          boxShadow: `inset 0 0 0 max(1.5px, 0.045em) ${theme.rim}, ${theme.glow}`,
        }}
      >
        <span className="font-display font-bold leading-none" style={{ color: theme.text, fontSize: "0.44em" }}>
          {rank + 1}
        </span>
      </span>
    </span>
  );
}
