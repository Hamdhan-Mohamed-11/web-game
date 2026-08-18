"use client";

import { useState, type FormEvent } from "react";
import BrandMark from "@/components/shared/BrandMark";
import Button from "@/components/shared/Button";

interface JoinFormProps {
  gameName: string;
  onJoin: (displayName: string) => Promise<unknown>;
}

export default function JoinForm({ gameName, onJoin }: JoinFormProps) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError(null);
    try {
      await onJoin(trimmed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <BrandMark />
        <h1 className="mt-6 text-center font-display text-2xl font-semibold text-navy-900 sm:text-3xl">
          {gameName}
        </h1>

        <form onSubmit={handleSubmit} className="mt-8">
          <label htmlFor="displayName" className="mb-2 block text-sm font-medium text-ink-600">
            Your name
          </label>
          <input
            id="displayName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex"
            maxLength={40}
            autoFocus
            autoComplete="name"
            className="w-full rounded-xl border border-navy-100 bg-white px-4 py-3.5 text-base text-navy-900 shadow-card placeholder:text-ink-600/40 focus:border-navy-700 focus:outline-none focus:ring-2 focus:ring-navy-700/30"
          />
          {error && <p className="mt-3 text-sm text-danger-600">{error}</p>}
          <Button
            type="submit"
            variant="gold"
            disabled={submitting || name.trim().length === 0}
            className="mt-4 w-full text-base"
          >
            {submitting ? "Joining…" : "Join the game"}
          </Button>
        </form>
      </div>
    </main>
  );
}
