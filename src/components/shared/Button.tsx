import type { ButtonHTMLAttributes } from "react";

type Variant = "gold" | "navy" | "outline" | "danger" | "success";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const base =
  "inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 min-h-[44px] text-sm font-semibold tracking-wide transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer";

const variants: Record<Variant, string> = {
  gold: "bg-gold-500 text-navy-950 hover:bg-gold-400 focus-visible:ring-gold-600 shadow-gold",
  navy: "bg-navy-900 text-white hover:bg-navy-800 focus-visible:ring-navy-700",
  outline: "bg-white text-navy-900 border border-navy-100 hover:bg-navy-100/40 focus-visible:ring-navy-700",
  danger: "bg-white text-danger-600 border border-danger-600/40 hover:bg-danger-600/5 focus-visible:ring-danger-600",
  success: "bg-success-600 text-white hover:bg-success-600/90 focus-visible:ring-success-600",
};

export default function Button({ variant = "navy", className = "", ...props }: ButtonProps) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

// For non-<button> elements (e.g. next/link's <a>) that need to look like a
// Button — a real <button> can't nest inside an <a>, which is invalid HTML.
export function buttonClassName(variant: Variant = "navy", className = ""): string {
  return `${base} ${variants[variant]} ${className}`;
}
