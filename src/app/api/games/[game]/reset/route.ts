import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { getGameMeta } from "@/lib/games";

export async function POST(request: Request, { params }: { params: Promise<{ game: string }> }) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const { game } = await params;
  if (!getGameMeta(game)) {
    return NextResponse.json({ error: "Unknown game" }, { status: 404 });
  }

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase.rpc("reset_game", { p_game_slug: game });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
