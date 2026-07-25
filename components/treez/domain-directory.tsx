import { ArrowRight, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/treez/empty-state";
import { EntityCard } from "@/components/treez/entity-card";
import type { DomainConfig, EntityKind } from "@/lib/treez/config";
import type { EntitySummary } from "@/lib/treez/types";

export function DomainDirectory({
  config,
  entities,
  selectedKind,
  sort,
  total,
  page,
  pageSize,
}: {
  config: DomainConfig;
  entities: EntitySummary[];
  selectedKind?: EntityKind;
  sort: "recent" | "name" | "score" | "popular";
  total: number;
  page: number;
  pageSize: number;
}) {
  const Icon = config.icon;
  return (
    <main>
      <section className="domain-hero page-shell">
        <div className="domain-hero__mark">
          <Icon aria-hidden="true" />
          <span>{config.eyebrow}</span>
        </div>
        <div>
          <p className="eyebrow">PUBLIC DIRECTORY / {total} ENTRIES</p>
          <h1>{config.label}</h1>
          <p>{config.description}，以及每个人留下的公开鉴赏。</p>
        </div>
        <Button asChild>
          <Link href={`/add?domain=${config.id}`}>
            新增公共条目
            <ArrowRight aria-hidden="true" />
          </Link>
        </Button>
      </section>

      <section className="directory page-shell">
        <div className="directory-toolbar">
          <div className="filter-links" aria-label="实体类型">
            <Link
              href={config.href}
              data-active={!selectedKind}
              aria-current={!selectedKind ? "page" : undefined}
            >
              全部
            </Link>
            {config.kinds.map((kind) => (
              <Link
                key={kind.id}
                href={`${config.href}?kind=${kind.id}&sort=${sort}`}
                data-active={selectedKind === kind.id}
                aria-current={selectedKind === kind.id ? "page" : undefined}
              >
                {kind.label}
              </Link>
            ))}
          </div>
          <div className="sort-links" aria-label="排序方式">
            <SlidersHorizontal aria-hidden="true" />
            {[
              ["recent", "最近加入"],
              ["score", "评分"],
              ["popular", "热度"],
              ["name", "名称"],
            ].map(([value, label]) => (
              <Link
                key={value}
                href={`${config.href}?${new URLSearchParams({
                  ...(selectedKind ? { kind: selectedKind } : {}),
                  sort: value,
                })}`}
                data-active={sort === value}
              >
                {label}
              </Link>
            ))}
          </div>
        </div>

        {entities.length > 0 ? (
          <>
            <div className="entity-grid">
              {entities.map((entity) => (
                <EntityCard key={entity.id} entity={entity} />
              ))}
            </div>
            <nav className="pagination" aria-label="目录分页">
              {page > 1 ? (
                <Button asChild variant="outline">
                  <Link
                    href={`${config.href}?${new URLSearchParams({
                      ...(selectedKind ? { kind: selectedKind } : {}),
                      sort,
                      page: String(page - 1),
                    })}`}
                  >
                    上一页
                  </Link>
                </Button>
              ) : (
                <span />
              )}
              <p>
                {page} / {Math.max(1, Math.ceil(total / pageSize))}
              </p>
              {page * pageSize < total ? (
                <Button asChild variant="outline">
                  <Link
                    href={`${config.href}?${new URLSearchParams({
                      ...(selectedKind ? { kind: selectedKind } : {}),
                      sort,
                      page: String(page + 1),
                    })}`}
                  >
                    下一页
                  </Link>
                </Button>
              ) : (
                <span />
              )}
            </nav>
          </>
        ) : (
          <EmptyState
            title={`${config.label}档案正在等待第一条记录`}
            description="这个领域尚无公共条目。登录后新增的作品或创作者会立即成为全站可见的公共资料。"
            actionHref={`/add?domain=${config.id}`}
          />
        )}
      </section>
    </main>
  );
}
