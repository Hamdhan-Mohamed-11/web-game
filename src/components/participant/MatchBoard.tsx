"use client";

import { useEffect, useMemo, useState } from "react";
import { getBrowserSupabaseClient } from "@/lib/supabase/browserClient";
import { BOOK_MATCH_ITEMS, BOOK_MATCH_OPTIONS } from "@/lib/data/bookMatch.items";
import { MATCH_ROUND_DURATION_MS, TOTAL_PAIRS } from "@/lib/scoring/bookmatch";
import CountdownTimer from "@/components/shared/CountdownTimer";

function shuffled<T>(items: readonly T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Playful candy-bright palette for the matching pills — deliberately more
// vibrant than the rest of the literary navy/gold system, per reference
// design. Colors are keyed by each item's stable index in the source data
// (not its rendered position), so a card's color never shifts as other
// cards around it get matched and removed.
const CHIP_STYLES = [
  { bg: "bg-chip-pink", text: "text-white" },
  { bg: "bg-chip-green", text: "text-white" },
  { bg: "bg-chip-amber", text: "text-navy-950" },
  { bg: "bg-chip-cyan", text: "text-white" },
  { bg: "bg-chip-purple", text: "text-white" },
  { bg: "bg-chip-orange", text: "text-white" },
];

const ITEM_COLOR_INDEX = new Map(BOOK_MATCH_ITEMS.map((item, i) => [item.itemKey, i]));
const OPTION_COLOR_INDEX = new Map(BOOK_MATCH_OPTIONS.map((opt, i) => [opt.itemKey, i]));

function chipStyle(key: string, index: Map<string, number>) {
  const i = index.get(key) ?? 0;
  return CHIP_STYLES[i % CHIP_STYLES.length];
}

interface MatchBoardProps {
  sessionId: string;
  startedAt: string | null;
  initialMatchedItemKeys: Set<string>;
  onFinished: (totalPoints: number) => void;
}

export default function MatchBoard({ sessionId, startedAt, initialMatchedItemKeys, onFinished }: MatchBoardProps) {
  const [options] = useState(() => shuffled(BOOK_MATCH_OPTIONS));
  const [lockedItemKeys, setLockedItemKeys] = useState<Set<string>>(initialMatchedItemKeys);
  const [lockedOptionKeys, setLockedOptionKeys] = useState<Set<string>>(new Set());
  const [selectedItemKey, setSelectedItemKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const [wrongPulse, setWrongPulse] = useState<string | null>(null);
  const [justMatched, setJustMatched] = useState<string | null>(null);

  const progress = lockedItemKeys.size;
  const done = progress >= TOTAL_PAIRS || timeUp;

  const remainingItems = useMemo(
    () => BOOK_MATCH_ITEMS.filter((item) => !lockedItemKeys.has(item.itemKey)),
    [lockedItemKeys]
  );
  const remainingOptions = useMemo(
    () => options.filter((opt) => !lockedOptionKeys.has(opt.itemKey)),
    [options, lockedOptionKeys]
  );

  function handleSelectItem(itemKey: string) {
    if (done || submitting) return;
    setSelectedItemKey((prev) => (prev === itemKey ? null : itemKey));
  }

  async function handleSelectOption(optionKey: string) {
    if (done || submitting || !selectedItemKey) return;
    const itemKey = selectedItemKey;
    setSubmitting(true);

    const supabase = getBrowserSupabaseClient();
    const { data, error } = await supabase.rpc("bookmatch_submit_match", {
      p_session_id: sessionId,
      p_item_key: itemKey,
      p_selected_key: optionKey,
    });
    const result = data?.[0];

    setSubmitting(false);
    setSelectedItemKey(null);

    if (error || !result) return;

    if (result.is_correct) {
      setJustMatched(itemKey);
      setTimeout(() => {
        setLockedItemKeys((prev) => new Set(prev).add(itemKey));
        setLockedOptionKeys((prev) => new Set(prev).add(optionKey));
        setJustMatched(null);
      }, 260);
      if (result.is_finished) {
        onFinished(result.total_points);
      }
    } else {
      setWrongPulse(itemKey);
      setTimeout(() => setWrongPulse(null), 400);
    }
  }

  function handleExpire() {
    setTimeUp(true);
  }

  useEffect(() => {
    if (!timeUp) return;
    const supabase = getBrowserSupabaseClient();
    supabase
      .from("book_match_sessions")
      .select("total_points")
      .eq("id", sessionId)
      .maybeSingle()
      .then(({ data }) => onFinished(data?.total_points ?? 0));
    // onFinished intentionally omitted: it's a fresh closure from the parent
    // on every render and isn't meant to re-trigger this fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeUp, sessionId]);

  return (
    <main className="min-h-screen bg-cream-50 px-3 pb-10 pt-6">
      <div className="mx-auto max-w-lg">
        <div className="mb-5 flex items-center justify-between px-1">
          <span className="rounded-full bg-navy-900 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-white">
            {progress}/{TOTAL_PAIRS} matched
          </span>
          <CountdownTimer startedAt={startedAt} durationMs={MATCH_ROUND_DURATION_MS} onExpire={handleExpire} size={56} />
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
          <div className="flex flex-col gap-2.5">
            {remainingItems.map((item) => {
              const style = chipStyle(item.itemKey, ITEM_COLOR_INDEX);
              const isSelected = selectedItemKey === item.itemKey;
              return (
                <button
                  key={item.itemKey}
                  onClick={() => handleSelectItem(item.itemKey)}
                  disabled={done}
                  className={`relative min-h-[48px] rounded-full py-2.5 pl-4 pr-5 text-left text-xs font-bold leading-tight shadow-md transition-all duration-200 sm:text-sm ${style.bg} ${style.text} ${
                    wrongPulse === item.itemKey ? "animate-shake" : ""
                  } ${justMatched === item.itemKey ? "scale-90 opacity-0" : ""} ${
                    isSelected ? "scale-105 ring-4 ring-navy-900 ring-offset-2 ring-offset-cream-50" : ""
                  } ${done ? "cursor-default" : "cursor-pointer active:scale-95"}`}
                >
                  {item.label}
                  <span
                    aria-hidden="true"
                    className={`absolute top-1/2 -right-1.5 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-cream-50 shadow-sm ${style.bg}`}
                  />
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2.5">
            {remainingOptions.map((option) => {
              const style = chipStyle(option.itemKey, OPTION_COLOR_INDEX);
              return (
                <button
                  key={option.itemKey}
                  onClick={() => handleSelectOption(option.itemKey)}
                  disabled={done || !selectedItemKey}
                  className={`relative min-h-[48px] rounded-full py-2.5 pl-5 pr-4 text-left text-xs font-bold leading-tight shadow-md transition-opacity duration-200 sm:text-sm ${style.bg} ${style.text} ${
                    done || !selectedItemKey ? "cursor-default opacity-40" : "cursor-pointer active:scale-95"
                  }`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute top-1/2 -left-1.5 h-3.5 w-3.5 -translate-y-1/2 rounded-full border-2 border-cream-50 shadow-sm ${style.bg}`}
                  />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>

        {done && (
          <p className="mt-6 text-center font-display text-lg font-semibold text-navy-900">
            {progress >= TOTAL_PAIRS ? "All matched!" : "Time's up."}
          </p>
        )}
      </div>
    </main>
  );
}
