import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

export const dynamic = "force-dynamic";

/**
 * Everything the networking admin dashboard shows, in one round trip.
 *
 * Runs with the service role because the networking tables are closed to
 * anon entirely — the participant-facing aggregates come from SECURITY
 * DEFINER functions, and this is the only path that sees raw rows.
 */
export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const supabase = getServiceSupabaseClient();

  const [participantsRes, connectionsRes] = await Promise.all([
    supabase.from("networking_participants").select("id, display_name, company, contact, created_at"),
    supabase
      .from("networking_connections")
      .select("id, participant_id, person_met, book_title, book_title_norm, is_hidden, created_at")
      .order("created_at", { ascending: false }),
  ]);

  if (participantsRes.error || connectionsRes.error) {
    return NextResponse.json(
      { error: participantsRes.error?.message ?? connectionsRes.error?.message },
      { status: 500 }
    );
  }

  const participants = participantsRes.data ?? [];
  const connections = connectionsRes.data ?? [];
  const live = connections.filter((c) => !c.is_hidden);

  const nameById = new Map(participants.map((p) => [p.id, p.display_name]));

  // Leaderboard: distinct people met, per the game's rules.
  const perParticipant = new Map<string, { count: number; last: string }>();
  for (const c of live) {
    const entry = perParticipant.get(c.participant_id);
    if (entry) {
      entry.count += 1;
      if (c.created_at > entry.last) entry.last = c.created_at;
    } else {
      perParticipant.set(c.participant_id, { count: 1, last: c.created_at });
    }
  }

  const leaderboard = participants
    .map((p) => ({
      participantId: p.id,
      displayName: p.display_name,
      company: p.company,
      connections: perParticipant.get(p.id)?.count ?? 0,
      lastAt: perParticipant.get(p.id)?.last ?? null,
    }))
    .sort((a, b) => b.connections - a.connections || (a.lastAt ?? "").localeCompare(b.lastAt ?? ""));

  // Book tallies, grouped on the normalised title but labelled with the most
  // common spelling — same rule the big screen uses, so admin and room agree.
  const bookGroups = new Map<string, { spellings: Map<string, number>; total: number }>();
  for (const c of live) {
    const key = c.book_title_norm ?? c.book_title.toLowerCase();
    const group = bookGroups.get(key) ?? { spellings: new Map<string, number>(), total: 0 };
    group.spellings.set(c.book_title, (group.spellings.get(c.book_title) ?? 0) + 1);
    group.total += 1;
    bookGroups.set(key, group);
  }

  const books = [...bookGroups.values()]
    .map((g) => {
      const label = [...g.spellings.entries()].sort(
        (a, b) =>
          b[1] - a[1] ||
          Number(a[0] === a[0].toLowerCase()) - Number(b[0] === b[0].toLowerCase()) ||
          a[0].localeCompare(b[0])
      )[0][0];
      return { title: label, mentions: g.total };
    })
    .sort((a, b) => b.mentions - a.mentions || a.title.localeCompare(b.title));

  return NextResponse.json({
    totals: {
      participants: participants.length,
      connections: live.length,
      hidden: connections.length - live.length,
      uniqueTitles: books.length,
    },
    leaderboard,
    books,
    recent: connections.slice(0, 100).map((c) => ({
      id: c.id,
      participantName: nameById.get(c.participant_id) ?? "—",
      personMet: c.person_met,
      bookTitle: c.book_title,
      isHidden: c.is_hidden,
      createdAt: c.created_at,
    })),
  });
}
