"use client";

import { useEffect, useState } from "react";
import { useParticipant } from "@/lib/participant/useParticipant";
import { useRound } from "@/lib/realtime/useRound";
import { useBookMatchSession } from "@/lib/realtime/useBookMatchSession";
import { useGameLocks, isGameUnlocked } from "@/lib/realtime/useGameLocks";
import { getGameMeta } from "@/lib/games";
import JoinForm from "@/components/participant/JoinForm";
import MatchBoard from "@/components/participant/MatchBoard";
import GameLockedNotice from "@/components/participant/GameLockedNotice";
import BrandMark from "@/components/shared/BrandMark";
import Button from "@/components/shared/Button";

const GAME_SLUG = "book-match";
const meta = getGameMeta(GAME_SLUG)!;
const CEREMONY_SECONDS = 3;

function Ceremony({ onDone }: { onDone: () => void }) {
  const [count, setCount] = useState(CEREMONY_SECONDS);

  useEffect(() => {
    if (count <= 0) {
      onDone();
      return;
    }
    const t = setTimeout(() => setCount((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [count, onDone]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-navy-950">
      <span key={count} className="animate-pop-in font-display text-8xl font-bold text-gold-500">
        {count > 0 ? count : "Go!"}
      </span>
    </main>
  );
}

export default function BookMatchPlayPage() {
  const { participant, ready, join } = useParticipant(GAME_SLUG);
  const { round } = useRound(GAME_SLUG, "match");
  const { session, matchedItemKeys, loaded, checkIn } = useBookMatchSession(round?.id, participant?.id);
  const { locks, loaded: locksLoaded } = useGameLocks();
  const [ceremonyDone, setCeremonyDone] = useState(false);
  const [finalPoints, setFinalPoints] = useState<number | null>(null);
  const [checkInError, setCheckInError] = useState<string | null>(null);
  const [checkInAttempt, setCheckInAttempt] = useState(0);

  useEffect(() => {
    if (!ceremonyDone || session) return;

    let cancelled = false;
    // Clears any error left over from a previous failed attempt before retrying.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCheckInError(null);

    Promise.race([
      checkIn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("Taking too long to connect — check your signal and try again.")), 10000)
      ),
    ])
      .catch((err) => {
        if (cancelled) return;
        setCheckInError(err instanceof Error ? err.message : "Couldn't join the board — try again.");
      });

    return () => {
      cancelled = true;
    };
    // session/checkIn intentionally excluded: session is read once per
    // attempt (checkIn is the only thing that ever sets it, so re-running
    // this effect when it changes would be redundant), and checkIn is a
    // stable callback for a given round/participant pair.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ceremonyDone, checkInAttempt]);

  if (!ready) return null;

  if (!participant) {
    if (!locksLoaded) return null;
    if (!isGameUnlocked(locks, GAME_SLUG)) {
      return <GameLockedNotice gameName={meta.name} />;
    }
    return <JoinForm gameName={meta.name} onJoin={join} />;
  }

  if (round?.status === "confirmed") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6 text-center">
        <BrandMark />
        <h1 className="mt-6 font-display text-3xl font-bold text-navy-900">Game over!</h1>
        {finalPoints !== null && (
          <p className="mt-3 text-lg text-navy-900">
            Your final score: <span className="font-display font-bold text-gold-700">{finalPoints}</span> pts
          </p>
        )}
        <p className="mt-4 text-sm text-ink-600">Look at the LED screen for the winners.</p>
      </main>
    );
  }

  if (finalPoints !== null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6 text-center">
        <BrandMark />
        <h1 className="mt-6 font-display text-2xl font-semibold text-navy-900">Nice work, {participant.displayName}!</h1>
        <p className="mt-3 text-lg text-navy-900">
          Your score: <span className="font-display font-bold text-gold-700">{finalPoints}</span> pts
        </p>
        <p className="mt-4 text-sm text-ink-600">Waiting for the round to end…</p>
      </main>
    );
  }

  if (round?.status !== "active") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6 text-center">
        <BrandMark />
        <h1 className="mt-6 font-display text-2xl font-semibold text-navy-900">You&apos;re in, {participant.displayName}!</h1>
        <p className="mt-3 text-sm text-ink-600">Waiting for the challenge to start…</p>
      </main>
    );
  }

  if (!loaded) return null;

  if (!session && !ceremonyDone) {
    return <Ceremony onDone={() => setCeremonyDone(true)} />;
  }

  if (!session) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream-50 px-6 text-center">
        <BrandMark size="compact" />
        {checkInError ? (
          <>
            <p className="text-danger-600">{checkInError}</p>
            <Button
              variant="gold"
              onClick={() => {
                setCheckInError(null);
                setCheckInAttempt((n) => n + 1);
              }}
            >
              Try again
            </Button>
          </>
        ) : (
          <p className="text-ink-600">Getting your board ready…</p>
        )}
      </main>
    );
  }

  return (
    <MatchBoard
      sessionId={session.id}
      startedAt={session.startedAt}
      initialMatchedItemKeys={matchedItemKeys}
      onFinished={setFinalPoints}
    />
  );
}
