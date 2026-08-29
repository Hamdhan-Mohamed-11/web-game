import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

/**
 * Starts, ends or clears the networking round's countdown.
 *
 *   { action: "start", durationSeconds?: number }   begins now
 *   { action: "end" }                              stops it immediately
 *   { action: "clear" }                            removes it, reopening
 *
 * Writes through the service client, as the reset route does: the table has
 * RLS on and no policy, so the deadline can only be moved by someone holding
 * the admin cookie. A participant cannot buy themselves extra time.
 */

const MIN_SECONDS = 30;
const MAX_SECONDS = 7200;
const DEFAULT_SECONDS = 300;

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const action = body?.action;
  const supabase = getServiceSupabaseClient();

  if (action === "start") {
    const raw = Number(body?.durationSeconds ?? DEFAULT_SECONDS);
    const duration = Number.isFinite(raw) ? Math.round(raw) : DEFAULT_SECONDS;
    if (duration < MIN_SECONDS || duration > MAX_SECONDS) {
      return NextResponse.json(
        { error: `Duration must be between ${MIN_SECONDS} and ${MAX_SECONDS} seconds` },
        { status: 400 }
      );
    }

    // started_at comes from the database, never from this process: the app
    // server and Postgres are different machines with different clocks, and
    // the deadline is checked against Postgres's.
    const { error } = await supabase.rpc("networking_round_begin", {
      p_duration_seconds: duration,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "end") {
    const { error } = await supabase.rpc("networking_round_end");
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  if (action === "clear") {
    const { error } = await supabase
      .from("networking_round")
      .update({ started_at: null, updated_at: new Date().toISOString() })
      .eq("id", true);
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
