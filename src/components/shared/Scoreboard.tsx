"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import type { LeaderboardRow } from "@/lib/realtime/useLeaderboard";
import Medal, { isMedalRank } from "@/components/shared/Medal";
import AnimatedNumber from "@/components/shared/AnimatedNumber";

interface ScoreboardProps {
  rows: LeaderboardRow[];
  showProgress?: boolean;
  progressTotal?: number;
  theme?: "light" | "dark";
}

/**
 * Live-ranked list. Reordering (an "overtake") is animated with a manual
 * FLIP: each row's position is measured before and after the DOM updates
 * for the new order, then the delta is animated away with GSAP rather than
 * letting the browser jump-cut to the new layout. A row that climbs also
 * gets a gold pulse and a slight overshoot so the overtake reads clearly at
 * a glance on a big screen across a room.
 */
export default function Scoreboard({ rows, showProgress = false, progressTotal, theme = "light" }: ScoreboardProps) {
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const prevRects = useRef(new Map<string, DOMRect>());
  const prevRanks = useRef(new Map<string, number>());
  const seen = useRef(new Set<string>());

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nextRects = new Map<string, DOMRect>();
    rowRefs.current.forEach((el, id) => nextRects.set(id, el.getBoundingClientRect()));

    if (!reduceMotion) {
      rowRefs.current.forEach((el, id) => {
        // New arrival: fade/slide in rather than popping into the list.
        if (!seen.current.has(id)) {
          gsap.fromTo(
            el,
            { opacity: 0, y: 12, scale: 0.97 },
            { opacity: 1, y: 0, scale: 1, duration: 0.4, ease: "power2.out" }
          );
          return;
        }

        const prev = prevRects.current.get(id);
        const next = nextRects.get(id);
        if (!prev || !next) return;

        const deltaY = prev.top - next.top;
        const prevRank = prevRanks.current.get(id);
        const nextRank = rows.findIndex((r) => r.participantId === id);
        const climbed = prevRank !== undefined && nextRank >= 0 && nextRank < prevRank;

        if (deltaY !== 0) {
          // Climbing rows get a springy overshoot so the eye follows them;
          // rows being passed settle plainly so they don't compete for
          // attention with the overtake itself.
          gsap.fromTo(
            el,
            { y: deltaY },
            {
              y: 0,
              duration: climbed ? 0.65 : 0.5,
              ease: climbed ? "back.out(1.7)" : "power2.out",
            }
          );
        }

        if (climbed) {
          gsap.fromTo(
            el,
            { boxShadow: "0 0 0 0 rgba(224,152,44,0.85)" },
            { boxShadow: "0 0 0 14px rgba(224,152,44,0)", duration: 0.9, ease: "power2.out" }
          );
        }
      });
    }

    rows.forEach((r) => seen.current.add(r.participantId));
    prevRects.current = nextRects;
    prevRanks.current = new Map(rows.map((r, i) => [r.participantId, i]));
  }, [rows]);

  if (rows.length === 0) {
    return <p className={theme === "dark" ? "text-white/50" : "text-ink-600"}>Waiting for scores…</p>;
  }

  // The dark theme only ever renders on the LED screen, read from across a
  // room. It sizes in vh rather than on a breakpoint ladder so a full Top 10
  // always fits the projector's height without scrolling — a fixed px scale
  // that fitted a 1080p panel overflowed a shorter one, and a scrollbar on a
  // screen nobody can touch hides the very rows the room is watching for.
  // The light (admin, laptop) theme keeps comfortable desk sizes.
  const isScreen = theme === "dark";

  return (
    <ol className={`flex flex-col ${isScreen ? "gap-[0.6vh]" : "gap-2"}`}>
      {rows.map((row, i) => {
        const isLeader = i === 0;
        const isPodium = i < 3;
        return (
          <li
            key={row.participantId}
            ref={(el) => {
              if (el) rowRefs.current.set(row.participantId, el);
              else rowRefs.current.delete(row.participantId);
            }}
            className={`flex items-center rounded-xl ${
              isScreen ? "gap-[1.6vh] px-[1.6vh] py-[0.6vh]" : `gap-3 px-4 ${isPodium ? "py-4" : "py-3"}`
            } ${
              isScreen ? "bg-white/[0.07] backdrop-blur-sm" : "border border-navy-100 bg-white shadow-card"
            } ${
              isLeader && isScreen ? "border border-gold-500/50 shadow-[0_0_34px_-8px_rgba(224,152,44,0.6)]" : ""
            } ${isLeader && !isScreen ? "border-2 border-gold-400" : ""}`}
          >
            {isMedalRank(i) ? (
              <Medal rank={i} size={isScreen ? (i === 0 ? "4vh" : "3.7vh") : i === 0 ? 44 : 38} />
            ) : (
              <span
                className={`flex shrink-0 items-center justify-center rounded-full font-display font-bold ${
                  isScreen
                    ? "h-[3.6vh] w-[3.6vh] text-[1.8vh] bg-white/10 text-white/70"
                    : "h-8 w-8 text-sm bg-cream-200 text-ink-600"
                }`}
              >
                {i + 1}
              </span>
            )}

            <span
              className={`flex-1 truncate font-medium ${
                isScreen
                  ? `text-white ${isPodium ? "text-[2.6vh]" : "text-[2.2vh]"}`
                  : `text-navy-900 ${isPodium ? "text-lg" : "text-base"}`
              }`}
            >
              {row.displayName}
            </span>

            {showProgress && (
              <span
                className={`shrink-0 tabular-nums ${
                  isScreen ? "text-[1.9vh] text-white/60" : "text-sm text-ink-600"
                }`}
              >
                {row.progress}/{progressTotal}
              </span>
            )}

            <AnimatedNumber
              value={row.totalPoints}
              className={`shrink-0 font-display font-bold ${
                isScreen
                  ? `text-gold-400 ${isPodium ? "text-[3vh]" : "text-[2.4vh]"}`
                  : `text-gold-700 ${isPodium ? "text-xl" : "text-base"}`
              }`}
            />
          </li>
        );
      })}
    </ol>
  );
}
