"use client";

import { useState } from "react";
import Link from "next/link";
import BrandMark from "@/components/shared/BrandMark";
import Button, { buttonClassName } from "@/components/shared/Button";
import Card from "@/components/shared/Card";
import { timeAgo, usePanelQueue } from "@/lib/panel/usePanelQueue";

/**
 * The moderator's queue — stage two of two.
 *
 * Deliberately sparse next to the screener's page. This is read on stage,
 * often from a phone held at waist height, by someone who is also listening
 * to a panellist: the question type is large, there are two buttons rather
 * than five, and only what the screener actually sent is here. The unfiltered
 * firehose stays on /panel where it belongs.
 *
 * Oldest first, so the order is the order the screener chose to send them.
 */
export default function PanelModeratorPage() {
  const { data, error, busyId, move } = usePanelQueue();
  const [showAnswered, setShowAnswered] = useState(false);

  const queue = (data?.questions ?? [])
    .filter((q) => q.status === "shortlisted")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  const answered = (data?.questions ?? [])
    .filter((q) => q.status === "answered")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <main className="min-h-screen bg-cream-50 px-4 pb-16 pt-6">
      <div className="mx-auto w-full max-w-2xl">
        <BrandMark size="compact" />

        <h1 className="mt-4 text-center font-display text-2xl font-bold text-navy-900">
          Ask the panel — moderator
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm text-ink-600">
          Only questions the screener has passed to you. Work down the list.
        </p>

        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Link href="/panel" className={buttonClassName("outline", "px-4 py-2 text-sm")}>
            <span aria-hidden="true">← </span>Screening
            <span className="ml-2 tabular-nums text-gold-700">{data?.totals.new ?? 0}</span>
          </Link>
          <button
            onClick={() => setShowAnswered((v) => !v)}
            className={buttonClassName("outline", "px-4 py-2 text-sm")}
          >
            {showAnswered ? "Hide answered" : "Show answered"}
            <span className="ml-2 tabular-nums text-gold-700">{data?.totals.answered ?? 0}</span>
          </button>
        </div>

        {error && (
          <p className="mt-4 text-center text-sm text-danger-600" role="alert">
            {error}
          </p>
        )}
        {!data && !error && <p className="mt-6 text-center text-sm text-ink-600">Loading…</p>}

        {data && queue.length === 0 && (
          <Card className="mt-6 p-10 text-center">
            <p className="text-lg text-navy-900">Nothing waiting.</p>
            <p className="mt-2 text-sm text-ink-600">
              Questions appear here the moment the screener sends one over.
            </p>
          </Card>
        )}

        <ul className="mt-6 flex flex-col gap-4">
          {queue.map((q, i) => (
            <li key={q.id}>
              <Card className={`p-6 ${i === 0 ? "ring-2 ring-gold-500" : ""}`}>
                {i === 0 && (
                  <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-gold-700">
                    Up next
                  </p>
                )}

                <p className="font-display text-2xl leading-snug text-navy-900">{q.question}</p>

                <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-600">
                  <span className="font-semibold">{q.askerName || "Anonymous"}</span>
                  <span aria-hidden="true">·</span>
                  <span>{timeAgo(q.createdAt)}</span>
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Button
                    variant="gold"
                    onClick={() => move(q.id, "answered")}
                    disabled={busyId === q.id}
                    className="px-4 py-3 text-sm"
                  >
                    ✓ Answered
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => move(q.id, "new")}
                    disabled={busyId === q.id}
                    className="px-4 py-3 text-sm"
                  >
                    Send back
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>

        {showAnswered && (
          <div className="mt-8">
            <h2 className="text-center text-xs font-bold uppercase tracking-[0.16em] text-ink-600">
              Already answered
            </h2>
            <ul className="mt-3 flex flex-col gap-2">
              {answered.length === 0 && (
                <p className="text-center text-sm text-ink-600">Nothing yet.</p>
              )}
              {answered.map((q) => (
                <li key={q.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-3 p-4 opacity-70">
                    <p className="min-w-0 flex-1 text-sm text-navy-900">{q.question}</p>
                    <Button
                      variant="outline"
                      onClick={() => move(q.id, "shortlisted")}
                      disabled={busyId === q.id}
                      className="px-3 py-2 text-xs"
                    >
                      Re-queue
                    </Button>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
