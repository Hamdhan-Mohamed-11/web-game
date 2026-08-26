"use client";

import { useEffect, useState } from "react";
import { useNetworkingDashboard } from "@/lib/networking/useNetworkingDashboard";
import AnimatedNumber from "@/components/shared/AnimatedNumber";
import Medal, { isMedalRank } from "@/components/shared/Medal";
import { BookIcon } from "@/components/shared/icons";

/** How long each window of the recent-books feed stays up. */
const FEED_ROTATE_MS = 3200;
const FEED_WINDOW = 4;

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col rounded-2xl border border-white/12 bg-white/[0.07] px-[1.8vh] py-[1.4vh] backdrop-blur-2xl">
      <h2 className="shrink-0 truncate font-display text-[2.7vh] font-bold uppercase tracking-[0.18em] text-gold-400">
        {title}
      </h2>
      <span
        aria-hidden="true"
        className="mt-[0.5vh] mb-[1vh] h-px w-full shrink-0 bg-gradient-to-r from-gold-500 via-gold-500/40 to-transparent"
      />
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  );
}

export default function NetworkingDashboard({ qrDataUrl, joinUrl }: { qrDataUrl: string; joinUrl: string }) {
  const { stats, connectors, books, recent, loaded } = useNetworkingDashboard();
  const [feedOffset, setFeedOffset] = useState(0);

  // Rotates the window over the recent buffer so the feed keeps moving even
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

  return (
    // Four columns because the wall is 1536x640 — a 2.4:1 letterbox where
    // vertical space is the scarce resource and horizontal space is
    // abundant. Stacking these would push everything off the bottom.
    <div className="grid h-full w-full grid-cols-[auto_1.15fr_1fr_1fr] gap-[1.6vh]">
      {/* ---- Join ---- */}
      <section className="flex flex-col items-center justify-center rounded-2xl border border-white/12 bg-white/[0.07] px-[1.6vh] py-[1.4vh] backdrop-blur-2xl">
        <span className="font-display text-[2.4vh] font-bold uppercase tracking-[0.2em] text-gold-400">
          Scan to join
        </span>
        <div className="mt-[1.2vh] rounded-xl bg-white p-[0.9vh]">
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URI, no next/image benefit */}
          <img src={qrDataUrl} alt={`QR code to join at ${joinUrl}`} className="h-[30vh] w-[30vh]" />
        </div>
        <span className="mt-[1vh] max-w-[30vh] truncate text-[1.5vh] text-white/45">{joinUrl}</span>
      </section>

      {/* ---- Live counter + feed ---- */}
      <section className="flex min-w-0 flex-col rounded-2xl border border-gold-500/30 bg-gradient-to-b from-gold-500/[0.14] to-white/[0.05] px-[2vh] py-[1.4vh] backdrop-blur-2xl">
        <AnimatedNumber
          value={stats.totalConnections}
          className="block text-center font-display text-[15vh] font-bold leading-none text-white"
        />
        <span className="mt-[0.4vh] block text-center font-display text-[2.9vh] font-bold uppercase tracking-[0.24em] text-gold-400">
          Connections Made
        </span>

        {/* Deliberately not showing "books discussed": every connection
            records exactly one book, so that number is always identical to
            the connection count above it, and two identical big numbers side
            by side read as a broken screen from across a hall. The distinct
            facts are how many different titles came up and how many people
            joined; the raw tally is in the admin dashboard. */}
        <div className="mt-[1.4vh] flex shrink-0 justify-center gap-[3vh] border-y border-white/10 py-[1vh]">
          {[
            { n: stats.uniqueTitles, label: "Different titles" },
            { n: stats.totalParticipants, label: "Readers joined" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-display text-[4.2vh] font-bold leading-none text-gold-400">{s.n}</div>
              <div className="mt-[0.3vh] text-[1.8vh] uppercase tracking-[0.14em] text-white/50">{s.label}</div>
            </div>
          ))}
        </div>

        {stats.topBook && (
          <div className="mt-[1.2vh] shrink-0 text-center">
            <div className="text-[1.6vh] font-semibold uppercase tracking-[0.16em] text-white/45">
              Most discussed book
            </div>
            <div className="mt-[0.3vh] truncate font-display text-[3vh] font-bold text-white">{stats.topBook}</div>
          </div>
        )}

        <div className="mt-[1.2vh] min-h-0 flex-1">
          <div className="text-center text-[1.9vh] font-semibold uppercase tracking-[0.16em] text-white/45">
            Being talked about right now
          </div>
          <ul className="mt-[0.8vh] flex flex-col gap-[0.5vh]">
            {feed.map((title, i) => (
              <li
                key={`${title}-${feedOffset}-${i}`}
                className="animate-rise-in truncate text-center font-display text-[2.7vh] font-semibold text-white/85"
                style={{ animationDelay: `${i * 70}ms`, animationDuration: "0.5s" }}
              >
                {title}
              </li>
            ))}
            {feed.length === 0 && loaded && (
              <li className="text-center text-[1.8vh] text-white/40">Waiting for the first conversation…</li>
            )}
          </ul>
        </div>
      </section>

      {/* ---- Top connectors ---- */}
      <Panel title="Who's Connecting?">
        {connectors.length === 0 ? (
          <p className="text-[1.8vh] text-white/40">No connections yet.</p>
        ) : (
          <ol className="flex flex-col gap-[1.1vh]">
            {connectors.map((c, i) => (
              <li
                key={c.participantId}
                className={`flex items-center gap-[1.2vh] rounded-xl px-[1.2vh] py-[1vh] ${
                  i === 0 ? "border border-gold-500/50 bg-gold-500/10" : "bg-white/[0.06]"
                }`}
              >
                {isMedalRank(i) ? (
                  <Medal rank={i} size="4.4vh" />
                ) : (
                  <span className="flex h-[4.2vh] w-[4.2vh] shrink-0 items-center justify-center rounded-full bg-white/10 font-display text-[2.2vh] font-bold text-white/70">
                    {i + 1}
                  </span>
                )}
                <span className="min-w-0 flex-1 truncate font-medium text-white text-[2.9vh]">{c.displayName}</span>
                <AnimatedNumber
                  value={c.connections}
                  className="shrink-0 font-display text-[3.2vh] font-bold text-gold-400"
                />
              </li>
            ))}
          </ol>
        )}
      </Panel>

      {/* ---- Top books ---- */}
      {/* Kept short deliberately — the panel is a quarter of the wall and a
          longer heading truncates to an ellipsis at this width. */}
      <Panel title="Most Discussed Books">
        {books.length === 0 ? (
          <p className="text-[1.8vh] text-white/40">No books yet.</p>
        ) : (
          <ol className="flex flex-col gap-[1.1vh]">
            {books.map((b, i) => (
              <li
                key={b.title}
                className={`flex items-center gap-[1vh] rounded-xl px-[1.2vh] py-[1vh] ${
                  i === 0 ? "border border-gold-500/50 bg-gold-500/10" : "bg-white/[0.06]"
                }`}
              >
                <BookIcon className="h-[2.6vh] w-[2.6vh] shrink-0 text-gold-400/80" />
                <span className="min-w-0 flex-1 truncate font-medium text-white text-[2.8vh]">{b.title}</span>
                <AnimatedNumber
                  value={b.mentions}
                  className="shrink-0 font-display text-[3.1vh] font-bold text-gold-400"
                />
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
