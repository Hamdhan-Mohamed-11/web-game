/**
 * Decorative furniture for the Readers' Summit wall.
 *
 * These exist because the networking dashboard is furniture in a room, not a
 * page someone reads: it is looked at from twenty feet, for a whole evening,
 * by people who are supposed to be talking to each other rather than to the
 * screen. Flat cards read as "a website is showing" from that distance; the
 * gradients, rims and metallic ornament here are what make it read as a
 * ceremony instead.
 *
 * Everything is inline SVG sized in `em` off the parent's font-size, so a
 * caller can size any of it in vh and have it scale with the panel.
 */

/* ------------------------------------------------------------------ laurel */

/** Cubic bezier the laurel's stem follows; leaves are placed along it. */
const STEM = [
  { x: 76, y: 14 },
  { x: 34, y: 46 },
  { x: 22, y: 108 },
  { x: 52, y: 166 },
] as const;

function bezierAt(t: number) {
  const [p0, p1, p2, p3] = STEM;
  const u = 1 - t;
  const x = u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x;
  const y = u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y;
  // Derivative, for the leaf's angle — a laurel whose leaves ignore the
  // stem's direction reads as scattered petals rather than a branch.
  const dx = 3 * u * u * (p1.x - p0.x) + 6 * u * t * (p2.x - p1.x) + 3 * t * t * (p3.x - p2.x);
  const dy = 3 * u * u * (p1.y - p0.y) + 6 * u * t * (p2.y - p1.y) + 3 * t * t * (p3.y - p2.y);
  return { x, y, angle: (Math.atan2(dy, dx) * 180) / Math.PI };
}

const LEAF_STOPS = [0.06, 0.19, 0.32, 0.45, 0.58, 0.71, 0.84, 0.95];

/**
 * A single leaf, as a lens pointing along +x from the origin.
 *
 * Plain ellipses were the first attempt and read as a caterpillar on the
 * wall: a laurel leaf is pointed at both ends, and at this size that
 * silhouette is the whole difference between "branch" and "squiggle".
 */
const LEAF_PATH = "M0 0 C7 -6, 19 -6.5, 28 0 C19 6.5, 7 6, 0 0 Z";

/**
 * One laurel branch, curving from top to bottom. Mirror it with a scaleX(-1)
 * to get the matching half — a wreath drawn as two independent halves never
 * quite lines up.
 */
