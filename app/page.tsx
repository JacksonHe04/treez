import {
  ArrowRight,
  BookOpen,
  Clapperboard,
  Gamepad2,
  Music2,
  Quote,
  Sparkles,
} from "lucide-react";
import Link from "next/link";

import { EntityCard } from "@/components/treez/entity-card";
import { ScoreModeToggle, ScoreValue } from "@/components/treez/score";
import { Button } from "@/components/ui/button";
import { getOptionalTreezViewer } from "@/lib/auth/viewer";
import { treezLoginPath } from "@/lib/auth/paths";
import {
  getProfileById,
  getPublicHome,
  isTreezApiNotFound,
} from "@/lib/treez/api";
import { domainById, domains } from "@/lib/treez/config";
import { formatDate } from "@/lib/treez/format";
import { emptyPublicProfile } from "@/lib/treez/profile";
import type { PublicProfile } from "@/lib/treez/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [home, viewer] = await Promise.all([
    getPublicHome(),
    getOptionalTreezViewer(),
  ]);
  const profile = viewer
    ? await getProfileById(viewer.session.id).catch((error: unknown) => {
        if (isTreezApiNotFound(error)) {
          return emptyPublicProfile(viewer.session);
        }
        throw error;
      })
    : null;

  return (
    <main>
      {profile ? (
        <PersonalHero profile={profile} />
      ) : (
        <PublicHero
          entityCount={home.domains.reduce(
            (sum, item) => sum + item.entity_count,
            0,
          )}
        />
      )}

      <section className="domain-ledger page-shell">
        {domains.map((domain) => {
          const count =
            profile?.domains.find((item) => item.domain === domain.id)
              ?.rating_count ??
            home.domains.find((item) => item.domain === domain.id)
              ?.entity_count ??
            0;
          const personalAggregate = profile?.domains.find(
            (item) => item.domain === domain.id,
          );
          const Icon = domain.icon;
          return (
            <Link key={domain.id} href={domain.href}>
              <span className="domain-ledger__number">
                {String(count).padStart(2, "0")}
              </span>
              <Icon aria-hidden="true" />
              <div>
                <strong>{domain.label}</strong>
                <small>
                  {profile
                    ? personalAggregate
                      ? `我的均分 ${personalAggregate.average_score}`
                      : "等待我的第一条鉴赏"
                    : domain.description}
                </small>
              </div>
              <ArrowRight aria-hidden="true" />
            </Link>
          );
        })}
      </section>

      {profile && profile.ratings.length > 0 && (
        <>
          <section className="recent-notes page-shell">
            <div className="section-heading">
              <div>
                <p className="eyebrow">RECENT APPRECIATIONS</p>
                <h2>最近留下的判断</h2>
              </div>
              <Button asChild variant="outline">
                <Link href="/me">展开我的时间线</Link>
              </Button>
            </div>
            <div className="notes-grid">
              {profile.ratings.slice(0, 4).map((rating) => (
                <article key={rating.id} className="note-card">
                  <div>
                    <span>{domainById[rating.domain].label}</span>
                    <time dateTime={rating.commented_at}>
                      {formatDate(rating.commented_at)}
                    </time>
                  </div>
                  <h3>
                    <Link href={`/entity/${rating.entity_id}`}>
                      {rating.name}
                    </Link>
                  </h3>
                  <ScoreValue value={rating.score} compact />
                  {rating.comment ? (
                    <blockquote>
                      <Quote aria-hidden="true" />
                      {rating.comment}
                    </blockquote>
                  ) : (
                    <p>这次只留下了分数。</p>
                  )}
                </article>
              ))}
            </div>
          </section>
          <PersonalInsights profile={profile} />
        </>
      )}

      <section className="editorial-list page-shell">
        <div className="section-heading section-heading--bordered">
          <div>
            <p className="eyebrow">COMMUNITY SHELF</p>
            <h2>公共鉴赏架</h2>
          </div>
          <div className="section-heading__actions">
            <ScoreModeToggle />
            <Button asChild variant="ghost">
              <Link href="/search">浏览全部</Link>
            </Button>
          </div>
        </div>
        <div className="entity-grid entity-grid--featured">
          {(home.acclaimed.length > 0 ? home.acclaimed : home.recent)
            .slice(0, 8)
            .map((entity, index) => (
              <EntityCard key={entity.id} entity={entity} index={index} />
            ))}
        </div>
      </section>
    </main>
  );
}

