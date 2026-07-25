import { CalendarDays, Leaf, Quote } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { domainById, kindLabels } from "@/lib/treez/config";
import { formatCount, formatDate } from "@/lib/treez/format";
import type { PublicProfile } from "@/lib/treez/types";

import { EntityCover } from "./entity-cover";
import { ScoreValue } from "./score";

export function ProfileView({
  data,
  personal = false,
}: {
  data: PublicProfile;
  personal?: boolean;
}) {
  const total = data.ratings.length;
  const average =
    total > 0
      ? data.ratings.reduce((sum, rating) => sum + rating.score, 0) / total
      : null;

  return (
    <main className="profile-page page-shell">
      <section className="profile-hero">
        <div className="profile-monogram" aria-hidden="true">
          {data.profile.display_name.slice(0, 1)}
        </div>
        <div>
          <p className="eyebrow">
            {personal ? "MY APPRECIATION ARCHIVE" : "PUBLIC TASTING ARCHIVE"}
          </p>
          <h1>{data.profile.display_name}</h1>
          <p className="profile-handle">@{data.profile.slug}</p>
          <p className="profile-bio">
            {data.profile.bio ?? "在听、看、读与玩之间，留下自己的判断。"}
          </p>
        </div>
        <dl className="profile-totals">
          <div>
            <dt>记录</dt>
            <dd>{formatCount(total)}</dd>
          </div>
          <div>
            <dt>均分</dt>
            <dd>{average?.toFixed(1) ?? "—"}</dd>
          </div>
          <div>
            <dt>加入</dt>
            <dd>{formatDate(data.profile.joined_at)}</dd>
          </div>
        </dl>
      </section>

      <section className="taste-strip" aria-label="四领域鉴赏画像">
        {(["music", "film", "book", "game"] as const).map((domain) => {
          const aggregate = data.domains.find((item) => item.domain === domain);
          const config = domainById[domain];
          const Icon = config.icon;
          return (
            <div key={domain}>
              <Icon aria-hidden="true" />
              <span>{config.label}</span>
              <strong>{aggregate?.rating_count ?? 0}</strong>
              <small>
                {aggregate ? `均分 ${aggregate.average_score}` : "等待第一条"}
              </small>
            </div>
          );
        })}
      </section>

      <section className="profile-content">
        <div>
          <div className="section-heading">
            <div>
              <p className="eyebrow">THE TIMELINE</p>
              <h2>鉴赏时间线</h2>
            </div>
            <CalendarDays aria-hidden="true" />
          </div>
          {data.ratings.length > 0 ? (
            <div className="timeline">
              {data.ratings.map((rating) => (
                <article key={rating.id} className="timeline-entry">
                  <time dateTime={rating.commented_at}>
                    {formatDate(rating.commented_at)}
                  </time>
                  <EntityCover
                    src={rating.cover_url}
                    name={rating.name}
                    className="timeline-entry__cover"
                  />
                  <div className="timeline-entry__body">
                    <div>
                      <Badge variant="outline">
                        {domainById[rating.domain].label} ·{" "}
                        {kindLabels[rating.kind]}
                      </Badge>
                      <ScoreValue value={rating.score} compact />
                    </div>
                    <h3>
                      <Link href={`/entity/${rating.entity_id}`}>
                        {rating.name}
                      </Link>
                    </h3>
                    {rating.comment && (
                      <blockquote>
                        <Quote aria-hidden="true" />
                        {rating.comment}
                      </blockquote>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="profile-empty">
              <Leaf aria-hidden="true" />
              <p>还没有公开鉴赏记录。</p>
            </div>
          )}
        </div>
        <aside className="profile-aside">
          <p className="eyebrow">TASTE NOTES</p>
          <h2>标签偏好</h2>
          {data.tags.length > 0 ? (
            <div className="tag-cloud">
              {data.tags.map((tag) => (
                <span key={tag.slug}>
                  {tag.name} <sup>{tag.usage_count}</sup>
                </span>
              ))}
            </div>
          ) : (
            <p>评分时加入标签，它们会逐渐勾勒出你的审美线索。</p>
          )}
        </aside>
      </section>
    </main>
  );
}
