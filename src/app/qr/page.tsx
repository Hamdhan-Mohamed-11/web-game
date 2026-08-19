import QRCode from "qrcode";
import Link from "next/link";
import BrandMark from "@/components/shared/BrandMark";
import { buttonClassName } from "@/components/shared/Button";

async function generateQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, { width: 420, margin: 1, color: { dark: "#072966", light: "#FFFFFF" } });
}

export default async function QrPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const url = new URL("/", siteUrl).toString();
  const dataUrl = await generateQrDataUrl(url);

  return (
    <main className="min-h-screen bg-cream-50 px-4 py-10 sm:px-6 print:bg-white">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between print:hidden">
          <BrandMark />
          <Link href="/admin" className={buttonClassName("outline", "px-3 py-2 text-xs whitespace-nowrap")}>
            ← Back to admin hub
          </Link>
        </div>

        <section className="rounded-2xl border border-navy-100 bg-white p-8 text-center shadow-card">
          <h2 className="font-display text-lg font-semibold text-navy-900">Scan to join</h2>
          <p className="mb-6 text-sm text-ink-600">
            One code for the whole night — players land on the games hub, where only the game you&apos;ve unlocked is
            tappable.
          </p>
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URI, no next/image benefit */}
          <img src={dataUrl} alt="QR code to join Book Club Quiz Night" width={320} height={320} className="mx-auto" />
          <p className="mt-4 break-all text-xs text-ink-600">{url}</p>
        </section>

        <p className="mt-6 text-center text-sm text-ink-600 print:hidden">
          Unlock which game is open from the{" "}
          <Link href="/admin" className="font-medium text-navy-900 underline decoration-gold-500 decoration-2 underline-offset-4">
            admin hub
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