function PersonalInsights({ profile }: { profile: PublicProfile }) {
  const favorites = [...profile.ratings]
    .sort(
      (left, right) =>
        right.score - left.score || right.rated_at.localeCompare(left.rated_at),
    )
    .slice(0, 5);
  return (
    <section className="personal-insights page-shell">
      <div>
        <p className="eyebrow">MY HIGHEST NOTES</p>
        <h2>我的高分年轮</h2>
        <ol>
          {favorites.map((rating) => (
            <li key={rating.id}>
              <Link href={`/entity/${rating.entity_id}`}>
                <span>{rating.name}</span>
                <ScoreValue value={rating.score} compact />
              </Link>
            </li>
          ))}
        </ol>
      </div>
      <div>
        <p className="eyebrow">TASTE THREADS</p>
        <h2>反复出现的偏好</h2>
        {profile.tags.length > 0 ? (
          <div className="personal-insights__tags">
            {profile.tags.slice(0, 12).map((tag) => (
              <Link key={tag.slug} href="/me">
                {tag.name}
                <sup>{tag.usage_count}</sup>
              </Link>
            ))}
          </div>
        ) : (
          <p>标签会在每次鉴赏中逐渐长成你的偏好索引。</p>
        )}
      </div>
    </section>
  );
}

function PublicHero({ entityCount }: { entityCount: number }) {
  return (
    <section className="home-hero home-hero--public">
      <div className="page-shell home-hero__grid">
        <div>
          <p className="eyebrow">A PUBLIC JOURNAL OF PERSONAL TASTE</p>
          <h1>
            让每一次
            <em>鉴赏</em>
            都长成你的审美年轮。
          </h1>
          <p className="home-hero__intro">
            Treez
            收下你听过的音乐、看过的影视、读过的书与玩过的游戏。十分制或五星半星，
            一条评论，一个日期，慢慢看见自己的偏好如何生长。
          </p>
          <div className="home-hero__actions">
            <Button asChild size="lg">
              <Link href={treezLoginPath("/")}>
                使用 iNon SSO 开始
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/music">先逛公共档案</Link>
            </Button>
          </div>
        </div>
        <div className="hero-specimen" aria-label="Treez 四领域鉴赏">
          <span className="hero-specimen__seal">T</span>
          <p>Est. 2026</p>
          <div>
            <Music2 aria-hidden="true" />
            <Clapperboard aria-hidden="true" />
            <BookOpen aria-hidden="true" />
            <Gamepad2 aria-hidden="true" />
          </div>
          <strong>{entityCount}</strong>
          <small>PUBLIC ENTRIES & GROWING</small>
        </div>
      </div>
    </section>
  );
}

function PersonalHero({ profile }: { profile: PublicProfile }) {
  const latest = profile.ratings[0];
  return (
    <section className="home-hero home-hero--personal">
      <div className="page-shell home-hero__grid">
        <div>
          <p className="eyebrow">
            YOUR APPRECIATION, {formatDate(new Date().toISOString())}
          </p>
          <h1>
            欢迎回来，
            <em>{profile.profile.display_name}</em>
          </h1>
          <p className="home-hero__intro">
            你已经留下 {profile.ratings.length}{" "}
            条公开鉴赏。首页先讲述你的最近记录、评分习惯和四类偏好，
            公共内容只在旁边提供新的发现。
          </p>
          <div className="home-hero__actions">
            <Button asChild size="lg">
              <Link href="/add">
                新增一次鉴赏
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/me">打开我的档案</Link>
            </Button>
          </div>
        </div>
        <div className="personal-feature">
          <Sparkles aria-hidden="true" />
          <p className="eyebrow">LATEST NOTE</p>
          {latest ? (
            <>
              <strong>{latest.name}</strong>
              <ScoreValue value={latest.score} />
              <p>{latest.comment ?? "这次只留下了分数。"}</p>
            </>
          ) : (
            <p>从第一条鉴赏开始，首页会慢慢长成你的个人杂志。</p>
          )}
        </div>
      </div>
    </section>
  );
}
