"use client";

import { useState, type FormEvent } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";
import { useNetworkingParticipant } from "@/lib/networking/useNetworkingParticipant";
import { formatCountdown, useNetworkingRound } from "@/lib/networking/useNetworkingRound";
import { playCorrect, playWrong } from "@/lib/audio/sfx";
import BrandMark from "@/components/shared/BrandMark";
import Button from "@/components/shared/Button";

const FIELD =
  "w-full rounded-xl border border-navy-100 bg-white px-4 py-4 text-base text-navy-900 shadow-card " +
  "focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30";

const LABEL = "mb-1.5 block text-sm font-semibold text-navy-900";

/**
 * The round clock, in the participant's pocket.
 *
 * Shown on every screen after joining, because the pressure is the point of
 * the game: someone who cannot see the clock has no reason to stop chatting
 * and go meet a fourth person. Renders nothing at all before a host starts
 * the round -- a countdown that is not running should not be on screen.
 */
function TimePill({ secondsLeft, isOpen }: { secondsLeft: number | null; isOpen: boolean }) {
  if (secondsLeft === null) return null;
  const urgent = isOpen && secondsLeft <= 60;

  return (
    <div
      className={`mx-auto mt-4 flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-bold tabular-nums ${
        !isOpen
          ? "bg-navy-100 text-navy-900"
          : urgent
            ? "bg-cream-200 text-danger-600 ring-1 ring-danger-600/40"
            : "bg-gold-100 text-gold-700"
      }`}
      role="timer"
      aria-live="off"
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">
        {isOpen ? "Time left" : "Time up"}
      </span>
      {isOpen && <span className="text-base">{formatCountdown(secondsLeft)}</span>}
    </div>
  );
}

