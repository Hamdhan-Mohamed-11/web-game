import type { ReactNode } from "react";
import { TrophyIcon } from "@/components/shared/icons";

/**
 * Frosted card holding the live standings. The top highlight line and the
 * inset white border are what sell the "pane of glass" read — without them
 * a translucent fill just looks like a flat grey box on a projector.
 */
export default function GlassPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section
      className="animate-rise-in relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/12 bg-white/[0.07] p-6 shadow-[0_24px_80px_-20px_rgba(0,0,0,0.75)] backdrop-blur-2xl lg:max-w-4xl lg:p-8 2xl:max-w-5xl"
      style={{ animationDelay: "120ms" }}
    >
      {/* Specular highlight along the top edge. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent"
      />

      <div className="mb-5 flex flex-col items-center lg:mb-6">
        <div className="flex items-center gap-2.5">
          <TrophyIcon className="h-6 w-6 text-gold-400 lg:h-7 lg:w-7" />
          <h2 className="font-display text-xl font-bold uppercase tracking-[0.22em] text-gold-400 lg:text-2xl">
            {title}
          </h2>
        </div>
        <span
          aria-hidden="true"
          className="mt-2 h-px w-40 bg-gradient-to-r from-transparent via-gold-500 to-transparent lg:w-56"
        />
      </div>

      {children}
    </section>
  );
}
