"use client";

import { useEffect, useState } from "react";
import { useParticipant } from "@/lib/participant/useParticipant";
import { useRound } from "@/lib/realtime/useRound";
import { useBookMatchSession } from "@/lib/realtime/useBookMatchSession";
import { getGameMeta } from "@/lib/games";
import JoinForm from "@/components/participant/JoinForm";
import MatchBoard from "@/components/participant/MatchBoard";
import BrandMark from "@/components/shared/BrandMark";

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
  const [ceremonyDone, setCeremonyDone] = useState(false);
  const [finalPoints, setFinalPoints] = useState<number | null>(null);
  const [checkingIn, setCheckingIn] = useState(false);

  useEffect(() => {
    if (ceremonyDone && !session && !checkingIn) {
      // Guards a one-shot async RPC (checkIn) behind a synchronous flag so
      // the effect can't fire it twice while the request is in flight.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCheckingIn(true);
      checkIn().catch(() => setCheckingIn(false));
    }
  }, [ceremonyDone, session, checkingIn, checkIn]);

  if (!ready) return null;

  if (!participant) {
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
      <main className="flex min-h-screen items-center justify-center bg-cream-50 text-ink-600">
        Getting your board ready…
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
