"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";
import { playFanfare } from "@/lib/audio/sfx";
import Podium, { type PodiumWinner } from "@/components/screen/Podium";

const PARTICLE_COUNT = 16;

/**
 * The confirmed result on the LED screen.
 *
 * Two shapes, because the games crown differently:
 * - "podium": First Lines and Book Match rank a top three, shown as a
 *   Kahoot-style podium.
 * - "single": Genre Crown crowns one ruler per genre. A lone "1st Place"
 *   card reads as the top of a missing list, so the title itself becomes
 *   the honour ("Ruler of Fiction") with the name beneath it.
 */
export default function WinnerReveal({
  roundId,
  title,
  variant = "podium",
}: {
  roundId: string;
  title: string;
  variant?: "podium" | "single";
}) {
  const [winners, setWinners] = useState<PodiumWinner[] | null>(null);
  const particlesRef = useRef<HTMLDivElement>(null);
  const singleRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    supabase
      .from("round_results")
      .select("winners")
      .eq("round_id", roundId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.winners) setWinners(data.winners as unknown as PodiumWinner[]);
      });
  }, [roundId]);

  useEffect(() => {
    if (!winners || winners.length === 0) return;

    playFanfare();

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const tl = gsap.timeline();

    if (variant === "single" && singleRef.current) {
      gsap.set(singleRef.current, { opacity: 0, y: 40, scale: 0.85 });
      tl.to(singleRef.current, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.6)" });
    }

    // Burst timed to land with the winner: on the podium that's after the
    // columns have risen (third → second → first, 260ms apart).
    const particles = particlesRef.current?.children;
    if (particles) {
      tl.fromTo(
        particles,
        { opacity: 1, x: 0, y: 0, scale: 0 },
        {
          opacity: 0,
          scale: 1,
          x: (i) => Math.cos((i / PARTICLE_COUNT) * Math.PI * 2) * (140 + Math.random() * 80),
          y: (i) => Math.sin((i / PARTICLE_COUNT) * Math.PI * 2) * (140 + Math.random() * 80),
          duration: 1.2,
          ease: "power2.out",
          stagger: 0.01,
        },
        variant === "podium" ? 0.75 : "-=0.3"
      );
    }

    return () => {
      tl.kill();
    };
  }, [winners, variant]);

  const champion = winners?.find((w) => w.place === 1);

  return (
    <div className="relative flex w-full flex-col items-center text-center">
      <span className="text-[2vh] font-semibold uppercase tracking-[0.25em] text-gold-400">
        {variant === "single" ? "The crown goes to" : title}
      </span>

      {variant === "podium" && (
        <h1 className="mt-[0.6vh] font-display text-[5vh] font-bold text-white">Winners</h1>
      )}

      {!winners && <p className="mt-10 text-[2.4vh] text-white/60">Confirming winners…</p>}

      <div className="relative mt-[3vh] flex w-full flex-col items-center">
        <div ref={particlesRef} className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <span
              key={i}
              className="absolute h-2 w-2 rounded-full"
              style={{ background: i % 2 === 0 ? "#E0982C" : "#F0C868" }}
            />
          ))}
        </div>

        {winners && variant === "podium" && <Podium winners={winners} />}

        {winners && variant === "single" && champion && (
          <div
            ref={singleRef}
            className="rounded-3xl border border-gold-500/50 bg-gradient-to-b from-gold-500/20 to-transparent px-[6vh] py-[4vh]"
          >
            <div className="font-display text-[4vh] font-bold uppercase tracking-[0.12em] text-gold-400">
              {title}
            </div>
            <div className="mt-[1.6vh] font-display text-[7vh] font-bold leading-none text-white">
              {champion.displayName}
            </div>
            <div className="mt-[1.4vh] font-display text-[3vh] font-semibold text-gold-400">
              {champion.points} pts
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
