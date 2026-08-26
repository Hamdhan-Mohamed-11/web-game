"use client";

import { useEffect, useState } from "react";
import { useNetworkingDashboard } from "@/lib/networking/useNetworkingDashboard";
import AnimatedNumber from "@/components/shared/AnimatedNumber";
import Medal, { isMedalRank } from "@/components/shared/Medal";
import {
  BookPlate,
  CornerMarks,
  DiamondRule,
  LaurelFrame,
  Monogram,
  NOISE_STYLE,
} from "@/components/screen/ornaments";

/** How long each window of the recent-books ticker stays up. */
const FEED_ROTATE_MS = 3200;
const FEED_WINDOW = 3;

/**
 * Both leaderboards always render this many rows, filling the shortfall with
 * ghost rows.
 *
 * This is the single biggest fix to how the wall looked. The panels are a
 * fixed quarter of a 2.4:1 screen, so with two real entries the old layout
 * left most of two columns as flat empty navy — which from the floor reads
 * as a screen that has crashed. The room sees this board at nought
 * connections, before anyone has met anybody; that is the state it most
 * needs to look deliberate in, not the full one.
 */
const ROWS = 5;

/* ------------------------------------------------------------------ panel */

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`relative flex min-h-0 min-w-0 flex-col overflow-hidden rounded-[1.6vh] border border-gold-500/25 bg-gradient-to-b from-white/[0.10] via-white/[0.05] to-white/[0.02] px-[1.6vh] pt-[1.3vh] pb-[1.4vh] shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_20px_44px_-22px_rgba(0,0,0,0.9)] ${className}`}
    >
      <CornerMarks />
      <h2 className="shrink-0 text-center font-display text-[2.5vh] font-bold uppercase leading-tight tracking-[0.14em] text-gold-400">
        {title}
      </h2>
      <DiamondRule className="mt-[0.7vh] mb-[1.1vh] shrink-0" />
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </section>
  );
}

/** Placeholder slot — an empty seat at the table, not a missing element. */
function GhostRow({ label }: { label: string }) {
  return (
    <li className="flex flex-1 items-center gap-[1.2vh] rounded-[1vh] border border-dashed border-white/12 px-[1.2vh]">
      <span className="grid h-[4.6vh] w-[4.6vh] shrink-0 place-items-center rounded-full border border-dashed border-white/15">
        <span className="h-[0.9vh] w-[0.9vh] rotate-45 bg-white/20" />
      </span>
      <span className="truncate text-[2.1vh] tracking-wide text-white/50">{label}</span>
    </li>
  );
}

/* -------------------------------------------------------------- dashboard */

