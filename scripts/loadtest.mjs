#!/usr/bin/env node
/**
 * Readers' Summit load test.
 *
 * Simulates the event's worst moments — every phone in the room doing the
 * same thing in the same second — against whichever deployment you point it
 * at. Run it against the VPS before the event, not just locally: the thing
 * most likely to fall over is the hop between the app and Postgres, and that
 * hop is different on every host.
 *
 *   node scripts/loadtest.mjs                 # 150 users, local .env.local
 *   node scripts/loadtest.mjs --users 300
 *   BASE_URL=https://your-vps SUPABASE_URL=... SUPABASE_ANON_KEY=... \
 *     node scripts/loadtest.mjs
 *
 * Writes real rows. Point it at a rehearsal database, or reset the games
 * afterwards from the admin panel.
 */

import fs from "node:fs";
import path from "node:path";

// ---------------------------------------------------------------- config
function loadEnvFile(file) {
  try {
    return Object.fromEntries(
      fs
        .readFileSync(file, "utf8")
        .split(/\r?\n/)
        .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
        .filter(Boolean)
        .map((m) => [m[1], m[2].trim()])
    );
  } catch {
    return {};
  }
}

const fileEnv = loadEnvFile(path.join(process.cwd(), ".env.local"));
const argv = process.argv.slice(2);
const argOf = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const USERS = Number(argOf("users", 150));
const CONNECTIONS_EACH = Number(argOf("each", 5));
const SUPABASE_URL = process.env.SUPABASE_URL ?? fileEnv.NEXT_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.SUPABASE_ANON_KEY ?? fileEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const BASE_URL = process.env.BASE_URL ?? fileEnv.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

if (!SUPABASE_URL || !ANON_KEY) {
  console.error("Missing SUPABASE_URL / SUPABASE_ANON_KEY (or .env.local equivalents).");
  process.exit(1);
}

// ------------------------------------------------------------- utilities
const FIRST = ["Nadeesha", "Ruwan", "Amali", "Dilshan", "Kavindi", "Tharindu", "Sanduni", "Ishara", "Chamath", "Nimali"];
const BOOKS = [
  "Atomic Habits", "The Alchemist", "The Psychology of Money", "Ikigai", "Sapiens",
  "The Midnight Library", "Good to Great", "Educated", "Thinking, Fast and Slow", "Deep Work",
];
const pick = (arr, i) => arr[i % arr.length];

function stats(samples) {
  if (samples.length === 0) return { p50: 0, p95: 0, p99: 0, max: 0, mean: 0 };
  const s = [...samples].sort((a, b) => a - b);
  const at = (q) => s[Math.min(s.length - 1, Math.floor(s.length * q))];
  return {
    p50: at(0.5),
    p95: at(0.95),
    p99: at(0.99),
    max: s[s.length - 1],
    mean: Math.round(s.reduce((a, b) => a + b, 0) / s.length),
  };
}

