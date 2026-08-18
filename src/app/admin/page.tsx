import Link from "next/link";
import { GAMES, gameAdminUrl, gameScreenUrl } from "@/lib/games";
import LogoutButton from "./LogoutButton";
import BrandMark from "@/components/shared/BrandMark";

export default function AdminHubPage() {
  return (
    <main className="min-h-screen bg-cream-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 flex items-start justify-between">
          <BrandMark tagline="Quiz Night — Admin" />
          <LogoutButton />
        </div>

        <Link
          href="/qr"
          className="mb-6 block rounded-xl border border-navy-100 bg-white px-4 py-3 text-center font-medium text-navy-900 shadow-card transition-colors hover:bg-cream-100"
        >
          View / print QR codes →
        </Link>

        <div className="flex flex-col gap-4">
          {GAMES.map((game) => (
            <div key={game.slug} className="rounded-2xl border border-navy-100 bg-white p-5 shadow-card">
              <h2 className="font-display text-lg font-semibold text-navy-900">{game.name}</h2>
              <p className="mb-4 text-sm text-ink-600">{game.tagline}</p>
              <div className="flex flex-wrap gap-4 text-sm font-medium">
                <Link href={gameAdminUrl(game.slug)} className="text-navy-900 underline decoration-gold-500 decoration-2 underline-offset-4">
                  Open admin panel →
                </Link>
                <Link
                  href={gameScreenUrl(game.slug)}
                  target="_blank"
                  className="text-navy-900 underline decoration-gold-500 decoration-2 underline-offset-4"
                >
                  Open LED screen →
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
