import Link from "next/link";
import { GAMES, gamePlayUrl } from "@/lib/games";
import BrandMark from "@/components/shared/BrandMark";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <BrandMark />
        <h1 className="mt-6 font-display text-3xl font-bold text-navy-900">Book Club Quiz Night</h1>
        <p className="mt-3 text-sm text-ink-600">Pick a game below to join.</p>

        <div className="mt-8 flex flex-col gap-3">
          {GAMES.map((game) => (
            <Link
              key={game.slug}
              href={gamePlayUrl(game.slug)}
              className="rounded-xl border border-navy-100 bg-white px-5 py-4 text-left shadow-card transition-colors hover:bg-cream-100"
            >
              <div className="font-display font-semibold text-navy-900">{game.name}</div>
              <div className="text-sm text-ink-600">{game.tagline}</div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
