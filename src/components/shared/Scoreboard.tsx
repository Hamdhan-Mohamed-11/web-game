"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import type { LeaderboardRow } from "@/lib/realtime/useLeaderboard";

interface ScoreboardProps {
  rows: LeaderboardRow[];
  showProgress?: boolean;
  progressTotal?: number;
  theme?: "light" | "dark";
}

const RANK_BADGE: Record<number, string> = {
  0: "bg-gold-500 text-navy-950",
  1: "bg-navy-100 text-navy-900",
  2: "bg-gold-100 text-gold-700",
};

/**
 * Live-ranked list. Reordering (an "overtake") is animated with a manual
 * FLIP: each row's position is measured before and after the DOM updates
 * for the new order, then the delta is animated away with GSAP rather than
 * letting the browser jump-cut to the new layout. A row that climbs also
 * gets a brief gold pulse so the overtake reads clearly at a glance on a
 * big screen across a room.
 */
export default function Scoreboard({ rows, showProgress = false, progressTotal, theme = "light" }: ScoreboardProps) {
  const rowRefs = useRef(new Map<string, HTMLLIElement>());
  const prevRects = useRef(new Map<string, DOMRect>());
  const prevRanks = useRef(new Map<string, number>());

  useLayoutEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const nextRects = new Map<string, DOMRect>();
    rowRefs.current.forEach((el, id) => nextRects.set(id, el.getBoundingClientRect()));

    if (!reduceMotion) {
      rowRefs.current.forEach((el, id) => {
        const prev = prevRects.current.get(id);
        const next = nextRects.get(id);
        if (!prev || !next) return;

        const deltaY = prev.top - next.top;
        if (deltaY !== 0) {
          gsap.fromTo(el, { y: deltaY }, { y: 0, duration: 0.55, ease: "power2.out" });
        }

        const prevRank = prevRanks.current.get(id);
        const nextRank = rows.findIndex((r) => r.participantId === id);
        if (prevRank !== undefined && nextRank >= 0 && nextRank < prevRank) {
          gsap.fromTo(
            el,
            { boxShadow: "0 0 0 0 rgba(224,152,44,0.7)" },
            { boxShadow: "0 0 0 12px rgba(224,152,44,0)", duration: 0.8, ease: "power1.out" }
          );
        }
      });
    }

    prevRects.current = nextRects;
    prevRanks.current = new Map(rows.map((r, i) => [r.participantId, i]));
  }, [rows]);

  if (rows.length === 0) {
    return <p className={theme === "dark" ? "text-white/50" : "text-ink-600"}>Waiting for scores…</p>;
  }

  return (
    <ol className="flex flex-col gap-2">
      {rows.map((row, i) => (
        <li
          key={row.participantId}
          ref={(el) => {
            if (el) rowRefs.current.set(row.participantId, el);
            else rowRefs.current.delete(row.participantId);
          }}
          className={`flex items-center gap-3 rounded-xl px-4 py-3 ${
            theme === "dark" ? "bg-white/5 backdrop-blur-sm" : "bg-white border border-navy-100 shadow-card"
          } ${i < 3 ? "py-4" : ""}`}
        >
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-display text-sm font-bold ${
              RANK_BADGE[i] ?? (theme === "dark" ? "bg-white/10 text-white/70" : "bg-cream-200 text-ink-600")
            }`}
          >
            {i + 1}
          </span>
          <span
            className={`flex-1 truncate font-medium ${i < 3 ? "text-lg" : "text-base"} ${
              theme === "dark" ? "text-white" : "text-navy-900"
            }`}
          >
            {row.displayName}
          </span>
          {showProgress && (
            <span className={`text-sm tabular-nums ${theme === "dark" ? "text-white/60" : "text-ink-600"}`}>
              {row.progress}/{progressTotal}
            </span>
          )}
          <span
            className={`font-display font-bold tabular-nums ${i < 3 ? "text-xl" : "text-base"} ${
              theme === "dark" ? "text-gold-400" : "text-gold-700"
            }`}
          >
            {row.totalPoints}
          </span>
        </li>
      ))}
    </ol>
  );
}
