import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Shared chrome for the LED screen views.
 *
 * Sized for the wall, not a laptop. The target is a 1536x640 panel — twenty
 * feet by eight, a 2.4:1 letterbox — so vertical space is the scarce
 * resource and everything is measured in vh rather than on a breakpoint
 * ladder: a full Top 10, or the networking dashboard, has to fit whatever
 * height it is given with nothing scrolled out of sight on a screen nobody
 * can touch.
 */
export default function ScreenShell({
  gameName,
  children,
  decor,
  center = false,
  compact = false,
}: {
  gameName?: ReactNode;
  children: ReactNode;
  /** Game-specific background artwork, rendered behind the content. */
  decor?: ReactNode;
  center?: boolean;
  /**
   * Trades header height for content height and lets the child span the
   * full width. For dense dashboards that need every vertical pixel on a
   * letterbox panel.
   */
  compact?: boolean;
}) {
  return (
    <main className="screen-bg flex h-screen flex-col overflow-hidden px-[1.6vh] py-[1.6vh] lg:px-[2.4vh]">
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
      <header
        className={`animate-rise-in relative z-10 flex shrink-0 items-center text-center ${
          compact ? "justify-center gap-[2.4vh]" : "flex-col"
        }`}
      >
        {/* The brand asset has a cream background baked into the file, so on
            a dark screen it's presented as a deliberate printed plaque
            rather than pretending it has transparency. */}
        <div className="rounded-xl bg-cream-50 px-[1.4vh] py-[0.8vh] shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6)]">
          <Image
            src="/picklogo.webp"
            alt="Pick a Book — Readers' Summit 2026"
            width={1600}
            height={763}
            priority
            className={compact ? "h-[12vh] w-auto" : "h-[16vh] w-auto"}
          />
        </div>

        {gameName && (
          <h1
            className={`font-display font-bold leading-tight tracking-tight text-white ${
              compact ? "text-[4.4vh]" : "mt-[1.4vh] text-[5.2vh]"
            }`}
          >
            {gameName}
          </h1>
        )}
      </header>

      <div
        className={`relative z-10 flex min-h-0 flex-1 flex-col ${
          compact ? "mt-[1.6vh] items-stretch" : "items-center"
        } ${center ? "justify-center" : compact ? "" : "justify-center py-[1.5vh]"}`}
      >
        {children}
      </div>
    </main>
  );
}
