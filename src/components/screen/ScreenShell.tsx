import Image from "next/image";
import type { ReactNode } from "react";

/**
 * Shared chrome for the three LED screen views.
 *
 * Sized for the room, not a laptop: this is projected on a TV people read
 * from across a hall, so type scales up hard at the `xl`/`2xl` breakpoints
 * rather than staying at comfortable desk sizes.
 */
export default function ScreenShell({
  gameName,
  children,
  footer,
  center = false,
}: {
  gameName?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  center?: boolean;
}) {
  return (
    <main className="screen-bg flex min-h-screen flex-col overflow-hidden px-6 py-8 lg:px-12 lg:py-10">
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

      <header className="animate-rise-in flex shrink-0 flex-col items-center text-center">
        {/* The brand asset has a cream background baked into the file, so on
            a dark screen it's presented as a deliberate printed plaque
            rather than pretending it has transparency. */}
        <div className="rounded-xl bg-cream-50 px-4 py-2 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.6)] lg:px-5 lg:py-2.5">
          <Image
            src="/pick-a-book-logo.png"
            alt="Pick a Book — Readers' Summit 2026"
            width={826}
            height={349}
            priority
            className="h-auto w-32 lg:w-44 2xl:w-52"
          />
        </div>

        {gameName && (
          <h1 className="mt-4 font-display text-3xl font-bold tracking-tight text-white lg:mt-5 lg:text-5xl 2xl:text-6xl">
            {gameName}
          </h1>
        )}
      </header>

      <div
        className={`flex min-h-0 flex-1 flex-col ${
          center ? "items-center justify-center" : "items-center justify-center py-6 lg:py-8"
        }`}
      >
        {children}
      </div>

      {footer && <footer className="animate-rise-in flex shrink-0 justify-center">{footer}</footer>}
    </main>
  );
}
