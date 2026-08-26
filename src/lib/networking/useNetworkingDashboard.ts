"use client";

import { useEffect, useRef, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";

export interface NetworkingStats {
  totalConnections: number;
  totalParticipants: number;
  uniqueTitles: number;
  booksDiscussed: number;
  topBook: string | null;
  topBookCount: number | null;
}

export interface Connector {
  participantId: string;
  displayName: string;
  connections: number;
}

export interface BookTally {
  title: string;
  mentions: number;
}

export interface DashboardData {
  stats: NetworkingStats;
  connectors: Connector[];
  books: BookTally[];
  recent: string[];
}

const EMPTY: DashboardData = {
  stats: { totalConnections: 0, totalParticipants: 0, uniqueTitles: 0, booksDiscussed: 0, topBook: null, topBookCount: null },
  connectors: [],
  books: [],
  recent: [],
};

/**
 * Polls the aggregate RPCs for the live dashboard.
 *
 * Polling rather than realtime, deliberately: the raw tables are unreadable
 * by anon (so a subscription would receive nothing anyway), and the only
 * client that needs live data is the single screen on the projector. One
 * page asking four cheap aggregate questions every few seconds is far less
 * load than 150 phones each holding a websocket — and it survives the
 * websocket dropping, which on venue wifi it will.
 *
 * The previous snapshot is kept on a failed poll so a blip shows stale
 * numbers rather than blanking the screen in front of the room.
 */
export function useNetworkingDashboard(intervalMs = 4000) {
  const [data, setData] = useState<DashboardData>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const inFlight = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserSupabaseClient();

    async function poll() {
      // Skips rather than queues if the previous round trip is still out —
      // on a slow link that would otherwise pile up requests indefinitely.
      if (inFlight.current) return;
      inFlight.current = true;

      try {
        const [statsRes, connectorsRes, booksRes, recentRes] = await Promise.all([
          supabase.rpc("networking_stats"),
          supabase.rpc("networking_top_connectors", { p_limit: 5 }),
          supabase.rpc("networking_top_books", { p_limit: 5 }),
          supabase.rpc("networking_recent_books", { p_limit: 12 }),
        ]);

        if (cancelled) return;

        const s = statsRes.data?.[0];
        if (s) {
          setData({
            stats: {
              totalConnections: s.total_connections ?? 0,
              totalParticipants: s.total_participants ?? 0,
              uniqueTitles: s.unique_titles ?? 0,
              booksDiscussed: s.books_discussed ?? 0,
              topBook: s.top_book,
              topBookCount: s.top_book_count,
            },
            connectors: (connectorsRes.data ?? []).map((c) => ({
              participantId: c.participant_id,
              displayName: c.display_name,
              connections: c.connections,
            })),
            books: (booksRes.data ?? []).map((b) => ({ title: b.title, mentions: b.mentions })),
            recent: (recentRes.data ?? []).map((r) => r.title),
          });
        }
        setLoaded(true);
      } catch {
        // Keep the last good snapshot on screen.
      } finally {
        inFlight.current = false;
      }
    }

    poll();
    const timer = setInterval(poll, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [intervalMs]);

  return { ...data, loaded };
}