export function LaurelBranch({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const d = `M${STEM[0].x} ${STEM[0].y} C${STEM[1].x} ${STEM[1].y}, ${STEM[2].x} ${STEM[2].y}, ${STEM[3].x} ${STEM[3].y}`;

  return (
    <svg viewBox="0 0 104 180" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id="laurel-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FDE9A9" />
          <stop offset="38%" stopColor="#F0C868" />
          <stop offset="68%" stopColor="#C98A28" />
          <stop offset="100%" stopColor="#8A5A16" />
        </linearGradient>
      </defs>

      <path d={d} stroke="url(#laurel-gold)" strokeWidth="3" strokeLinecap="round" fill="none" />

      {LEAF_STOPS.map((t, i) => {
        const { x, y, angle } = bezierAt(t);
        // Every leaf sweeps up and away from the number the branch frames,
        // alternating between two angles off the stem's tangent so the
        // branch reads as foliage rather than a row of identical blades.
        // Leaves shrink toward the tip, as they do on a real branch.
        const sweep = i % 2 === 0 ? 122 : 158;
        const scale = 1 - i * 0.055;
        return (
          <path
            key={t}
            d={LEAF_PATH}
            fill="url(#laurel-gold)"
            opacity={0.94}
            transform={`translate(${x} ${y}) rotate(${angle + sweep}) scale(${scale})`}
          />
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------- wreath */

const WREATH_R = 68;
/** Degrees in SVG space: 90 is straight down, 180 is left, 270 is up. */
const WREATH_FROM = 98;
const WREATH_TO = 214;
const WREATH_LEAVES = 8;

function polar(deg: number, r = WREATH_R) {
  const a = (deg * Math.PI) / 180;
  return { x: 100 + Math.cos(a) * r, y: 100 + Math.sin(a) * r };
}

/**
 * An open laurel wreath, drawn to sit *behind* a circular medal rather than
 * beside it.
 *
 * Flanking branches were the first attempt and read as two gold specks at
 * medal size — a wreath only says "award" when it actually curves around
 * something. Leaves follow the same circle as the stem and lean back along
 * it, which is what stops them looking like a sunburst.
 */
export function LaurelWreath({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const from = polar(WREATH_FROM);
  const to = polar(WREATH_TO);

  const leaves = Array.from({ length: WREATH_LEAVES }, (_, i) => {
    const t = i / (WREATH_LEAVES - 1);
    const theta = WREATH_FROM + t * (WREATH_TO - WREATH_FROM);
    return { theta, ...polar(theta), scale: 1.04 - i * 0.055 };
  });

  return (
    <svg viewBox="0 0 200 200" className={className} style={style} aria-hidden="true">
      <defs>
        <linearGradient id="wreath-gold" x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#B8791F" />
          <stop offset="35%" stopColor="#F0C868" />
          <stop offset="70%" stopColor="#FDE9A9" />
          <stop offset="100%" stopColor="#C98A28" />
        </linearGradient>
      </defs>

      {/* Left half drawn once, then mirrored — two hand-placed halves never
          quite match, and the asymmetry is obvious on a ten-foot screen. */}
      {[false, true].map((mirror) => (
        <g
          key={String(mirror)}
          transform={mirror ? "translate(200 0) scale(-1 1)" : undefined}
        >
          <path
            d={`M${from.x} ${from.y} A${WREATH_R} ${WREATH_R} 0 0 0 ${to.x} ${to.y}`}
            stroke="url(#wreath-gold)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
          />
          {leaves.map((l) => (
            <path
              key={l.theta}
              d={LEAF_PATH}
              fill="url(#wreath-gold)"
              transform={`translate(${l.x} ${l.y}) rotate(${l.theta - 150}) scale(${l.scale})`}
            />
          ))}
        </g>
      ))}
    </svg>
  );
}

/** The pair, facing each other. Children sit between them. */
export function LaurelFrame({ children, armClass }: { children: React.ReactNode; armClass: string }) {
  return (
    <div className="flex items-center justify-center gap-[1vh]">
      <LaurelBranch className={armClass} />
      <div className="min-w-0">{children}</div>
      <LaurelBranch className={`${armClass} -scale-x-100`} />
    </div>
  );
}

/* ----------------------------------------------------------------- rules */

/**
 * Gold hairline with a centred diamond. The reference leans on this to break
 * sections without adding another box; a plain 1px line reads as a table.
 */
export function DiamondRule({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-[0.8vh] ${className}`} aria-hidden="true">
      <span className="h-px flex-1 bg-gradient-to-r from-transparent to-gold-500/55" />
      <svg viewBox="0 0 12 12" className="h-[1.1vh] w-[1.1vh] shrink-0">
        <path d="M6 0 L12 6 L6 12 L0 6 Z" fill="#E0982C" />
      </svg>
      <span className="h-px flex-1 bg-gradient-to-l from-transparent to-gold-500/55" />
    </div>
  );
}

/** Bracket marks at a panel's corners — cheap, and reads as a frame. */
export function CornerMarks() {
  const corners = [
    "left-[0.7vh] top-[0.7vh]",
    "right-[0.7vh] top-[0.7vh] -scale-x-100",
    "left-[0.7vh] bottom-[0.7vh] -scale-y-100",
    "right-[0.7vh] bottom-[0.7vh] -scale-x-100 -scale-y-100",
  ];
  return (
    <>
      {corners.map((pos) => (
        <svg
          key={pos}
          viewBox="0 0 20 20"
          className={`pointer-events-none absolute h-[1.9vh] w-[1.9vh] text-gold-500/50 ${pos}`}
          aria-hidden="true"
        >
          <path d="M1 7 V1 H7" stroke="currentColor" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      ))}
    </>
  );
}

/* -------------------------------------------------------------- monogram */

/**
 * Initials disc, standing in for the photograph we do not have: participants
 * type a name on a phone and nothing else, so a face here would be invented.
 * Two letters at this size stay legible across a hall.
 */
export function Monogram({ name, className = "" }: { name: string; className?: string }) {
  const initials =
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((w) => w[0] ?? "")
      .join("")
      .toUpperCase() || "?";

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full font-display font-bold text-navy-950 ${className}`}
      style={{
        background: "linear-gradient(145deg, #FDE9A9 0%, #F0C868 40%, #C98A28 72%, #E8B65A 100%)",
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.55), 0 3px 10px -3px rgba(0,0,0,0.65)",
      }}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

/* ------------------------------------------------------------ book plate */

/**
 * An engraved book spine, used where the reference shows a cover image. We
 * only ever have a typed title — matching that to real cover art would be
 * guesswork, and a wrong cover on a ten-foot screen is worse than none.
 */
export function BookPlate({ className = "" }: { className?: string }) {
  return (
    <span
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-[0.4vh] ${className}`}
      style={{
        background: "linear-gradient(160deg, #12377a 0%, #0a2559 55%, #061b42 100%)",
        boxShadow: "inset 0 0 0 1px rgba(240,200,104,0.4), 0 3px 9px -3px rgba(0,0,0,0.7)",
      }}
      aria-hidden="true"
    >
      {/* Spine bands, as on a bound hardback. */}
      <span className="absolute inset-y-0 left-[18%] w-px bg-gold-400/30" />
      <svg viewBox="0 0 24 24" className="h-[55%] w-[55%] text-gold-400/85" fill="none" stroke="currentColor" strokeWidth="1.7">
        <path d="M12 6.6S9.6 5 6.2 5.4v12c3.4-.4 5.8 1.2 5.8 1.2s2.4-1.6 5.8-1.2v-12C14.4 5 12 6.6 12 6.6z" />
        <path d="M12 6.6v12" />
      </svg>
    </span>
  );
}

/* --------------------------------------------------------------- texture */

/**
 * Fine grain over the whole wall. LED panels render large flat fields with
 * visible banding; a little noise breaks it up and is the single cheapest
 * thing that stops big gradients looking like compression artefacts.
 */
export const NOISE_STYLE: React.CSSProperties = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.42'/%3E%3C/svg%3E\")",
  mixBlendMode: "overlay",
};
