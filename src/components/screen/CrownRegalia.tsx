import Image from "next/image";

/**
 * The king and queen flanking the Genre Crown screen. Genre Crown only —
 * the other two games keep the plain navy field.
 *
 * Both source PNGs are transparent and already composed against one edge
 * (the king occupies the left of his frame, the queen the right of hers), so
 * anchoring each to its own side of the viewport has them facing inward
 * toward the standings without any cropping.
 *
 * They sit at z-0 behind the content and are dimmed, with a horizontal mask
 * fading each toward the middle: at full strength they compete with the
 * leaderboard for attention, which is the one thing the room actually needs
 * to read from across a hall.
 */
export default function CrownRegalia() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 select-none overflow-hidden">
      <div
        className="absolute bottom-0 left-0 h-[92vh] w-[46vw] opacity-45"
        style={{ maskImage: "linear-gradient(to right, black 45%, transparent 100%)", WebkitMaskImage: "linear-gradient(to right, black 45%, transparent 100%)" }}
      >
        <Image
          src="/king.png"
          alt=""
          fill
          sizes="46vw"
          priority
          className="object-contain object-left-bottom"
        />
      </div>

      <div
        className="absolute bottom-0 right-0 h-[92vh] w-[46vw] opacity-45"
        style={{ maskImage: "linear-gradient(to left, black 45%, transparent 100%)", WebkitMaskImage: "linear-gradient(to left, black 45%, transparent 100%)" }}
      >
        <Image
          src="/queen.png"
          alt=""
          fill
          sizes="46vw"
          priority
          className="object-contain object-right-bottom"
        />
      </div>
    </div>
  );
}
