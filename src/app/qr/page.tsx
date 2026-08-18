import QRCode from "qrcode";
import Link from "next/link";
import { GAMES, gamePlayUrl } from "@/lib/games";
import BrandMark from "@/components/shared/BrandMark";

async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { width: 320, margin: 1, color: { dark: "#072966", light: "#FFFFFF" } });
}

export default async function QrPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

  const cards = await Promise.all(
    GAMES.map(async (game) => {
      const url = new URL(gamePlayUrl(game.slug), siteUrl).toString();
      const dataUrl = await generateQrDataUrl(url);
      return { game, url, dataUrl };
    })
  );

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-10 sm:px-6 print:bg-white">
      <div className="mx-auto max-w-4xl">
        <div className="mb-8 flex items-center justify-between print:hidden">
          <BrandMark tagline="QR Codes" />
          <Link href="/admin" className="text-sm text-ink-600 hover:text-navy-900">
            ← Back to admin hub
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ game, url, dataUrl }) => (
            <section
              key={game.slug}
              className="break-inside-avoid rounded-2xl border border-navy-100 bg-white p-6 text-center shadow-card"
            >
              <h2 className="font-display text-lg font-semibold text-navy-900">{game.name}</h2>
              <p className="mb-4 text-sm text-ink-600">{game.tagline}</p>
              {/* eslint-disable-next-line @next/next/no-img-element -- data: URI, no next/image benefit */}
              <img src={dataUrl} alt={`QR code for ${game.name}`} width={240} height={240} className="mx-auto" />
              <p className="mt-3 break-all text-xs text-ink-600">{url}</p>
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
