"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/**
 * Tweens between score values instead of snapping, so a player earning
 * points reads as "climbing" rather than a silent swap.
 *
 * Writes the interpolated value straight to the DOM node rather than
 * through state: a tween ticks ~60x/second, and re-rendering the whole
 * scoreboard row on every one of those frames would be wasted work
 * (React would diff a subtree just to change one text node). Skips the
 * tween on first paint — there's nothing to count up from — and under
 * reduced-motion.
 */
export default function AnimatedNumber({ value, className = "" }: { value: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);
  const isFirst = useRef(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (isFirst.current) {
      isFirst.current = false;
      prev.current = value;
      return;
    }
    if (prev.current === value) return;

    const from = prev.current;
    prev.current = value;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.textContent = String(value);
      return;
    }

    const counter = { n: from };
    const tween = gsap.to(counter, {
      n: value,
      duration: 0.7,
      ease: "power2.out",
      onUpdate: () => {
        el.textContent = String(Math.round(counter.n));
      },
      onComplete: () => {
        el.textContent = String(value);
      },
    });

    return () => {
      tween.kill();
      el.textContent = String(value);
    };
  }, [value]);

  // Server/first render shows the real value, so there is no flash of a
  // stale number if JS is slow to boot.
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {value}
    </span>
  );
}
