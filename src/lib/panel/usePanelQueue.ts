"use client";

import { useCallback, useEffect, useState } from "react";

export type PanelStatus = "new" | "shortlisted" | "answered" | "hidden";

export interface PanelQuestion {
  id: string;
  question: string;
  askerName: string | null;
  status: PanelStatus;
  createdAt: string;
}

export interface PanelTotals {
  all: number;
  new: number;
  shortlisted: number;
  answered: number;
  hidden: number;
}

export interface PanelData {
  questions: PanelQuestion[];
  totals: PanelTotals;
}

/** Fast enough to feel live on stage, slow enough not to hammer the box. */
const REFRESH_MS = 5000;

/**
 * Module-level, so the polling effect can own its own async function — an
 * effect calling a setState-bearing callback from its dependency list is
 * exactly what react-hooks/set-state-in-effect catches.
 */
async function fetchQueue(): Promise<PanelData | { authError: true }> {
  const res = await fetch("/api/panel/admin-data", { cache: "no-store" });
  if (res.status === 401) return { authError: true };
  const body = await res.json();
  if (!res.ok) throw new Error(body?.error ?? "Couldn't load");
  return body as PanelData;
}

/**
 * The shared question queue behind both halves of the Q&A.
 *
 * Both the screener and the moderator read the same list and filter it
 * locally; the hand-off between them is a status change, not a separate
 * store. That is what lets a question visibly leave one person's page and
 * appear on the other's a few seconds later.
 */
export function usePanelQueue() {
  const [data, setData] = useState<PanelData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function poll() {
      try {
        const next = await fetchQueue();
        if (cancelled) return;
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
    fetchQueue()
      .then((next) => {
        if (!("authError" in next)) setData(next);
      })
      .catch(() => undefined);
  }, []);

  const move = useCallback(
    async (id: string, status: PanelStatus) => {
      setBusyId(id);
      // Optimistic. Someone working a queue in front of an audience should
      // never be watching a spinner; the poll reconciles either way.
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
      } catch {
        setError("That didn't save — check your connection.");
      } finally {
        setBusyId(null);
        reload();
      }
    },
    [reload]
  );

  return { data, error, busyId, move, reload };
}

export function timeAgo(iso: string): string {
  const secs = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 60) return "just now";
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}
