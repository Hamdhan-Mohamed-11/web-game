import Image from "next/image";

interface BrandMarkProps {
  tagline?: string;
  size?: "default" | "compact";
}

export default function BrandMark({ tagline, size = "default" }: BrandMarkProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <Image
        src="/pick-a-book-logo.png"
        alt="Pick a Book — Readers' Summit 2026"
        width={826}
        height={349}
        priority
        className={size === "compact" ? "h-auto w-28 sm:w-32" : "h-auto w-56 sm:w-64"}
      />
      {tagline && <span className="mt-2 text-sm text-ink-600">{tagline}</span>}
    </div>
  );
}
