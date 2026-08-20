interface LeadInProps {
  count: number;
  /** "screen" scales for a projector; "phone" for a handset; "inline" for the admin panel. */
  size?: "screen" | "phone" | "inline";
  /** "inline" sits on the admin panel's white card; the others on navy. */
  tone?: "dark" | "light";
  label?: string;
}

const NUMERAL_SIZE = {
  screen: "text-[22vh] leading-none",
  phone: "text-8xl",
  inline: "text-4xl",
} as const;

const LABEL_SIZE = {
  screen: "text-2xl tracking-[0.5em] lg:text-4xl",
  phone: "text-sm tracking-[0.4em]",
  inline: "text-xs tracking-[0.3em]",
} as const;

/**
 * The synchronised 3-2-1. Every view — phone, projector, admin panel —
 * renders this off the same server timestamp so the whole room counts
 * together; see useLeadIn for why it can't be a local setInterval.
 *
 * `key={count}` on the numeral is what re-fires the pop animation on each
 * tick; without it React reuses the node and the number changes silently.
 */
export default function LeadIn({ count, size = "screen", tone = "dark", label = "Get Ready" }: LeadInProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <span
        className={`font-display font-semibold uppercase ${LABEL_SIZE[size]} ${
          tone === "dark" ? "text-white/50" : "text-ink-600"
        }`}
      >
        {label}
      </span>
      <span
        key={count}
        className={`animate-pop-in font-display font-bold tabular-nums ${NUMERAL_SIZE[size]} ${
          tone === "dark" ? "text-gold-500" : "text-gold-600"
        }`}
        style={tone === "dark" ? { textShadow: "0 0 60px rgba(224,152,44,0.45)" } : undefined}
      >
        {count > 0 ? count : "Go!"}
      </span>
    </div>
  );
}
