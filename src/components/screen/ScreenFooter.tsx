import type { ReactNode } from "react";

/** Pill-shaped status bar for the bottom of the LED screens. */
export default function ScreenFooter({ label, timer }: { label: ReactNode; timer?: ReactNode }) {
  return (
    <div className="flex items-center gap-5 rounded-full border border-white/12 bg-white/[0.06] px-6 py-3 backdrop-blur-xl lg:gap-7 lg:px-8 lg:py-4">
      <span className="font-display text-lg font-semibold text-white/85 lg:text-2xl">{label}</span>
      {timer && (
        <>
          <span aria-hidden="true" className="h-7 w-px bg-white/15 lg:h-9" />
          {timer}
        </>
      )}
    </div>
  );
}
