// Display text only. item_key / matchKey values must match
// supabase/migrations/0004_seed.sql (book_match_pairs) exactly — the DB only
// stores the secret item_key -> correct_key mapping, never these labels.

export interface BookMatchItem {
  itemKey: string;
  label: string;
}

// 10 pairs, trimmed from 12 so the whole board fits one phone screen with
// no scrolling. Keeps all three pair types represented: 4 book→author,
// 3 book→character, 3 book→idea.
export const BOOK_MATCH_ITEMS: readonly BookMatchItem[] = [
  { itemKey: "charlie-chocolate-factory", label: "Charlie and the Chocolate Factory" },
  { itemKey: "fault-in-our-stars", label: "The Fault in Our Stars" },
  { itemKey: "diary-wimpy-kid", label: "Diary of a Wimpy Kid" },
  { itemKey: "little-prince", label: "The Little Prince" },
  { itemKey: "matilda", label: "Matilda" },
  { itemKey: "dune", label: "Dune" },
  { itemKey: "alice-wonderland", label: "Alice's Adventures in Wonderland" },
  { itemKey: "who-moved-my-cheese", label: "Who Moved My Cheese?" },
  { itemKey: "rich-dad-poor-dad", label: "Rich Dad Poor Dad" },
  { itemKey: "how-to-win-friends", label: "How to Win Friends and Influence People" },
];

// The 12 possible matches (authors, characters, ideas) shown mixed together
// on the other side of the board — order is intentionally not correlated
// with BOOK_MATCH_ITEMS above.
export const BOOK_MATCH_OPTIONS: readonly BookMatchItem[] = [
  { itemKey: "author-roald-dahl", label: "Roald Dahl" },
  { itemKey: "author-john-green", label: "John Green" },
  { itemKey: "author-jeff-kinney", label: "Jeff Kinney" },
  { itemKey: "author-saint-exupery", label: "Antoine de Saint-Exupéry" },
  { itemKey: "char-matilda-wormwood", label: "Matilda Wormwood" },
  { itemKey: "char-paul-atreides", label: "Paul Atreides" },
  { itemKey: "char-alice", label: "Alice" },
  { itemKey: "idea-adapting-to-change", label: "Adapting positively to change" },
  { itemKey: "idea-financial-literacy", label: "Financial literacy and assets vs. liabilities" },
  { itemKey: "idea-relationships-communication", label: "Building better relationships and communication" },
];
