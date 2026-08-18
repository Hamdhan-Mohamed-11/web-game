"use client";

import { useEffect, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";

export interface RoundData {
  id: string;
  gameSlug: string;
  roundKey: string;
  orderIndex: number;
  totalQuestions: number;
  status: "pending" | "active" | "closed" | "confirmed";
}

export function useRound(gameSlug: string, roundKey: string) {
  const [round, setRound] = useState<RoundData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const supabase = getBrowserSupabaseClient();

    async function load() {
      const { data, error } = await supabase
        .from("rounds")
        .select("id, game_slug, round_key, order_index, total_questions, status")
        .eq("game_slug", gameSlug)
        .eq("round_key", roundKey)
        .single();

      if (cancelled) return;
      if (error || !data) {
        setRound(null);
        setLoading(false);
        return;
      }

      setRound({
        id: data.id,
        gameSlug: data.game_slug,
        roundKey: data.round_key,
        orderIndex: data.order_index,
        totalQuestions: data.total_questions,
        status: data.status,
      });
      setLoading(false);
    }

    load();

    const channel = supabase
      .channel(`round-${gameSlug}-${roundKey}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "rounds" },
        (payload) => {
          const row = payload.new as {
            id: string;
            game_slug: string;
            round_key: string;
            order_index: number;
            total_questions: number;
            status: RoundData["status"];
          };
          if (row.game_slug === gameSlug && row.round_key === roundKey) {
            setRound({
              id: row.id,
              gameSlug: row.game_slug,
              roundKey: row.round_key,
              orderIndex: row.order_index,
              totalQuestions: row.total_questions,
              status: row.status,
            });
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [gameSlug, roundKey]);

  return { round, loading };
}
