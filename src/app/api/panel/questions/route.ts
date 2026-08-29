import { NextResponse } from "next/server";
import { getServiceSupabaseClient } from "@/lib/supabase/serverClient";

/**
 * Public intake for the "Ask the panel" form.
 *
 * The form lives on HostGator at pickabook.lk/events/panel/questions.html and
 * cannot move — the QR codes are already printed. So this endpoint is called
 * cross-origin from www.pickabook.lk, which means two things the rest of the
 * app never has to deal with:
 *
 *   1. A browser sends a preflight OPTIONS first, because the form posts
 *      application/json. Without the OPTIONS handler below the real POST is
 *      never sent at all, and the page shows a generic network error with
 *      nothing useful in the console.
 *   2. The allowed origins are an explicit list. A wildcard would let any
 *      site on the internet fill the moderator's queue from a hidden iframe.
 *
 * Writes with the service key rather than exposing an anon RPC, so the
 * questions table stays entirely invisible to the public key and validation
 * lives in one place instead of half here and half in a static file the
 * organiser pastes into cPanel.
 */

const ALLOWED_ORIGINS = new Set([
  "https://www.pickabook.lk",
  "https://pickabook.lk",
  "http://www.pickabook.lk",
  "http://pickabook.lk",
]);

const MAX_QUESTION = 500;
const MAX_NAME = 80;

/**
 * Per-IP throttle.
 *
 * CORS is not access control -- it stops a browser on another site, and does
 * nothing about curl. Verified against production: a request with a hostile
 * Origin got no allow header (so a real browser would refuse the response)
 * but the row still inserted, because curl does not care. This is the part
 * that actually limits how fast one source can fill the moderator's queue.
 *
 * In-memory is sufficient: one Node process serves this app, the window is
 * an evening, and losing the counters on restart is harmless.
 */
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 6;
const hits = new Map<string, number[]>();

function rateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  recent.push(now);
  hits.set(key, recent);

  // Opportunistic sweep so the map cannot grow without bound over an event.
  if (hits.size > 5000) {
    for (const [k, v] of hits) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return recent.length > RATE_MAX;
}

function corsHeaders(origin: string | null): Record<string, string> {
  // Echo the origin only when it is one of ours. An unknown origin gets no
  // CORS header at all, and the browser refuses the response.
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return {};
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get("origin");
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  const cors = corsHeaders(origin);

  // An Origin that is present but not ours is a cross-site caller that a
  // browser would have blocked anyway; refuse it outright rather than only
  // withholding the header. A missing Origin is left alone -- privacy tools
  // strip it, and the rate limit below covers that case.
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return NextResponse.json({ success: false, error: "Not allowed" }, { status: 403 });
  }

  const fwdRaw = request.headers.get("x-forwarded-for") ?? "";
  const clientIp = fwdRaw.split(",")[0]?.trim() || "unknown";
  if (rateLimited(clientIp)) {
    return NextResponse.json(
      { success: false, error: "Too many questions just now — try again in a minute." },
      { status: 429, headers: cors }
    );
  }

  const body = await request.json().catch(() => null);
  const question = typeof body?.question === "string" ? body.question.trim() : "";
  const rawName = typeof body?.name === "string" ? body.name.trim() : "";

  if (!question) {
    return NextResponse.json(
      { success: false, error: "Write your question before sending it." },
      { status: 400, headers: cors }
    );
  }
  if (question.length > MAX_QUESTION) {
    return NextResponse.json(
      { success: false, error: `Keep it under ${MAX_QUESTION} characters.` },
      { status: 400, headers: cors }
    );
  }

  // A coarse origin note for spam triage. Behind nginx, X-Forwarded-For is
  // overwritten with the real peer (never appended), so the first value is
  // trustworthy here; only the first two octets are kept, which is enough to
  // spot one device flooding the queue and not enough to identify anyone.
  const submittedFrom = clientIp.split(".").slice(0, 2).join(".") || null;

  const supabase = getServiceSupabaseClient();
  const { error } = await supabase.from("panel_questions").insert({
    question,
    asker_name: rawName ? rawName.slice(0, MAX_NAME) : null,
    submitted_from: submittedFrom,
  });

  if (error) {
    return NextResponse.json(
      { success: false, error: "That didn't send. Try again." },
      { status: 500, headers: cors }
    );
  }

  // Shape matches what the existing page already checks for (`data.success`),
  // so the only change needed in questions.html is the URL it posts to.
  return NextResponse.json({ success: true }, { headers: cors });
}