export default function NetworkingPage() {
  const { participant, ready, join, forget } = useNetworkingParticipant();
  const round = useNetworkingRound();

  // Registration
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [contact, setContact] = useState("");

  // Connection entry
  const [personMet, setPersonMet] = useState("");
  const [bookTitle, setBookTitle] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicateOf, setDuplicateOf] = useState<string | null>(null);
  const [confirmedCount, setConfirmedCount] = useState<number | null>(null);

  async function handleJoin(e: FormEvent) {
    e.preventDefault();
    if (busy || !name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await join({ displayName: name.trim(), company: company.trim(), contact: contact.trim() });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't join — try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleAddConnection(e: FormEvent) {
    e.preventDefault();
    if (busy || !participant || !personMet.trim() || !bookTitle.trim()) return;
    setBusy(true);
    setError(null);
    setDuplicateOf(null);

    const supabase = getBrowserSupabaseClient();
    const { data, error: rpcError } = await supabase.rpc("networking_add_connection", {
      p_participant_id: participant.id,
      p_person_met: personMet.trim(),
      p_book_title: bookTitle.trim(),
    });

    setBusy(false);

    if (rpcError) {
      // The only way this happens in practice is the participant table having
      // been cleared between rehearsal and the event; drop the stale id so
      // they re-register rather than being stuck unable to submit anything.
      if (rpcError.message.includes("unknown participant")) {
        forget();
        setError("We lost your registration — please enter your name again.");
        return;
      }
      // The server refused on the clock. It is the authority, not this
      // device: a phone running fast can still be showing 0:03 here.
      if (rpcError.message.includes("round is closed")) {
        round.refresh();
        setError("Time's up — that one didn't count.");
        return;
      }
      setError("That didn't save. Check your signal and tap again.");
      return;
    }

    const result = data?.[0];
    if (!result) {
      setError("That didn't save. Check your signal and tap again.");
      return;
    }

    if (result.duplicate) {
      setDuplicateOf(personMet.trim());
      playWrong();
      if ("vibrate" in navigator) navigator.vibrate(160);
      return;
    }

    setConfirmedCount(result.connection_count);
    setPersonMet("");
    setBookTitle("");
    playCorrect();
    if ("vibrate" in navigator) navigator.vibrate([30, 40, 30]);
  }

  if (!ready) return null;

  // ------------------------------------------------------------- time is up
  //
  // Checked before the registration form on purpose. A late scan used to be
  // able to register and only then be told the round was over, which left a
  // participant row that can never add a connection -- inflating "readers
  // joined" on the wall with people who never played.
  if (round.loaded && !round.isOpen) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6 text-center">
        <BrandMark />
        <h1 className="mt-8 font-display text-3xl font-bold text-navy-900">Time&apos;s up!</h1>
        <p className="mt-3 max-w-xs text-lg text-ink-600">
          Networking has closed. Look at the big screen for tonight&apos;s top
          connectors and the books the room was talking about.
        </p>
        {participant && (
          <p className="mt-6 text-sm text-ink-600">
            Thanks for playing, {participant.displayName}.
          </p>
        )}
      </main>
    );
  }

  // ---------------------------------------------------------------- register
  if (!participant) {
    return (
      <main className="flex min-h-screen flex-col bg-cream-50 px-5 pb-12 pt-8">
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
          <BrandMark />
          <h1 className="mt-6 text-center font-display text-2xl font-bold leading-snug text-navy-900">
            Meet a Reader.
            <br />
            Discover a Book.
            <br />
            <span className="text-gold-700">Make a Connection.</span>
          </h1>

          <form onSubmit={handleJoin} className="mt-8 flex flex-col gap-4">
            <div>
              <label htmlFor="nk-name" className={LABEL}>
                Your name
              </label>
              <input
                id="nk-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Nadeesha"
                autoComplete="name"
                maxLength={60}
                required
                className={FIELD}
              />
            </div>

            <div>
              <label htmlFor="nk-company" className={LABEL}>
                Company <span className="font-normal text-ink-600">(optional)</span>
              </label>
              <input
                id="nk-company"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                autoComplete="organization"
                maxLength={80}
                className={FIELD}
              />
            </div>

            <div>
              <label htmlFor="nk-contact" className={LABEL}>
                Mobile or email <span className="font-normal text-ink-600">(optional)</span>
              </label>
              <input
                id="nk-contact"
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                autoComplete="email"
                maxLength={120}
                className={FIELD}
              />
            </div>

            {error && (
              <p className="text-sm font-medium text-danger-600" role="alert">
                {error}
              </p>
            )}

            <Button type="submit" variant="gold" disabled={busy || !name.trim()} className="mt-2 w-full text-base">
              {busy ? "Joining…" : "Start networking"}
            </Button>
          </form>
        </div>
      </main>
    );
  }

  // ------------------------------------------------------- connection made
  if (confirmedCount !== null) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6 text-center">
        <BrandMark />
        <div className="mt-8 animate-pop-in text-6xl" aria-hidden="true">
          🤝
        </div>
        <h1 className="mt-5 font-display text-3xl font-bold text-success-600">Connection made!</h1>
        <p className="mt-3 text-lg text-navy-900">
          You&apos;ve connected with{" "}
          <span className="font-display text-2xl font-bold text-gold-700">{confirmedCount}</span>{" "}
          {confirmedCount === 1 ? "reader" : "readers"} tonight.
        </p>

        <TimePill secondsLeft={round.secondsLeft} isOpen={round.isOpen} />

        <Button
          variant="gold"
          onClick={() => setConfirmedCount(null)}
          className="mt-6 w-full max-w-xs text-base"
        >
          + Meet another reader
        </Button>
      </main>
    );
  }

  // ------------------------------------------------------------ add a person
  return (
    <main className="flex min-h-screen flex-col bg-cream-50 px-5 pb-12 pt-8">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col">
        <BrandMark size="compact" />

        <p className="mt-5 text-center text-sm font-semibold uppercase tracking-[0.18em] text-ink-600">
          Hi {participant.displayName}
        </p>
        <h1 className="mt-2 text-center font-display text-2xl font-bold leading-snug text-navy-900">
          Who did you just meet?
        </h1>

        <TimePill secondsLeft={round.secondsLeft} isOpen={round.isOpen} />

        <form onSubmit={handleAddConnection} className="mt-7 flex flex-col gap-5">
          <div>
            <label htmlFor="nk-person" className={LABEL}>
              Their name
            </label>
            <input
              id="nk-person"
              value={personMet}
              onChange={(e) => {
                setPersonMet(e.target.value);
                setDuplicateOf(null);
              }}
              placeholder="e.g. Ruwan"
              maxLength={80}
              required
              className={FIELD}
            />
          </div>

          <div>
            <label htmlFor="nk-book" className={LABEL}>
              The book you discussed
            </label>
            <input
              id="nk-book"
              value={bookTitle}
              onChange={(e) => setBookTitle(e.target.value)}
              placeholder="e.g. Atomic Habits"
              maxLength={120}
              required
              className={FIELD}
            />
          </div>

          {duplicateOf && (
            <p className="rounded-xl bg-gold-100 px-4 py-3 text-sm font-medium text-gold-700" role="alert">
              You&apos;ve already connected with {duplicateOf}. Go meet someone new!
            </p>
          )}

          {error && (
            <p className="text-sm font-medium text-danger-600" role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            variant="gold"
            disabled={busy || !personMet.trim() || !bookTitle.trim()}
            className="w-full text-base"
          >
            {busy ? "Saving…" : "Add connection"}
          </Button>
        </form>

        <p className="mt-8 text-center text-xs text-ink-600">
          Look at the big screen to see who&apos;s connecting and what the room is reading.
        </p>
      </div>
    </main>
  );
}
