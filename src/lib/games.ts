export type GameSlug = "first-lines" | "genre-crown" | "book-match";

export interface GameMeta {
  slug: GameSlug;
  name: string;
  tagline: string;
}

export const GAMES: readonly GameMeta[] = [
  {
    slug: "first-lines",
    name: "The Famous First Lines Challenge",
    tagline: "Fast answers earn more points",
  },
  {
    slug: "genre-crown",
    name: "The Genre Crown",
    tagline: "Fiction first, then Non-Fiction",
  },
  {
    slug: "book-match",
    name: "The Book Match Challenge",
    tagline: "10 book-related matches, 75 seconds",
  },
];

export function getGameMeta(slug: string): GameMeta | undefined {
  return GAMES.find((g) => g.slug === slug);
}

export function gamePlayUrl(slug: GameSlug): string {
  return `/games/${slug}/play`;
}

export function gameAdminUrl(slug: GameSlug): string {
  return `/games/${slug}/admin`;
}

export function gameScreenUrl(slug: GameSlug): string {
  return `/games/${slug}/screen`;
}
