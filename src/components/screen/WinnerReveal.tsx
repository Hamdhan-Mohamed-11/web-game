"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";
import { playFanfare, playTick } from "@/lib/audio/sfx";
import Podium, { type PodiumWinner } from "@/components/screen/Podium";
import Confetti from "@/components/screen/Confetti";

/**
 * Reveal choreography, in milliseconds from the moment the results land.
 *
 * The countdown runs bottom-up — 6th, 5th, 4th, then the podium rises 3rd,
 * 2nd, 1st — so tension builds toward the winner instead of the room
 * reading the whole table at once. Each step is slow enough for a crowd to
 * react to before the next lands.
 */
const STEP_MS = 700;
/** Revealed in this order — lowest first. */
const RUNNER_UP_PLACES = [6, 5, 4] as const;

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
  const [celebrate, setCelebrate] = useState(false);
  const particlesRef = useRef<HTMLDivElement>(null);
  const singleRef = useRef<HTMLDivElement>(null);

  // In reveal order (6th, 5th, 4th), skipping places nobody filled. A round
  // with only four players must not make the podium sit through two empty
  // slots before it starts, so every timing below is derived from how many
  // runners-up there actually are rather than from a fixed three.
  const runnersUp = RUNNER_UP_PLACES.map((place) => winners?.find((w) => w.place === place)).filter(
    (w): w is PodiumWinner => Boolean(w)
  );
  const podiumBaseMs = runnersUp.length * STEP_MS;
  /** Confetti lands just after the winner's column, not long after it. */
  const confettiMs = podiumBaseMs + 2 * STEP_MS + 250;

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

    const timers: ReturnType<typeof setTimeout>[] = [];

    if (variant === "single") {
      // Held until the card has finished springing in — confetti over a
      // card that is still moving reads as a glitch rather than a flourish.
      timers.push(
        setTimeout(() => {
          playFanfare();
          setCelebrate(true);
        }, 450)
      );
    } else {
      // One blip per place as it lands, so the countdown is audible from the
      // back of the room as well as visible.
      runnersUp.forEach((_, i) => {
        timers.push(setTimeout(() => playTick(3), i * STEP_MS));
      });
      [3, 2].forEach((place, i) => {
        if (!winners.some((w) => w.place === place)) return;
        timers.push(setTimeout(() => playTick(3 - i), podiumBaseMs + i * STEP_MS));
      });
      timers.push(
        setTimeout(() => {
          playFanfare();
          setCelebrate(true);
        }, confettiMs)
      );
    }

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      return () => timers.forEach(clearTimeout);
    }

    const tl = gsap.timeline();

    if (variant === "single" && singleRef.current) {
      gsap.set(singleRef.current, { opacity: 0, y: 40, scale: 0.85 });
      tl.to(singleRef.current, { opacity: 1, y: 0, scale: 1, duration: 0.7, ease: "back.out(1.6)" });
    }

    const particles = particlesRef.current?.children;
    if (particles) {
      tl.fromTo(
        particles,
        { opacity: 1, x: 0, y: 0, scale: 0 },
        {
          opacity: 0,
          scale: 1,
          x: (i) => Math.cos((i / 16) * Math.PI * 2) * (140 + Math.random() * 80),
          y: (i) => Math.sin((i / 16) * Math.PI * 2) * (140 + Math.random() * 80),
          duration: 1.2,
          ease: "power2.out",
          stagger: 0.01,
        },
        variant === "podium" ? confettiMs / 1000 : "-=0.3"
      );
    }

    return () => {
      timers.forEach(clearTimeout);
      tl.kill();
    };
    // The timings are derived from `winners`, which is the real trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winners, variant]);

  const champion = winners?.find((w) => w.place === 1);

  return (
    <div className="relative flex w-full flex-col items-center text-center">
      <Confetti fire={celebrate} />

      <span className="text-[2vh] font-semibold uppercase tracking-[0.25em] text-gold-400">
        {variant === "single" ? "The crown goes to" : title}
      </span>

      {variant === "podium" && (
        <h1 className="mt-[0.6vh] font-display text-[4.4vh] font-bold text-white">Final Standings</h1>
      )}

      {!winners && <p className="mt-10 text-[2.4vh] text-white/60">Confirming winners…</p>}

      <div className="relative mt-[2.4vh] flex w-full flex-col items-center">
        <div ref={particlesRef} className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
          {Array.from({ length: 16 }).map((_, i) => (
            <span
              key={i}
              className="absolute h-2 w-2 rounded-full"
              style={{ background: i % 2 === 0 ? "#E0982C" : "#F0C868" }}
            />
          ))}
        </div>

        {winners && variant === "podium" && (
          // Podium centred with the runners-up alongside rather than beneath:
          // on a 2.4:1 wall there is width to spare and almost no height, and
          // stacking them pushed the plinths off the bottom of the panel.
          <div className="flex w-full items-end justify-center gap-[3vw]">
            <Podium winners={winners} baseDelayMs={podiumBaseMs} stepMs={STEP_MS} />

            {runnersUp.length > 0 && (
              <ol className="flex w-[26vw] max-w-md shrink-0 flex-col gap-[0.9vh] pb-[2vh]">
                {/* Ordered 4,5,6 down the page but revealed 6,5,4 — the eye
                    reads a ranking top-down while the reveal climbs. */}
                {[...runnersUp].reverse().map((w) => (
                  <li
                    key={w.place}
                    className="animate-rise-in flex items-center gap-[1.2vh] rounded-xl border border-white/10 bg-white/[0.07] px-[1.4vh] py-[0.8vh] backdrop-blur-sm"
                    style={{
                      // Delay comes from the reveal order, not the place, so a
                      // short field still starts at zero.
                      animationDelay: `${runnersUp.indexOf(w) * STEP_MS}ms`,
                      animationFillMode: "backwards",
                    }}
                  >
                    <span className="flex h-[3.4vh] w-[3.4vh] shrink-0 items-center justify-center rounded-full bg-white/10 font-display text-[1.8vh] font-bold text-white/70">
                      {w.place}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left font-medium text-white text-[2.2vh]">
                      {w.displayName}
                    </span>
                    <span className="shrink-0 font-display text-[2.4vh] font-bold text-gold-400">{w.points}</span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

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
