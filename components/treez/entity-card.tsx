import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { domainById, kindLabels } from "@/lib/treez/config";
import { formatCount } from "@/lib/treez/format";
import type { EntitySummary } from "@/lib/treez/types";

import { EntityCover } from "./entity-cover";
import { ScoreValue } from "./score";

export function EntityCard({
  entity,
  index,
}: {
  entity: EntitySummary;
  index?: number;
}) {
  return (
    <article className="entity-card">
      <Link
        href={`/entity/${entity.id}`}
        className="entity-card__cover-link"
        aria-label={`查看 ${entity.name}`}
      >
        {index !== undefined && (
          <span className="entity-card__index">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
        <EntityCover src={entity.cover_url} name={entity.name} />
      </Link>
      <div className="entity-card__body">
        <div className="entity-card__meta">
          <Badge variant="outline">{kindLabels[entity.kind]}</Badge>
          <span>{domainById[entity.domain].label}</span>
        </div>
        <h3>
          <Link href={`/entity/${entity.id}`}>
            {entity.name}
            <ArrowUpRight aria-hidden="true" />
          </Link>
        </h3>
        <div className="entity-card__score">
          <ScoreValue value={entity.average_score} compact />
          <span>{formatCount(entity.rating_count)} 人评分</span>
        </div>
      </div>
    </article>
  );
}
