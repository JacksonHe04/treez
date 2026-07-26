import Link from "next/link";

import { cn } from "@/lib/utils";

export function TreezLogo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn("treez-logo", className)}
      aria-label="Treez 首页"
    >
      <span>Treez</span>
      <i aria-hidden="true">树脂</i>
    </Link>
  );
}
