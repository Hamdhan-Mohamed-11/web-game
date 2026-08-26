import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

/**
 * Clears every networking participant and connection.
 *
 * The counterpart to the quiz games' reset: rehearsal and load-test data has
 * to be gone before the real evening starts, or the big screen opens on a
 * leaderboard of people who aren't in the room. Deleting the participants is
 * enough — connections cascade from them.
 *
 * Destructive and not undoable, so the caller must pass an explicit
 * confirmation rather than this firing on a bare POST.
 */
export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  if (body?.confirm !== "DELETE ALL NETWORKING DATA") {
    return NextResponse.json({ error: "Missing confirmation" }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();

  // Delete-all needs a filter that matches every row; `created_at` is NOT
  // NULL on every row, so this is the whole table.
  const { error } = await supabase
    .from("networking_participants")
    .delete()
    .not("created_at", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Any connection whose participant was already gone (there shouldn't be
  // one, but the cascade only covers rows that had a live parent).
  await supabase.from("networking_connections").delete().not("created_at", "is", null);

  return NextResponse.json({ ok: true });
}
