"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";

interface Winner {
  place: number;
  displayName: string;
  points: number;
}

const PLACE_LABEL: Record<number, string> = { 1: "1st Place", 2: "2nd Place", 3: "3rd Place" };
const PARTICLE_COUNT = 16;

export default function WinnerReveal({ roundId, title }: { roundId: string; title: string }) {
  const [winners, setWinners] = useState<Winner[] | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const particlesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();
    supabase
      .from("round_results")
      .select("winners")
      .eq("round_id", roundId)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.winners) setWinners(data.winners as unknown as Winner[]);
      });
  }, [roundId]);

  useEffect(() => {
    if (!winners || winners.length === 0) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cards = cardRefs.current.filter((c): c is HTMLDivElement => c !== null);
    if (cards.length === 0) return;

    if (reduceMotion) {
      gsap.set(cards, { opacity: 1, scale: 1, y: 0 });
      return;
    }

    // Reveal in ascending rank order (lowest place first), winner last and
    // biggest, so the room's attention lands on #1 at the climax.
    const ordered = [...cards].reverse();
    const tl = gsap.timeline();
    gsap.set(cards, { opacity: 0, y: 40, scale: 0.8 });

    ordered.forEach((card, i) => {
      tl.to(
        card,
        { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "back.out(1.6)" },
        i === 0 ? 0 : "-=0.15"
      );
    });

    const winnerCard = cards[0];
    if (winnerCard) {
      tl.to(winnerCard, { scale: 1.06, duration: 0.25, ease: "power1.out" }, "-=0.1").to(
        winnerCard,
        { scale: 1, duration: 0.3, ease: "power2.out" }
      );

      const particles = particlesRef.current?.children;
      if (particles) {
        tl.fromTo(
          particles,
          { opacity: 1, x: 0, y: 0, scale: 0 },
          {
            opacity: 0,
            scale: 1,
            x: (i) => Math.cos((i / PARTICLE_COUNT) * Math.PI * 2) * (120 + Math.random() * 60),
            y: (i) => Math.sin((i / PARTICLE_COUNT) * Math.PI * 2) * (120 + Math.random() * 60),
            duration: 1.1,
            ease: "power2.out",
            stagger: 0.01,
          },
          "-=0.5"
        );
      }
    }

    return () => {
      tl.kill();
    };
  }, [winners]);

  return (
    <div ref={containerRef} className="relative flex flex-col items-center text-center">
      <span className="text-sm font-semibold uppercase tracking-[0.25em] text-gold-400">{title}</span>
      <h1 className="mt-2 font-display text-4xl font-bold text-white sm:text-5xl">Winners</h1>

      {!winners && <p className="mt-10 text-xl text-white/60">Confirming winners…</p>}

      <div className="relative mt-12 flex flex-col items-center gap-6">
        <div ref={particlesRef} className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <span
              key={i}
              className="absolute h-2 w-2 rounded-full"
              style={{ background: i % 2 === 0 ? "#E0982C" : "#F0C868" }}
            />
          ))}
        </div>

        {winners?.map((w, idx) => (
          <div
            key={w.place}
            ref={(el) => {
              cardRefs.current[idx] = el;
            }}
            className={
              w.place === 1
                ? "rounded-2xl border border-gold-500/50 bg-gradient-to-b from-gold-500/20 to-transparent px-12 py-8"
                : "px-6 py-3"
            }
          >
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-400">
              {PLACE_LABEL[w.place] ?? `${w.place}th Place`}
            </div>
            <div
              className={`mt-2 font-display font-bold text-white ${w.place === 1 ? "text-5xl sm:text-6xl" : "text-3xl"}`}
            >
              {w.displayName}
            </div>
            <div className={`mt-2 font-display font-semibold text-gold-400 ${w.place === 1 ? "text-2xl" : "text-lg"}`}>
              {w.points} pts
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
