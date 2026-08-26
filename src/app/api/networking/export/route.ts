import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * A CSV field is quoted whenever it contains a delimiter, a quote or a
 * newline, with inner quotes doubled — the RFC 4180 rules Excel expects.
 *
 * The leading apostrophe guard is for spreadsheet formula injection: a name
 * entered as `=HYPERLINK(...)` would otherwise execute when the organiser
 * opens the export. Prefixing forces it to be read as text.
 */
function csvCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * UTF-8 byte-order mark. Built from its code point rather than pasted as a
 * literal: a bare BOM is invisible in source and gets silently stripped by
 * editors and reformatters on the way past.
 */
const BOM = String.fromCharCode(0xfeff);

const HEADERS = [
  "Participant ID",
  "Participant Name",
  "Company",
  "Contact",
  "Person Met",
  "Book Discussed",
  "Timestamp",
  "Date",
  "Excluded",
];

export async function GET(request: Request) {
  const unauthorized = await requireAdmin(request);
  if (unauthorized) return unauthorized;

  const supabase = getServiceSupabaseClient();
  const [participantsRes, connectionsRes] = await Promise.all([
    supabase.from("networking_participants").select("id, display_name, company, contact"),
    supabase
      .from("networking_connections")
      .select("id, participant_id, person_met, book_title, is_hidden, created_at")
      .order("created_at", { ascending: true }),
  ]);

  if (participantsRes.error || connectionsRes.error) {
    return NextResponse.json(
      { error: participantsRes.error?.message ?? connectionsRes.error?.message },
      { status: 500 }
    );
  }

  const byId = new Map((participantsRes.data ?? []).map((p) => [p.id, p]));

  const rows = (connectionsRes.data ?? []).map((c) => {
    const p = byId.get(c.participant_id);
    const at = new Date(c.created_at);
    return [
      c.participant_id,
      p?.display_name ?? "",
      p?.company ?? "",
      p?.contact ?? "",
      c.person_met,
      c.book_title,
      at.toISOString(),
      at.toISOString().slice(0, 10),
      c.is_hidden ? "yes" : "no",
    ].map(csvCell).join(",");
  });

  // CRLF line endings and a UTF-8 BOM: without the BOM, Excel on Windows
  // reads the file as the local codepage and mangles any non-ASCII name.
  const csv = BOM + [HEADERS.map(csvCell).join(","), ...rows].join("\r\n");
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="readers-summit-networking-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
