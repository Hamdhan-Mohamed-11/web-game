export function CrownIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3 18h18l-1.6-9.6-4.9 3.9L12 5l-2.5 7.3-4.9-3.9L3 18Zm0 2h18v2H3v-2Z" />
    </svg>
  );
}

/**
 * An open book. Used on the LED screen instead of 📖: the machine driving a
 * venue display often has no emoji font installed, and a missing glyph shows
 * as a tofu box in front of the whole room.
 */
export function BookIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 7c-1.8-1.3-4-2-6.5-2H3v13h2.5c2.5 0 4.7.7 6.5 2 1.8-1.3 4-2 6.5-2H21V5h-2.5C16 5 13.8 5.7 12 7Z" />
      <path d="M12 7v13" />
    </svg>
  );
}

export function TrophyIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M7 4h10v4a5 5 0 0 1-10 0V4Z" />
      <path d="M7 5H4a3 3 0 0 0 3 4M17 5h3a3 3 0 0 1-3 4" />
      <path d="M12 13v3M9 20h6M9.5 20c0-2 .8-2.5 2.5-3 1.7.5 2.5 1 2.5 3" />
    </svg>
  );
}
