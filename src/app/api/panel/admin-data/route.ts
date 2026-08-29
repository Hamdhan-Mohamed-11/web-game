import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

/** The moderator's queue. Newest first — a live Q&A is read from the top. */
export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const supabase = getServiceSupabaseClient();
  const { data, error } = await supabase
    .from("panel_questions")
    .select("id, question, asker_name, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const rows = data ?? [];
  return NextResponse.json({
    questions: rows.map((r) => ({
      id: r.id,
      question: r.question,
      askerName: r.asker_name,
      status: r.status,
      createdAt: r.created_at,
    })),
    totals: {
      all: rows.length,
      new: rows.filter((r) => r.status === "new").length,
      starred: rows.filter((r) => r.status === "starred").length,
      answered: rows.filter((r) => r.status === "answered").length,
      hidden: rows.filter((r) => r.status === "hidden").length,
    },
  });
}
