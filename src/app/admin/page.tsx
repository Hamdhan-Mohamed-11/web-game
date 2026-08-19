import Link from "next/link";
import { GAMES, gameAdminUrl, gameScreenUrl } from "@/lib/games";
import LogoutButton from "./LogoutButton";
import GameLockControls from "./GameLockControls";
import BrandMark from "@/components/shared/BrandMark";

export default function AdminHubPage() {
  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8 sm:px-6 lg:px-8">
      {/* Wider than the participant pages on purpose — the admin runs this
          on a laptop, not a phone, so the game rows get room to put their
          actions on the right instead of wrapping underneath. */}
      <div className="mx-auto max-w-5xl">
        <div className="relative mb-8">
          <div className="flex justify-center">
            <BrandMark />
          </div>
          <div className="mt-4 flex justify-center sm:absolute sm:right-0 sm:top-0 sm:mt-0">
            <LogoutButton />
          </div>
        </div>

        <Link
          href="/qr"
          className="mb-6 block rounded-xl border border-navy-100 bg-white px-4 py-3 text-center font-medium text-navy-900 shadow-card transition-colors hover:bg-cream-100"
        >
          View / print the QR code →
        </Link>

        <GameLockControls />

        <div className="flex flex-col gap-4">
          {GAMES.map((game) => (
            <div
              key={game.slug}
              className="flex flex-col gap-4 rounded-2xl border border-navy-100 bg-white p-5 shadow-card sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold text-navy-900">{game.name}</h2>
                <p className="text-sm text-ink-600">{game.tagline}</p>
              </div>

              <div className="flex shrink-0 flex-wrap gap-3">
                <Link
                  href={gameAdminUrl(game.slug)}
                  className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-navy-900 bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2"
                >
                  Admin panel
                </Link>
                <Link
                  href={gameScreenUrl(game.slug)}
                  target="_blank"
                  className="inline-flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-navy-100 bg-white px-4 py-2.5 text-sm font-semibold text-navy-900 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy-700 focus-visible:ring-offset-2"
                >
                  LED screen ↗
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
