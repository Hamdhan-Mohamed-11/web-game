import type { ReactNode } from "react";
import { TrophyIcon } from "@/components/shared/icons";

/**
 * Frosted card holding the live standings. The top highlight line and the
 * inset white border are what sell the "pane of glass" read — without them
 * a translucent fill just looks like a flat grey box on a projector.
 *
 * `aside` (the question number + countdown) rides in this header rather than
 * in a footer pill: on a projector the room's eyes are already on the
 * standings, so the timer belongs in the same glance, and reclaiming the
 * footer's height is what lets all ten rows fit without scrolling.
 */
export default function GlassPanel({
  title,
  aside,
  children,
}: {
  title: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      className="animate-rise-in relative flex min-h-0 w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/12 bg-white/[0.07] px-6 py-[2vh] shadow-[0_24px_80px_-20px_rgba(0,0,0,0.75)] backdrop-blur-2xl lg:max-w-4xl lg:px-8 2xl:max-w-5xl"
      style={{ animationDelay: "120ms" }}
    >
      {/* Specular highlight along the top edge. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
      />

      <div className="mb-[1.6vh] flex shrink-0 items-center justify-between gap-4">
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2.5">
            <TrophyIcon className="h-[2.6vh] w-[2.6vh] shrink-0 text-gold-400" />
            <h2 className="truncate font-display text-[2.3vh] font-bold uppercase tracking-[0.22em] text-gold-400">
              {title}
            </h2>
          </div>
          <span
            aria-hidden="true"
            className="mt-[0.6vh] h-px w-full bg-gradient-to-r from-gold-500 via-gold-500/40 to-transparent"
          />
        </div>

        {aside && <div className="shrink-0">{aside}</div>}
      </div>

      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}
