import Link from "next/link";
import BrandMark from "@/components/shared/BrandMark";

export default function GameLockedNotice({ gameName }: { gameName: string }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream-50 px-6 text-center">
      <BrandMark />
      <h1 className="mt-6 font-display text-2xl font-semibold text-navy-900">{gameName}</h1>
      <p className="mt-3 text-sm text-ink-600">This game hasn&apos;t started yet — hang tight.</p>
      <Link href="/" className="mt-6 text-sm font-medium text-navy-900 underline decoration-gold-500 decoration-2 underline-offset-4">
        ← Back to games
      </Link>
    </main>
  );
}
