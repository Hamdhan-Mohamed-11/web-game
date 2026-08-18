import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const roundId = body?.roundId;
  if (typeof roundId !== "string") {
    return NextResponse.json({ error: "roundId is required" }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase.rpc("start_round", { p_round_id: roundId });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
