"use client";

import { CalendarDays, Leaf, Quote } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  const [domain, setDomain] = useState("all");
  const [year, setYear] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const total = data.ratings.length;
  const average =
    total > 0
      ? data.ratings.reduce((sum, rating) => sum + rating.score, 0) / total
      : null;
  const years = useMemo(
    () =>
      [
        ...new Set(
          data.ratings.map((rating) =>
            new Date(rating.commented_at).getUTCFullYear().toString(),
          ),
        ),
      ].sort((a, b) => Number(b) - Number(a)),
    [data.ratings],
  );
  const visibleRatings = useMemo(
    () =>
      data.ratings.filter(
        (rating) =>
          (domain === "all" || rating.domain === domain) &&
          (year === "all" ||
            new Date(rating.commented_at).getUTCFullYear().toString() ===
              year) &&
          (selectedTag === "all" ||
            (rating.tags ?? []).some((item) => item.slug === selectedTag)),
      ),
    [data.ratings, domain, selectedTag, year],
  );
  const filtered = domain !== "all" || year !== "all" || selectedTag !== "all";

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

      <section className="profile-filters" aria-label="鉴赏档案筛选">
        <div>
          <span>筛选这份档案</span>
          <strong>
            {visibleRatings.length} / {total}
          </strong>
        </div>
        <Select value={domain} onValueChange={setDomain}>
          <SelectTrigger aria-label="按领域筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部领域</SelectItem>
            {(["music", "film", "book", "game"] as const).map((item) => (
              <SelectItem key={item} value={item}>
                {domainById[item].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={year} onValueChange={setYear}>
          <SelectTrigger aria-label="按年份筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部年份</SelectItem>
            {years.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={selectedTag} onValueChange={setSelectedTag}>
          <SelectTrigger aria-label="按标签筛选">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部标签</SelectItem>
            {data.tags.map((item) => (
              <SelectItem key={item.slug} value={item.slug}>
                {item.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          variant="ghost"
          disabled={!filtered}
          onClick={() => {
            setDomain("all");
            setYear("all");
            setSelectedTag("all");
          }}
        >
          清除筛选
        </Button>
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
          {visibleRatings.length > 0 ? (
            <div className="timeline">
              {visibleRatings.map((rating) => (
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
              <p>
                {total > 0
                  ? "当前筛选下还没有鉴赏记录。"
                  : "还没有公开鉴赏记录。"}
              </p>
            </div>
          )}
        </div>
        <aside className="profile-aside">
          <p className="eyebrow">TASTE NOTES</p>
          <h2>标签偏好</h2>
          {data.tags.length > 0 ? (
            <div className="tag-cloud">
              {data.tags.map((tag) => (
                <button
                  type="button"
                  key={tag.slug}
                  data-active={tag.slug === selectedTag}
                  onClick={() =>
                    setSelectedTag((current) =>
                      current === tag.slug ? "all" : tag.slug,
                    )
                  }
                >
                  {tag.name} <sup>{tag.usage_count}</sup>
                </button>
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
