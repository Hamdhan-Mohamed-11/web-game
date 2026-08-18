import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export async function POST(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const body = await request.json().catch(() => null);
  const roundId = body?.roundId;
  const questionIndex = body?.questionIndex;
  if (typeof roundId !== "string" || typeof questionIndex !== "number") {
    return NextResponse.json({ error: "roundId and questionIndex are required" }, { status: 400 });
  }

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase.rpc("start_question", {
    p_round_id: roundId,
    p_question_index: questionIndex,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
