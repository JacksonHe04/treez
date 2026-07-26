import type { Metadata } from "next";
import {
  ArrowLeft,
  CalendarDays,
  Link2,
  MessageSquareText,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { EntityCover } from "@/components/treez/entity-cover";
import { RatingEditor } from "@/components/treez/rating-editor";
import { ScoreModeToggle, ScoreValue } from "@/components/treez/score";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getOptionalTreezViewer } from "@/lib/auth/viewer";
import {
  getEntity,
  getProfileById,
  isTreezApiNotFound,
} from "@/lib/treez/api";
import { domainById, kindLabels } from "@/lib/treez/config";
import { formatCount, formatDate } from "@/lib/treez/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const entity = await getEntity(id).catch(() => null);
  return entity
    ? {
        title: entity.name,
        description:
          entity.description ??
          `${kindLabels[entity.kind]} · ${formatCount(entity.rating_count)} 人评分`,
      }
    : { title: "条目未找到" };
}

export default async function EntityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [entity, viewer] = await Promise.all([
    getEntity(id).catch((error: unknown) => {
      if (isTreezApiNotFound(error)) return null;
      throw error;
    }),
    getOptionalTreezViewer(),
  ]);
  if (!entity) notFound();

  const viewerProfile = viewer
    ? await getProfileById(viewer.session.id).catch((error: unknown) => {
        if (isTreezApiNotFound(error)) return null;
        throw error;
      })
    : null;
  const initialRating = viewerProfile
    ? entity.ratings.find(
        (rating) => rating.profile_slug === viewerProfile.profile.slug,
      )
    : undefined;
  const config = domainById[entity.domain];
  const creators = entity.relations.filter(
    (relation) =>
      relation.direction === "outgoing" &&
      ["created_by", "contributed_by"].includes(relation.relation_type),
  );
  const related = entity.relations.filter(
    (relation) => !creators.includes(relation),
  );

  return (
    <main className="entity-page">
      <section className="entity-hero page-shell">
        <Link href={config.href} className="back-link">
          <ArrowLeft aria-hidden="true" />
          返回{config.label}
        </Link>
        <div className="entity-hero__grid">
          <EntityCover
            src={entity.cover_url}
            name={entity.name}
            className="entity-hero__cover"
          />
          <div className="entity-hero__content">
            <p className="eyebrow">
              {config.eyebrow} / {kindLabels[entity.kind]}
            </p>
            <h1>{entity.name}</h1>
            {creators.length > 0 && (
              <p className="entity-creators">
                {creators.map((creator, index) => (
                  <span key={creator.id}>
                    {index > 0 && "、"}
                    <Link href={`/entity/${creator.entity_id}`}>
                      {creator.name}
                    </Link>
                  </span>
                ))}
              </p>
            )}
            <div className="entity-aggregate">
              <ScoreValue value={entity.average_score} />
              <div>
                <strong>{formatCount(entity.rating_count)}</strong>
                <span>份公开评分</span>
              </div>
              <ScoreModeToggle />
            </div>
            {entity.description && (
              <p className="entity-description">{entity.description}</p>
            )}
            <dl className="entity-facts">
              {entity.release_date && (
                <div>
                  <dt>发行 / 出版</dt>
                  <dd>{formatDate(entity.release_date)}</dd>
                </div>
              )}
              {entity.metadata.map((item) => (
                <div key={`${item.key}-${item.position}`}>
                  <dt>{item.key.replaceAll("_", " ")}</dt>
                  <dd>{item.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="entity-body page-shell">
        <div className="entity-main">
          <RatingEditor
            entityId={entity.id}
            entityName={entity.name}
            viewer={Boolean(viewer)}
            initialRating={initialRating}
          />
          <Separator />
          <div className="section-heading">
            <div>
              <p className="eyebrow">PUBLIC NOTES</p>
              <h2>公开评论</h2>
            </div>
            <MessageSquareText aria-hidden="true" />
          </div>
          {entity.ratings.length > 0 ? (
            <div className="public-ratings">
              {entity.ratings.map((rating) => (
                <article key={rating.id}>
                  <header>
                    <div className="comment-avatar" aria-hidden="true">
                      {rating.display_name.slice(0, 1)}
                    </div>
                    <div>
                      <Link href={`/u/${rating.profile_slug}`}>
                        {rating.display_name}
                      </Link>
                      <time dateTime={rating.commented_at}>
                        <CalendarDays aria-hidden="true" />
                        {formatDate(rating.commented_at)}
                      </time>
                    </div>
                    <ScoreValue value={rating.score} compact />
                  </header>
                  {rating.comment ? (
                    <p>{rating.comment}</p>
                  ) : (
                    <p className="muted-copy">这次只留下了分数。</p>
                  )}
                  {rating.tags.length > 0 && (
                    <div className="rating-tags">
                      {rating.tags.map((tag) => (
                        <Badge key={tag.slug} variant="secondary">
                          {tag.name}
                        </Badge>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <p className="empty-copy">
              还没有公开评分，成为第一个留下判断的人。
            </p>
          )}
        </div>
        <aside className="entity-aside">
          <p className="eyebrow">CONNECTIONS</p>
          <h2>
            <Link2 aria-hidden="true" />
            关联条目
          </h2>
          {related.length > 0 ? (
            <ul>
              {related.map((relation) => (
                <li key={relation.id}>
                  <Link href={`/entity/${relation.entity_id}`}>
                    <span>{relation.name}</span>
                    <small>{kindLabels[relation.kind]}</small>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p>暂无其他关联条目。</p>
          )}
        </aside>
      </section>
    </main>
  );
}
