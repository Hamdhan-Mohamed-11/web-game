import Link from "next/link";
import { GAMES, gameAdminUrl, gameScreenUrl } from "@/lib/games";
import LogoutButton from "./LogoutButton";
import GameLockToggle from "./GameLockToggle";
import BrandMark from "@/components/shared/BrandMark";
import Card from "@/components/shared/Card";

const STEPS = [
  {
    title: "Unlock one game at a time",
    body: "Everyone scans the same QR code and lands on a hub listing all three games. Only the game you unlock is tappable — unlocking one automatically locks the other two, so nobody wanders into the wrong game.",
  },
  {
    title: "Open that game's admin panel and LED screen",
    body: "Put the LED screen on the projector, and keep the admin panel on your laptop. The admin panel shows the same countdown the room sees, plus how many people have answered.",
  },
  {
    title: "Run the questions",
    body: "Advance each question yourself when the room is ready. Wait for the answered count to fill up before moving on — the bar turns green once everyone is in.",
  },
  {
    title: "Reveal, then move on",
    body: "After the last question, confirm the winners to show them on the LED screen. Then unlock the next game — that locks the finished one automatically.",
  },
];

export default function AdminHubPage() {
  return (
    <main className="min-h-screen bg-cream-50 px-4 py-8 sm:px-6 lg:px-8">
      {/* Wider than the participant pages on purpose — the admin runs this
          on a laptop, not a phone, so game rows can put their actions on
          the right instead of wrapping underneath. */}
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

        <Card className="mb-6 p-5 sm:p-6">
          <h2 className="mb-1 font-display text-lg font-semibold text-navy-900">How to run the night</h2>
          <p className="mb-4 text-sm text-ink-600">
            Players never pick a game themselves — you decide what&apos;s open, and their screens follow along live.
          </p>
          <ol className="flex flex-col gap-4">
            {STEPS.map((step, i) => (
              <li key={step.title} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy-900 font-display text-sm font-bold text-white">
                  {i + 1}
                </span>
                <div>
                  <div className="font-semibold text-navy-900">{step.title}</div>
                  <p className="text-sm text-ink-600">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>

        <div className="flex flex-col gap-4">
          {GAMES.map((game) => (
            <div
              key={game.slug}
              className="flex flex-col gap-4 rounded-2xl border border-navy-100 bg-white p-5 shadow-card lg:flex-row lg:items-center lg:justify-between"
            >
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold text-navy-900">{game.name}</h2>
                <p className="text-sm text-ink-600">{game.tagline}</p>
              </div>

              <div className="flex shrink-0 flex-wrap items-start gap-3">
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
                <GameLockToggle slug={game.slug} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
