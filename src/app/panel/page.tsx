"use client";

import { useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/shared/BrandMark";
import Button, { buttonClassName } from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import { timeAgo, usePanelQueue } from "@/lib/panel/usePanelQueue";

/**
 * The screener's desk — stage one of two.
 *
 * Everything the audience sends lands here. The screener reads the lot and
 * hands a few to the moderator; sending one makes it leave this page and
 * appear on /panel/moderator, which is the point. The first version starred
 * questions in place, and pressing the button looked like the question had
 * gone nowhere because it hadn't.
 */

const TABS = [
  { key: "new", label: "To read" },
  { key: "shortlisted", label: "Sent to moderator" },
  { key: "answered", label: "Answered" },
  { key: "hidden", label: "Discarded" },
  { key: "all", label: "All" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default function PanelScreenerPage() {
  const { data, error, busyId, move } = usePanelQueue();
  const [tab, setTab] = useState<TabKey>("new");

  // Oldest first while screening, so nobody who asked early gets buried
  // under a late rush and never read.
  const visible = (data?.questions ?? [])
    .filter((q) => (tab === "all" ? true : q.status === tab))
    .sort((a, b) => (tab === "new" ? a.createdAt.localeCompare(b.createdAt) : b.createdAt.localeCompare(a.createdAt)));

  return (
    <main className="min-h-screen bg-cream-50 px-4 pb-16 pt-6">
      <div className="mx-auto w-full max-w-3xl">
        <BrandMark size="compact" />

        <h1 className="mt-4 text-center font-display text-2xl font-bold text-navy-900">
          Question screening
        </h1>
        <p className="mx-auto mt-2 max-w-md text-center text-sm text-ink-600">
          Everything the audience sends arrives here. Pick the ones worth
          asking and pass them to the moderator.
        </p>

        <div className="mt-4 flex justify-center">
          <Link href="/panel/moderator" className={buttonClassName("outline", "px-4 py-2 text-sm")}>
            Moderator view
            <span className="ml-2 tabular-nums text-gold-700">{data?.totals.shortlisted ?? 0}</span>
            <span aria-hidden="true"> →</span>
          </Link>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          {TABS.map((t) => {
            const count = data ? data.totals[t.key] : 0;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  active
                    ? "bg-navy-900 text-cream-50"
                    : "bg-white text-navy-900 ring-1 ring-navy-100 hover:bg-cream-100"
                }`}
              >
                {t.label}
                <span className={`ml-2 tabular-nums ${active ? "text-gold-400" : "text-ink-600"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-danger-600" role="alert">
            {error}
          </p>
        )}
        {!data && !error && <p className="mt-6 text-center text-sm text-ink-600">Loading…</p>}

        {data && visible.length === 0 && (
          <Card className="mt-6 p-8 text-center">
            <p className="text-ink-600">
              {tab === "new"
                ? "Nothing waiting. New questions appear here as people scan."
                : "Nothing in this list."}
            </p>
          </Card>
        )}

        <ul className="mt-6 flex flex-col gap-3">
          {visible.map((q) => (
            <li key={q.id}>
              <Card className={`p-5 ${q.status === "hidden" ? "opacity-60" : ""}`}>
                <p className="text-lg leading-snug text-navy-900">{q.question}</p>

                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
                  <span className="font-semibold">{q.askerName || "Anonymous"}</span>
                  <span aria-hidden="true">·</span>
                  <span>{timeAgo(q.createdAt)}</span>
                  {q.status !== "new" && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="uppercase tracking-[0.12em]">
                        {q.status === "shortlisted" ? "with the moderator" : q.status}
                      </span>
                    </>
                  )}
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {q.status !== "shortlisted" && q.status !== "answered" && (
                    <Button
                      variant="gold"
                      onClick={() => move(q.id, "shortlisted")}
                      disabled={busyId === q.id}
                      className="px-3 py-2 text-xs"
                    >
                      Send to moderator →
                    </Button>
                  )}
                  {q.status === "shortlisted" && (
                    <Button
                      variant="outline"
                      onClick={() => move(q.id, "new")}
                      disabled={busyId === q.id}
                      className="px-3 py-2 text-xs"
                    >
                      Pull back
                    </Button>
                  )}
                  {q.status !== "hidden" ? (
                    <Button
                      variant="danger"
                      onClick={() => move(q.id, "hidden")}
                      disabled={busyId === q.id}
                      className="px-3 py-2 text-xs"
                    >
                      Discard
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => move(q.id, "new")}
                      disabled={busyId === q.id}
                      className="px-3 py-2 text-xs"
                    >
                      Restore
                    </Button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
