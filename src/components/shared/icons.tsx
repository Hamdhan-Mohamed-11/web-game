export function CrownIcon({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M3 18h18l-1.6-9.6-4.9 3.9L12 5l-2.5 7.3-4.9-3.9L3 18Zm0 2h18v2H3v-2Z" />
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
