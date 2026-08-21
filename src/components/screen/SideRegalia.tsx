import Image from "next/image";

/**
 * Artwork flanking an LED screen — one piece anchored to each side, facing
 * inward toward the standings.
 *
 * Both source PNGs are transparent. They sit at z-0 behind the content and
 * are dimmed, with a horizontal mask fading each toward the middle: at full
 * strength they compete with the leaderboard for attention, which is the one
 * thing the room actually needs to read from across a hall. The mask also
 * hides the ragged matte edges left by background removal on some of the
 * source files.
 */
export default function SideRegalia({
  left,
  right,
  /** Lower this if a busier pair of images still fights with the standings. */
  opacity = 0.45,
}: {
  left: string;
  right: string;
  opacity?: number;
}) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden">
      <div
        className="absolute bottom-0 left-0 h-[92vh] w-[46vw]"
        style={{
          opacity,
          maskImage: "linear-gradient(to right, black 45%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to right, black 45%, transparent 100%)",
        }}
      >
        <Image src={left} alt="" fill sizes="46vw" priority className="object-contain object-left-bottom" />
      </div>

      <div
        className="absolute bottom-0 right-0 h-[92vh] w-[46vw]"
        style={{
          opacity,
          maskImage: "linear-gradient(to left, black 45%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to left, black 45%, transparent 100%)",
        }}
      >
        <Image src={right} alt="" fill sizes="46vw" priority className="object-contain object-right-bottom" />
      </div>
    </div>
  );
}
