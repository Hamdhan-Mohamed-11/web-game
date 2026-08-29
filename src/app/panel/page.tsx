"use client";

import { useCallback, useEffect, useState } from "react";
import BrandMark from "@/components/shared/BrandMark";
import Button from "@/components/shared/Button";
import Card from "@/components/shared/Card";

interface PanelQuestion {
  id: string;
  question: string;
  askerName: string | null;
  status: "new" | "starred" | "answered" | "hidden";
  createdAt: string;
}

interface PanelData {
  questions: PanelQuestion[];
  totals: { all: number; new: number; starred: number; answered: number; hidden: number };
}

/** Fast enough to feel live on stage, slow enough not to hammer the box. */
const REFRESH_MS = 6000;

/**
 * Module-level so the polling effect below can own its own async function.
 * An effect that calls a setState-bearing callback from its dependency list
 * is what react-hooks/set-state-in-effect exists to catch; the same shape is
 * used by useNetworkingDashboard.
 */
async function fetchPanelData(): Promise<PanelData | { authError: true } | null> {
  const res = await fetch("/api/panel/admin-data", { cache: "no-store" });
  if (res.status === 401) return { authError: true };
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? "Couldn't load");
  return body as PanelData;
}

const TABS = [
  { key: "new", label: "New" },
  { key: "starred", label: "Starred" },
  { key: "answered", label: "Answered" },
  { key: "hidden", label: "Hidden" },
  { key: "all", label: "All" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

export default function PanelModeratorPage() {
  const [data, setData] = useState<PanelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("new");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const next = await fetchPanelData();
        if (cancelled || !next) return;
        if ("authError" in next) {
          setError("Signed out — open /admin/login and sign in again.");
          return;
        }
        setData(next);
        setError(null);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Couldn't load");
      }
    }

    poll();
    const t = setInterval(poll, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  const reload = useCallback(() => {
    fetchPanelData()
      .then((next) => {
        if (next && !("authError" in next)) setData(next);
      })
      .catch(() => undefined);
  }, []);

  async function setStatus(id: string, status: PanelQuestion["status"]) {
    setBusyId(id);
    // Optimistic: a moderator tapping through a queue on stage should never
    // watch a spinner. The poll reconciles a few seconds later either way.
    setData((d) =>
      d ? { ...d, questions: d.questions.map((q) => (q.id === id ? { ...q, status } : q)) } : d
    );
    try {
      const res = await fetch("/api/panel/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error("Update failed");
      reload();
    } catch {
      setError("That didn't save — check your connection.");
      reload();
    } finally {
      setBusyId(null);
    }
  }

  const visible =
    data?.questions.filter((q) => (tab === "all" ? true : q.status === tab)) ?? [];

  return (
    <main className="min-h-screen bg-cream-50 px-4 pb-16 pt-8">
      <div className="mx-auto w-full max-w-3xl">
        <BrandMark size="compact" />

        <h1 className="mt-5 text-center font-display text-2xl font-bold text-navy-900">
          Ask the panel — moderator
        </h1>
        <p className="mt-2 text-center text-sm text-ink-600">
          Questions arrive from the printed QR codes. Nothing here is ever
          deleted; hiding is reversible.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {TABS.map((t) => {
            const count = data ? data.totals[t.key] : 0;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-navy-900 text-cream-50"
                    : "bg-white text-navy-900 ring-1 ring-navy-100 hover:bg-cream-100"
                }`}
              >
                {t.label}
                <span className={`ml-2 tabular-nums ${active ? "text-gold-400" : "text-ink-600"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-danger-600" role="alert">
            {error}
          </p>
        )}
        {!data && !error && <p className="mt-6 text-center text-sm text-ink-600">Loading…</p>}

        {data && visible.length === 0 && (
          <Card className="mt-6 p-8 text-center">
            <p className="text-ink-600">
              {tab === "new"
                ? "No new questions yet. They'll appear here as people scan."
                : "Nothing in this list."}
            </p>
          </Card>
        )}

        <ul className="mt-6 flex flex-col gap-3">
          {visible.map((q) => (
            <li key={q.id}>
              <Card
                className={`p-5 ${q.status === "starred" ? "ring-2 ring-gold-500" : ""} ${
                  q.status === "hidden" ? "opacity-60" : ""
                }`}
              >
                <p className="text-lg leading-snug text-navy-900">{q.question}</p>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
                  <span className="font-semibold">{q.askerName || "Anonymous"}</span>
                  <span aria-hidden="true">·</span>
                  <span>{timeAgo(q.createdAt)}</span>
                  {q.status !== "new" && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="uppercase tracking-[0.12em]">{q.status}</span>
                    </>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {q.status !== "starred" && (
                    <Button
                      variant="gold"
                      onClick={() => setStatus(q.id, "starred")}
                      disabled={busyId === q.id}
                      className="px-3 py-2 text-xs"
                    >
                      ★ Star for the panel
                    </Button>
                  )}
                  {q.status !== "answered" && (
                    <Button
                      variant="outline"
                      onClick={() => setStatus(q.id, "answered")}
                      disabled={busyId === q.id}
                      className="px-3 py-2 text-xs"
                    >
                      Mark answered
                    </Button>
                  )}
                  {q.status !== "hidden" ? (
                    <Button
                      variant="danger"
                      onClick={() => setStatus(q.id, "hidden")}
                      disabled={busyId === q.id}
                      className="px-3 py-2 text-xs"
                    >
                      Hide
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => setStatus(q.id, "new")}
                      disabled={busyId === q.id}
                      className="px-3 py-2 text-xs"
                    >
                      Restore
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
