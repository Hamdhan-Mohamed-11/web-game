"use client";

import { useState } from "react";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import { formatCountdown, useNetworkingRound } from "@/lib/networking/useNetworkingRound";

/**
 * The host's control over the round clock.
 *
 * Deliberately three buttons and one number rather than a schedule: on the
 * night the round starts when the compère finishes saying "go", which is
 * never the minute anyone planned. Start is the button that gets pressed;
 * End now exists because a host will sometimes need to cut it short, and
 * Clear because a rehearsal must not leave the real event locked out.
 */
export default function RoundTimer() {
  const round = useNetworkingRound();
  const [minutes, setMinutes] = useState(5);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function send(action: "start" | "end" | "clear") {
    if (action === "end" && !window.confirm("End the round now? Nobody will be able to add connections.")) {
      return;
    }
    setBusy(action);
    setError(null);
    try {
      const res = await fetch("/api/networking/timer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, durationSeconds: Math.round(minutes * 60) }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error ?? "That didn't work");
      round.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That didn't work");
    } finally {
      setBusy(null);
    }
  }

  const running = round.secondsLeft !== null && round.isOpen;
  const finished = round.secondsLeft !== null && !round.isOpen;

  return (
    <Card className="mb-6 p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-lg font-semibold text-navy-900">Round timer</h2>
          <p className="mt-1 text-sm text-ink-600">
            {running
              ? "Running — the wall and every phone are counting down."
              : finished
                ? "Closed. New connections are being refused."
                : "Not started. Connections are open, with no clock on the wall."}
          </p>
        </div>

        <div
          className={`rounded-xl px-4 py-2 text-center tabular-nums ${
            running ? "bg-gold-100 text-gold-700" : finished ? "bg-navy-100 text-navy-900" : "bg-cream-100 text-ink-600"
          }`}
        >
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em]">
            {running ? "Time left" : finished ? "Finished" : "Idle"}
          </div>
          <div className="font-display text-2xl font-bold">
            {round.secondsLeft === null ? "—" : formatCountdown(round.secondsLeft)}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="nk-minutes" className="mb-1.5 block text-sm font-semibold text-navy-900">
            Minutes
          </label>
          <input
            id="nk-minutes"
            type="number"
            min={1}
            max={120}
            step={1}
            value={minutes}
            onChange={(e) => setMinutes(Math.max(1, Math.min(120, Number(e.target.value) || 5)))}
            className="w-24 rounded-xl border border-navy-100 bg-white px-3 py-2 text-base text-navy-900 focus:border-navy-700 focus:outline-none"
          />
        </div>

        <Button variant="gold" onClick={() => send("start")} disabled={busy !== null} className="px-4 py-2 text-sm">
          {busy === "start" ? "Starting…" : running ? "Restart" : `Start ${minutes} min`}
        </Button>

        {running && (
          <Button variant="danger" onClick={() => send("end")} disabled={busy !== null} className="px-4 py-2 text-sm">
            {busy === "end" ? "Ending…" : "End now"}
          </Button>
        )}

        {round.secondsLeft !== null && (
          <Button variant="outline" onClick={() => send("clear")} disabled={busy !== null} className="px-4 py-2 text-sm">
            {busy === "clear" ? "Clearing…" : "Clear timer"}
          </Button>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-danger-600" role="alert">
          {error}
        </p>
      )}
    </Card>
  );
}
