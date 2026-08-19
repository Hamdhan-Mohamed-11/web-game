import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { getGameMeta } from "@/lib/games";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const gameSlug: unknown = body?.gameSlug;

  if (gameSlug !== null && (typeof gameSlug !== "string" || !getGameMeta(gameSlug))) {
    return NextResponse.json({ error: "gameSlug must be a known game slug or null" }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase.rpc("set_active_game", { p_game_slug: gameSlug });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
