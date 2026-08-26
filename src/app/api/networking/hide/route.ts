import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

/**
 * Hides (or restores) one connection. Hiding is reversible and non-
 * destructive: the row stays in the table so the post-event export is still
 * a true record of what was submitted, but it leaves every count, the
 * leaderboard and the big screen immediately.
 */
export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const connectionId = body?.connectionId;
  const hidden = body?.hidden;

  if (typeof connectionId !== "string" || typeof hidden !== "boolean") {
    return NextResponse.json({ error: "connectionId and hidden are required" }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase
    .from("networking_connections")
    .update({ is_hidden: hidden })
    .eq("id", connectionId);

  if (error) {
    // Un-hiding can collide with the partial unique index if the same pair
    // was legitimately re-entered after being hidden. Say so plainly rather
    // than surfacing a raw constraint name.
    if (error.message.includes("networking_connections_unique_person")) {
      return NextResponse.json(
        { error: "That pair has since been recorded again — restoring would duplicate it." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