export default function NetworkingDashboard({
  qrDataUrl,
  joinUrl,
}: {
  qrDataUrl: string;
  joinUrl: string;
}) {
  const { stats, connectors, books, recent, loaded } = useNetworkingDashboard();
  const [feedOffset, setFeedOffset] = useState(0);

  // Rotates the window over the recent buffer so the ticker keeps moving even
  // during a lull — a static list reads as a broken screen to the room.
  useEffect(() => {
    if (recent.length <= FEED_WINDOW) return;
    const t = setInterval(() => setFeedOffset((o) => (o + 1) % recent.length), FEED_ROTATE_MS);
    return () => clearInterval(t);
  }, [recent.length]);

  const feed =
    recent.length <= FEED_WINDOW
      ? recent
      : Array.from({ length: FEED_WINDOW }, (_, i) => recent[(feedOffset + i) % recent.length]);

  const topMentions = books[0]?.mentions ?? 1;

  return (
    // Four columns because the wall is 1536x640 — a 2.4:1 letterbox where
    // vertical space is the scarce resource and horizontal space is
    // abundant. Stacking these would push everything off the bottom.
    <div className="relative grid h-full w-full grid-cols-[auto_1.18fr_1fr_1fr] gap-[1.5vh]">
      {/* Grain over the whole board. Pointer-events-none and aria-hidden: it
          is texture, and must never intercept anything or be announced. */}
      <div
        className="pointer-events-none absolute inset-0 z-20 opacity-[0.16]"
        style={NOISE_STYLE}
        aria-hidden="true"
      />

      {/* ---------------------------------------------------------- join --- */}
      <section className="relative flex flex-col items-center justify-center overflow-hidden rounded-[1.6vh] border border-gold-500/30 bg-gradient-to-b from-white/[0.11] to-white/[0.03] px-[2vh] shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_20px_44px_-22px_rgba(0,0,0,0.9)]">
        <CornerMarks />

        <span className="font-display text-[2.3vh] font-bold uppercase leading-tight tracking-[0.18em] text-gold-400">
          Join the
        </span>
        <span className="font-display text-[3.1vh] font-bold uppercase leading-tight tracking-[0.1em] text-white">
          Reader Network
        </span>

        {/* Double rim, as on a printed invitation. */}
        <div className="mt-[1.3vh] rounded-[1vh] bg-gold-400/25 p-[0.5vh]">
          <div className="rounded-[0.7vh] bg-white p-[0.9vh] shadow-[0_10px_28px_-10px_rgba(0,0,0,0.85)]">
            {/* eslint-disable-next-line @next/next/no-img-element -- data: URI, no next/image benefit */}
            <img src={qrDataUrl} alt={`QR code to join at ${joinUrl}`} className="h-[27vh] w-[27vh]" />
          </div>
        </div>

        <span className="mt-[1.2vh] font-display text-[2.1vh] italic text-gold-100/90">
          Scan to join the conversation
        </span>
        <span className="mt-[0.4vh] max-w-[30vh] truncate text-[1.5vh] text-white/60">{joinUrl}</span>
      </section>

      {/* ------------------------------------------- live counter + ticker --- */}
      <section className="relative flex min-w-0 flex-col overflow-hidden rounded-[1.6vh] border border-gold-500/40 bg-gradient-to-b from-gold-500/[0.16] via-white/[0.05] to-white/[0.02] px-[2vh] pt-[1.4vh] pb-[1.4vh] shadow-[inset_0_1px_0_rgba(255,255,255,0.18),0_24px_50px_-24px_rgba(0,0,0,0.95)]">
        <CornerMarks />

        <div className="shrink-0">
          <LaurelFrame armClass="h-[15vh] w-auto shrink-0">
            <AnimatedNumber
              value={stats.totalConnections}
              className="block bg-gradient-to-b from-white via-gold-100 to-gold-400 bg-clip-text text-center font-display text-[15vh] font-bold leading-none text-transparent [filter:drop-shadow(0_0_22px_rgba(240,200,104,0.35))]"
            />
          </LaurelFrame>
          <span className="mt-[0.2vh] block text-center font-display text-[2.8vh] font-bold uppercase tracking-[0.22em] text-gold-400">
            Connections Made
          </span>
        </div>

        {/* Deliberately not showing "books discussed": every connection
            records exactly one book, so that number is always identical to
            the connection count above it, and two identical big numbers on
            one screen read as a bug from across a hall. The distinct facts
            are how many different titles came up and how many people
            joined; the raw tally is in the admin dashboard. */}
        <DiamondRule className="mt-[1.2vh] shrink-0" />
        <div className="flex shrink-0 justify-center gap-[3.4vh] py-[1.1vh]">
          {[
            { n: stats.totalParticipants, label: "Readers joined" },
            { n: stats.uniqueTitles, label: "Different titles" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <AnimatedNumber
                value={s.n}
                className="block font-display text-[4.4vh] font-bold leading-none text-gold-400"
              />
              <div className="mt-[0.3vh] text-[1.7vh] uppercase tracking-[0.14em] text-white/65">
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <DiamondRule className="shrink-0" />

        <div className="mt-[1.1vh] flex min-h-0 flex-1 flex-col justify-center">
          <div className="text-center text-[1.8vh] font-semibold uppercase tracking-[0.16em] text-white/65">
            Being talked about right now
          </div>
          <ul className="mt-[0.7vh] flex flex-col gap-[0.4vh]">
            {feed.map((title, i) => (
              <li
                key={`${title}-${feedOffset}-${i}`}
                className="animate-rise-in flex items-center justify-center gap-[1vh]"
                style={{ animationDelay: `${i * 70}ms`, animationDuration: "0.5s" }}
              >
                <span className="h-[0.7vh] w-[0.7vh] shrink-0 rotate-45 bg-gold-500/70" aria-hidden="true" />
                <span className="truncate font-display text-[2.6vh] font-semibold text-white/90">
                  {title}
                </span>
              </li>
            ))}
            {feed.length === 0 && loaded && (
              <li className="text-center font-display text-[2.1vh] italic text-white/45">
                Waiting for the first conversation…
              </li>
            )}
          </ul>
        </div>
      </section>

      {/* ------------------------------------------------ top connectors --- */}
      <Panel title="Who's Connecting?">
        <ol className="flex min-h-0 flex-1 flex-col gap-[0.9vh]">
          {Array.from({ length: ROWS }, (_, i) => {
            const c = connectors[i];
            if (!c) return <GhostRow key={`ghost-${i}`} label="Open place" />;

            return (
              <li
                key={c.participantId}
                className={`flex flex-1 items-center gap-[1.1vh] rounded-[1vh] px-[1.1vh] ${
                  i === 0
                    ? "border border-gold-500/55 bg-gradient-to-r from-gold-500/22 to-gold-500/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                    : "border border-white/10 bg-white/[0.05]"
                }`}
              >
                {isMedalRank(i) ? (
                  <Medal rank={i} size="4.6vh" />
                ) : (
                  <span className="grid h-[4.4vh] w-[4.4vh] shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 font-display text-[2.2vh] font-bold text-white/75">
                    {i + 1}
                  </span>
                )}

                <Monogram name={c.displayName} className="h-[4.4vh] w-[4.4vh] text-[1.9vh]" />

                <span className="min-w-0 flex-1 truncate font-display text-[2.9vh] font-semibold text-white">
                  {c.displayName}
                </span>

                <span className="shrink-0 text-right">
                  <AnimatedNumber
                    value={c.connections}
                    className="block font-display text-[3.2vh] font-bold leading-none text-gold-400"
                  />
                  <span className="block text-[1.3vh] uppercase tracking-[0.12em] text-white/55">
                    {c.connections === 1 ? "reader" : "readers"}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </Panel>

      {/* ---------------------------------------------------- top books --- */}
      <Panel title="Books Getting Everyone Talking">
        <ol className="flex min-h-0 flex-1 flex-col gap-[0.9vh]">
          {Array.from({ length: ROWS }, (_, i) => {
            const b = books[i];
            if (!b) return <GhostRow key={`ghost-${i}`} label="Yet to be discussed" />;

            return (
              <li
                key={b.title}
                className={`flex flex-1 items-center gap-[1.1vh] rounded-[1vh] px-[1.1vh] ${
                  i === 0
                    ? "border border-gold-500/55 bg-gradient-to-r from-gold-500/22 to-gold-500/5 shadow-[inset_0_1px_0_rgba(255,255,255,0.16)]"
                    : "border border-white/10 bg-white/[0.05]"
                }`}
              >
                <BookPlate className="h-[5vh] w-[3.6vh]" />

                <span className="flex min-w-0 flex-1 flex-col gap-[0.9vh]">
                  <span className="truncate font-display text-[2.7vh] font-semibold leading-none text-white">
                    {b.title}
                  </span>
                  {/* Share-of-conversation bar. Gives the column a second,
                      pre-attentive read: which title is running away with the
                      evening is legible before any number is. */}
                  <span className="h-[0.5vh] w-full overflow-hidden rounded-full bg-white/14" aria-hidden="true">
                    <span
                      className="block h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-400 transition-[width] duration-700 ease-out"
                      style={{ width: `${Math.max(8, (b.mentions / topMentions) * 100)}%` }}
                    />
                  </span>
                </span>

                <span className="shrink-0 text-right">
                  <AnimatedNumber
                    value={b.mentions}
                    className="block font-display text-[3.1vh] font-bold leading-none text-gold-400"
                  />
                  <span className="block text-[1.3vh] uppercase tracking-[0.12em] text-white/55">
                    {b.mentions === 1 ? "talk" : "talks"}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </Panel>
    </div>
  );
}
