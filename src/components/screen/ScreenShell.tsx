import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Shared chrome for the three LED screen views.
 *
 * Sized for the room, not a laptop: this is projected on a TV people read
 * from across a hall. Everything here is measured in vh rather than on a
 * breakpoint ladder, because the hard constraint is vertical — a full Top 10
 * has to fit whatever the projector's height is, with nothing scrolled out
 * of sight on a screen nobody can touch.
 */
export default function ScreenShell({
  gameName,
  children,
  decor,
  center = false,
}: {
  gameName?: ReactNode;
  children: ReactNode;
  /** Game-specific background artwork, rendered behind the content. */
  decor?: ReactNode;
  center?: boolean;
}) {
  return (
    <main className="screen-bg flex h-screen flex-col overflow-hidden px-6 py-[2vh] lg:px-12">
      {/* Ambient depth. Sits behind everything via z-index on .screen-orb. */}
      <div
        className="screen-orb animate-orb-a"
        style={{ width: "48vw", height: "48vw", top: "-14vw", left: "-10vw", background: "#1d4f9e" }}
        aria-hidden="true"
      />
      <div
        className="screen-orb animate-orb-b"
        style={{ width: "38vw", height: "38vw", bottom: "-20vw", right: "-14vw", background: "#c8862a" }}
        aria-hidden="true"
      />

      {decor}

      {/* z-10 on both content blocks, not just a z-0 on `decor`: an absolutely
          positioned child paints above static siblings regardless of DOM
          order, so without this the artwork would cover the standings. */}
      <header className="animate-rise-in relative z-10 flex shrink-0 flex-col items-center text-center">
        {/* The brand asset has a cream background baked into the file, so on
            a dark screen it's presented as a deliberate printed plaque
            rather than pretending it has transparency. */}
        <div className="rounded-xl bg-cream-50 px-[1.4vh] py-[0.8vh] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6)]">
          <Image
            src="/picklogo.png"
            alt="Pick a Book — Readers' Summit 2026"
            width={1600}
            height={763}
            priority
            className="h-[9vh] w-auto"
          />
        </div>

        {gameName && (
          <h1 className="mt-[1.4vh] font-display text-[4.6vh] font-bold leading-tight tracking-tight text-white">
            {gameName}
          </h1>
        )}
      </header>

      <div
        className={`relative z-10 flex min-h-0 flex-1 flex-col items-center ${
          center ? "justify-center" : "justify-center py-[1.5vh]"
        }`}
      >
        {children}
      </div>
    </main>
  );
}
