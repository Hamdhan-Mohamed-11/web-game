import Image from "next/image";

interface BrandMarkProps {
  tagline?: string;
  size?: "default" | "compact";
}

export default function BrandMark({ tagline, size = "default" }: BrandMarkProps) {
  return (
    <div className="flex flex-col items-center text-center">
      <Image
        src="/summit-logo.webp"
        alt="Pick a Book — Readers' Summit 2026, powered by Zerostix"
        width={1692}
        height={930}
        priority
        className={size === "compact" ? "h-auto w-32 sm:w-40" : "h-auto w-72 sm:w-80 lg:w-96"}
      />
      {tagline && <span className="mt-2 text-sm text-ink-600">{tagline}</span>}
    </div>
  );
}
