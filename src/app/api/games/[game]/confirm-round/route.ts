import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const roundId = body?.roundId;
  const winners = body?.winners;
  if (typeof roundId !== "string" || winners === undefined) {
    return NextResponse.json({ error: "roundId and winners are required" }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase.rpc("confirm_round", { p_round_id: roundId, p_winners: winners });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
