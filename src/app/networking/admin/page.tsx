"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/shared/BrandMark";
import Button, { buttonClassName } from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import RoundTimer from "./RoundTimer";

interface AdminData {
  totals: { participants: number; connections: number; hidden: number; uniqueTitles: number };
  leaderboard: { participantId: string; displayName: string; company: string | null; connections: number }[];
  books: { title: string; mentions: number }[];
  recent: {
    id: string;
    participantName: string;
    personMet: string;
    bookTitle: string;
    isHidden: boolean;
    createdAt: string;
  }[];
}

const REFRESH_MS = 8000;

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-navy-100 bg-white px-4 py-3 text-center shadow-card">
      <div className="font-display text-3xl font-bold text-gold-700">{value}</div>
      <div className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-ink-600">{label}</div>
    </div>
  );
}

export default function NetworkingAdminPage() {
  const [data, setData] = useState<AdminData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/networking/admin-data", { cache: "no-store" });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to load");
      setData(await res.json());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    }
  }, []);

  useEffect(() => {
    // `load` only ever sets state after awaiting a fetch, so this is a
    // subscription to an external system (the API) rather than the
    // synchronous cascade the lint rule guards against.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    const t = setInterval(load, REFRESH_MS);
    return () => clearInterval(t);
  }, [load]);

  async function handleReset() {
    if (
      !confirm(
        "Delete ALL networking participants and connections?\n\n" +
          "This cannot be undone. Export the CSV first if you want a record."
      )
    ) {
      return;
    }
    setResetting(true);
    setError(null);
    try {
      const res = await fetch("/api/networking/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: "DELETE ALL NETWORKING DATA" }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setResetting(false);
    }
  }

  async function toggleHidden(id: string, hidden: boolean) {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch("/api/networking/hide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId: id, hidden }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex justify-center">
          <BrandMark />
        </div>

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-semibold text-navy-900">Networking Game</h1>
            <p className="text-sm text-ink-600">Updates every {REFRESH_MS / 1000}s</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/admin" className={buttonClassName("outline", "px-3 py-2 text-xs whitespace-nowrap")}>
              ← Back to admin hub
            </Link>
            <Link
              href="/networking/screen"
              target="_blank"
              className={buttonClassName("outline", "px-3 py-2 text-xs whitespace-nowrap")}
            >
              Live screen ↗
            </Link>
            {/* A plain link, not fetch(): the browser's own download handling
                is what gets the file onto the organiser's disk with the
                filename the route sets. */}
            <a href="/api/networking/export" className={buttonClassName("gold", "px-3 py-2 text-xs whitespace-nowrap")}>
              Export CSV
            </a>
            <Button variant="danger" onClick={handleReset} disabled={resetting} className="px-3 py-2 text-xs">
              {resetting ? "Clearing…" : "Reset"}
            </Button>
          </div>
        </div>

        {error && <p className="mb-4 text-sm text-danger-600">{error}</p>}
        {!data && !error && <p className="text-sm text-ink-600">Loading…</p>}

        <RoundTimer />

        {data && (
          <>
            <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Participants" value={data.totals.participants} />
              <Stat label="Connections" value={data.totals.connections} />
              <Stat label="Unique titles" value={data.totals.uniqueTitles} />
              <Stat label="Excluded" value={data.totals.hidden} />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <Card className="p-5">
                <h2 className="mb-3 font-display text-lg font-semibold text-navy-900">Leaderboard</h2>
                {data.leaderboard.length === 0 ? (
                  <p className="text-sm text-ink-600">No participants yet.</p>
                ) : (
                  <ol className="flex flex-col gap-1.5">
                    {data.leaderboard.map((p, i) => (
                      <li
                        key={p.participantId}
                        className="flex items-center gap-3 rounded-lg border border-navy-100 bg-white px-3 py-2"
                      >
                        <span className="w-6 shrink-0 font-display font-bold text-ink-600">{i + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-navy-900">
                          {p.displayName}
                          {p.company && <span className="ml-2 text-xs text-ink-600">{p.company}</span>}
                        </span>
                        <span className="shrink-0 font-display font-bold text-gold-700">{p.connections}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>

              <Card className="p-5">
                <h2 className="mb-3 font-display text-lg font-semibold text-navy-900">
                  Books discussed <span className="text-sm font-normal text-ink-600">({data.books.length} titles)</span>
                </h2>
                {data.books.length === 0 ? (
                  <p className="text-sm text-ink-600">No books yet.</p>
                ) : (
                  <ol className="flex max-h-96 flex-col gap-1.5 overflow-y-auto">
                    {data.books.map((b) => (
                      <li
                        key={b.title}
                        className="flex items-center gap-3 rounded-lg border border-navy-100 bg-white px-3 py-2"
                      >
                        <span className="min-w-0 flex-1 truncate text-navy-900">{b.title}</span>
                        <span className="shrink-0 font-display font-bold text-gold-700">{b.mentions}</span>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            </div>

            <Card className="mt-6 p-5">
              <h2 className="mb-1 font-display text-lg font-semibold text-navy-900">Recent activity</h2>
              <p className="mb-3 text-sm text-ink-600">
                Exclude an entry to drop it from every count, the leaderboard and the big screen. It stays in the CSV
                export, flagged.
              </p>
              {data.recent.length === 0 ? (
                <p className="text-sm text-ink-600">Nothing submitted yet.</p>
              ) : (
                <div className="max-h-[28rem] overflow-y-auto">
                  <ul className="flex flex-col gap-1.5">
                    {data.recent.map((r) => (
                      <li
                        key={r.id}
                        className={`flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border px-3 py-2 ${
                          r.isHidden ? "border-danger-600/30 bg-cream-100 opacity-60" : "border-navy-100 bg-white"
                        }`}
                      >
                        <span className="min-w-0 flex-1 text-sm text-navy-900">
                          <span className="font-semibold">{r.participantName}</span>
                          <span className="text-ink-600"> met </span>
                          <span className="font-semibold">{r.personMet}</span>
                          <span className="text-ink-600"> — </span>
                          <span className="italic">{r.bookTitle}</span>
                        </span>
                        <span className="shrink-0 text-xs tabular-nums text-ink-600">
                          {new Date(r.createdAt).toLocaleTimeString()}
                        </span>
                        <Button
                          variant={r.isHidden ? "outline" : "danger"}
                          onClick={() => toggleHidden(r.id, !r.isHidden)}
                          disabled={busyId === r.id}
                          className="shrink-0 px-3 py-1.5 text-xs"
                        >
                          {r.isHidden ? "Restore" : "Exclude"}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
