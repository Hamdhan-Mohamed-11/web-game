"use client";

import { useEffect, useRef } from "react";

const COLORS = ["#E0982C", "#F0C868", "#FBEDD1", "#FFFFFF", "#164B9E", "#1F8A5A"];
const COUNT = 160;
const DURATION_MS = 6000;

interface Piece {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  vrot: number;
  color: string;
}

/**
 * Canvas confetti for the winner reveal.
 *
 * Hand-rolled rather than pulling in a library: it's ~60 lines, and this
 * runs on a projector driven by whatever low-power stick is behind the wall
 * — worth knowing exactly how many particles are in flight and that it
 * stops dead afterwards rather than idling a rAF loop for the rest of the
 * night.
 *
 * Pieces are rectangles rotated about their centre, which reads as tumbling
 * paper; a circle or a dot would just look like falling confetti-coloured
 * rain from twenty feet away.
 */
export default function Confetti({ fire }: { fire: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!fire) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Cap the backing store at 2x: on a 1536-wide wall a higher ratio buys
    // nothing visible and costs fill rate on a weak GPU.
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Two launchers at the lower corners, angled inward — a top-down
    // sprinkle would rain over the winner's name instead of framing it.
    const pieces: Piece[] = Array.from({ length: COUNT }, (_, i) => {
      const fromLeft = i % 2 === 0;
      const angle = (fromLeft ? -60 : -120) * (Math.PI / 180) + (Math.random() - 0.5) * 0.7;
      const speed = 14 + Math.random() * 12;
      return {
        x: fromLeft ? width * 0.08 : width * 0.92,
        y: height * 0.95,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        w: 6 + Math.random() * 7,
        h: 10 + Math.random() * 8,
        rot: Math.random() * Math.PI * 2,
        vrot: (Math.random() - 0.5) * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      };
    });

    let raf = 0;
    const start = performance.now();

    function frame(now: number) {
      const elapsed = now - start;
      if (!ctx) return;
      ctx.clearRect(0, 0, width, height);

      // Fade the whole burst out over its last second rather than letting
      // pieces vanish mid-air.
      const fade = Math.max(0, Math.min(1, (DURATION_MS - elapsed) / 1000));
      ctx.globalAlpha = fade;

      for (const p of pieces) {
        p.vy += 0.32; // gravity
        p.vx *= 0.99; // drag
        p.x += p.vx;
        p.y += p.vy;
        p.rot += p.vrot;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }

      if (elapsed < DURATION_MS) {
        raf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, width, height);
      }
    }

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [fire]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-50 h-full w-full"
    />
  );
}