async function timed(fn) {
  const t0 = performance.now();
  try {
    const value = await fn();
    return { ms: performance.now() - t0, ok: true, value };
  } catch (err) {
    return { ms: performance.now() - t0, ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function report(label, results, elapsedMs) {
  const oks = results.filter((r) => r.ok);
  const fails = results.filter((r) => !r.ok);
  const st = stats(oks.map((r) => r.ms));
  const rps = elapsedMs > 0 ? Math.round((results.length / elapsedMs) * 1000) : 0;

  const status = fails.length === 0 ? "PASS" : "FAIL";
  console.log(
    `${status.padEnd(5)} ${label.padEnd(34)} ` +
      `n=${String(results.length).padStart(4)}  ok=${String(oks.length).padStart(4)}  err=${String(fails.length).padStart(3)}  ` +
      `p50=${String(Math.round(st.p50)).padStart(5)}ms  p95=${String(Math.round(st.p95)).padStart(5)}ms  ` +
      `max=${String(Math.round(st.max)).padStart(5)}ms  ~${rps}/s`
  );

  if (fails.length) {
    const grouped = new Map();
    for (const f of fails) grouped.set(f.error, (grouped.get(f.error) ?? 0) + 1);
    for (const [msg, n] of [...grouped].sort((a, b) => b[1] - a[1]).slice(0, 4)) {
      console.log(`        ${n}x ${String(msg).slice(0, 160)}`);
    }
  }
  return fails.length === 0;
}

async function rpc(fn, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 140)}`);
  return res.json();
}

/** Fires every task at once — the thundering herd is the thing being tested. */
async function burst(n, fn) {
  const t0 = performance.now();
  const results = await Promise.all(Array.from({ length: n }, (_, i) => timed(() => fn(i))));
  return { results, elapsedMs: performance.now() - t0 };
}

// ---------------------------------------------------------------- phases
let allPassed = true;
const pass = (ok) => {
  if (!ok) allPassed = false;
};

console.log(`\nReaders' Summit load test — ${USERS} concurrent users`);
console.log(`  API  ${SUPABASE_URL}`);
console.log(`  App  ${BASE_URL}\n`);

// 1. Everyone scans the QR at once and the page has to render.
{
  const { results, elapsedMs } = await burst(USERS, async () => {
    const res = await fetch(`${BASE_URL}/networking`, { headers: { "cache-control": "no-cache" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await res.text();
  });
  pass(report("Page load /networking", results, elapsedMs));
}

// 2. Everyone registers in the same few seconds.
const participantIds = [];
{
  const { results, elapsedMs } = await burst(USERS, async (i) => {
    const id = await rpc("networking_join", {
      p_display_name: `${pick(FIRST, i)} LT${i}`,
      p_company: "Load Test",
    });
    return id;
  });
  for (const r of results) if (r.ok && r.value) participantIds.push(r.value);
  pass(report("networking_join", results, elapsedMs));
}

// 3. The sustained middle of the activity: everyone recording connections.
//    Each user goes sequentially (a person can only meet one at a time) but
//    all users run in parallel — which is the real shape of the load.
{
  const t0 = performance.now();
  const perUser = await Promise.all(
    participantIds.map(async (id, i) => {
      const out = [];
      for (let k = 0; k < CONNECTIONS_EACH; k++) {
        out.push(
          await timed(() =>
            rpc("networking_add_connection", {
              p_participant_id: id,
              // Distinct partner per entry, or the duplicate guard rejects it.
              p_person_met: `${pick(FIRST, i + k + 1)} LT${(i + k + 1) % USERS}`,
              p_book_title: pick(BOOKS, i + k),
            })
          )
        );
      }
      return out;
    })
  );
  pass(report("networking_add_connection", perUser.flat(), performance.now() - t0));
}

// 4. The dashboard's poll, while all of the above is still settling. This is
//    the query that must stay fast: it runs on the projector every 4s.
{
  const { results, elapsedMs } = await burst(20, async () => {
    await Promise.all([
      rpc("networking_stats"),
      rpc("networking_top_connectors", { p_limit: 5 }),
      rpc("networking_top_books", { p_limit: 5 }),
      rpc("networking_recent_books", { p_limit: 12 }),
    ]);
  });
  pass(report("dashboard poll (4 RPCs)", results, elapsedMs));
}

// 5. The quiz's own thundering herd: the whole room joining a game at once.
{
  const { results, elapsedMs } = await burst(USERS, (i) =>
    rpc("join_game", { p_game_slug: "first-lines", p_display_name: `LoadTest ${i}` })
  );
  pass(report("join_game (first-lines)", results, elapsedMs));
}

// 6. The LED screen's leaderboard read, which polls throughout a round.
{
  const { results, elapsedMs } = await burst(30, async () => {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/leaderboard_entries?select=participant_id,display_name,total_points&order=total_points.desc&limit=10`,
      { headers: { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await res.json();
  });
  pass(report("leaderboard read", results, elapsedMs));
}

console.log(
  `\n${allPassed ? "ALL PHASES PASSED" : "SOME PHASES FAILED"} — ` +
    `${USERS} users, ${USERS * CONNECTIONS_EACH} connection writes.\n` +
    `Remember to reset the games and clear the networking tables before the real event.\n`
);

process.exit(allPassed ? 0 : 1);
