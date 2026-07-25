import { ImageIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { validCoverUrl } from "@/lib/treez/format";

export function EntityCover({
  src,
  name,
  className,
}: {
  src?: string | null;
  name: string;
  className?: string;
}) {
  const cover = validCoverUrl(src);
  return (
    <div
      className={cn("entity-cover", !cover && "entity-cover--empty", className)}
      role="img"
      aria-label={`${name}封面`}
      style={cover ? { backgroundImage: `url("${cover}")` } : undefined}
    >
      {!cover && (
        <>
          <ImageIcon aria-hidden="true" />
          <span>{name.slice(0, 2)}</span>
        </>
      )}
    </div>
  );
}
