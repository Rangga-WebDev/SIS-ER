/** @format */

import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";

type CreativeButtonVariant = "primary" | "dark" | "light" | "ghost";

type CreativeButtonProps = {
  children: ReactNode;
  href?: string;
  variant?: CreativeButtonVariant;
  className?: string;
  icon?: boolean;
};

export default function CreativeButton({
  children,
  href = "#",
  variant = "primary",
  className = "",
  icon = true,
}: CreativeButtonProps) {
  const variants: Record<CreativeButtonVariant, string> = {
    primary:
      "bg-gradient-to-r from-sky-600 via-blue-700 to-blue-950 text-white shadow-sky-900/25 hover:shadow-sky-900/40",
    dark: "bg-slate-950 text-white shadow-slate-900/25 hover:bg-slate-900 hover:shadow-slate-900/40",
    light:
      "border border-slate-200 bg-white text-slate-900 shadow-slate-200/70 hover:border-sky-200 hover:bg-sky-50 hover:text-sky-800",
    ghost:
      "border border-white/15 bg-white/10 text-white shadow-black/10 hover:bg-white/15",
  };

  return (
    <a
      href={href}
      className={`creative-shimmer group relative inline-flex items-center justify-center gap-3 overflow-hidden rounded-2xl px-6 py-4 font-black transition-all duration-300 hover:-translate-y-1 hover:scale-[1.02] hover:shadow-2xl active:translate-y-0 active:scale-[0.99] ${variants[variant]} ${className}`}
    >
      <span className="absolute inset-0 rounded-2xl bg-white/0 transition group-hover:bg-white/5" />
      <span className="relative z-10">{children}</span>
      {icon && (
        <span className="relative z-10 flex h-8 w-8 items-center justify-center rounded-xl bg-white/15 transition duration-300 group-hover:translate-x-1 group-hover:bg-white/25">
          <ArrowRight size={18} />
        </span>
      )}
    </a>
  );
}
