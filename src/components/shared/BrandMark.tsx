import Image from "next/image";

export default function BrandMark({ tagline }: { tagline?: string }) {
  return (
    <div className="flex flex-col items-center text-center">
      <Image
        src="/pick-a-book-logo.png"
        alt="Pick a Book — Readers' Summit 2026"
        width={826}
        height={349}
        priority
        className="h-auto w-56 sm:w-64"
      />
      {tagline && <span className="mt-2 text-sm text-ink-600">{tagline}</span>}
    </div>
  );
}
