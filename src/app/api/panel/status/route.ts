import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

const STATUSES = new Set(["new", "shortlisted", "answered", "hidden"]);

/**
 * Moves one question between queue states.
 *
 * Nothing is ever deleted: a moderator working at speed in front of an
 * audience will mis-tap, and "hidden" is recoverable where a DELETE is not.
 */
export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : null;
  const status = typeof body?.status === "string" ? body.status : null;

  if (!id || !status || !STATUSES.has(status)) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase
    .from("panel_questions")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
