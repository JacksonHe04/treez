import { Sprout } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";

export function EmptyState({
  title,
  description,
  actionHref = "/add",
  actionLabel = "新增第一个条目",
}: {
  title: string;
  description: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="empty-state">
      <Sprout aria-hidden="true" />
      <p className="eyebrow">A NEW BEGINNING</p>
      <h2>{title}</h2>
      <p>{description}</p>
      <Button asChild>
        <Link href={actionHref}>{actionLabel}</Link>
      </Button>
    </div>
  );
}
