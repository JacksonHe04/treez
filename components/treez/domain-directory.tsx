import { ArrowRight, Search, SlidersHorizontal } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/treez/empty-state";
import { EntityCard } from "@/components/treez/entity-card";
import type { DomainConfig, EntityKind } from "@/lib/treez/config";
import type { EntitySummary } from "@/lib/treez/types";

export function DomainDirectory({
  config,
  entities,
  selectedKind,
  query,
  sort,
  total,
  page,
  pageSize,
}: {
  config: DomainConfig;
  entities: EntitySummary[];
  selectedKind?: EntityKind;
  query: string;
  sort: "recent" | "name" | "score" | "popular";
  total: number;
  page: number;
  pageSize: number;
}) {
  const Icon = config.icon;
  function directoryHref(input: {
    kind?: EntityKind;
    q?: string;
    sort?: string;
    page?: number;
  }): string {
    const params = new URLSearchParams();
    if (input.kind) params.set("kind", input.kind);
    if (input.q) params.set("q", input.q);
    if (input.sort && input.sort !== "recent") params.set("sort", input.sort);
    if (input.page && input.page > 1) params.set("page", String(input.page));
    const search = params.toString();
    return search ? `${config.href}?${search}` : config.href;
  }

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
        <form
          action={config.href}
          className="directory-search"
          role="search"
        >
          <Search aria-hidden="true" />
          <Input
            type="search"
            name="q"
            defaultValue={query}
            placeholder={`在${config.label}中搜索作品或创作者`}
            aria-label={`在${config.label}中搜索`}
          />
          {selectedKind && (
            <input type="hidden" name="kind" value={selectedKind} />
          )}
          <input type="hidden" name="sort" value={sort} />
          <Button type="submit">搜索</Button>
          {query && (
            <Button asChild type="button" variant="ghost">
              <Link
                href={directoryHref({
                  kind: selectedKind,
                  sort,
                })}
              >
                清除
              </Link>
            </Button>
          )}
        </form>
        <div className="directory-toolbar">
          <div className="filter-links" aria-label="实体类型">
            <Link
              href={directoryHref({ q: query, sort })}
              data-active={!selectedKind}
              aria-current={!selectedKind ? "page" : undefined}
            >
              全部
            </Link>
            {config.kinds.map((kind) => (
              <Link
                key={kind.id}
                href={directoryHref({ kind: kind.id, q: query, sort })}
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
                href={directoryHref({
                  kind: selectedKind,
                  q: query,
                  sort: value,
                })}
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
                    href={directoryHref({
                      kind: selectedKind,
                      q: query,
                      sort,
                      page: page - 1,
                    })}
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
                    href={directoryHref({
                      kind: selectedKind,
                      q: query,
                      sort,
                      page: page + 1,
                    })}
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
            title={
              query
                ? `${config.label}档案中没有“${query}”`
                : `${config.label}档案正在等待第一条记录`
            }
            description={
              query
                ? "可以调整名称或类型继续搜索；确认不存在时，把它种成新的公共条目。"
                : "这个领域尚无公共条目。登录后新增的作品或创作者会立即成为全站可见的公共资料。"
            }
            actionHref={`/add?${new URLSearchParams({
              domain: config.id,
              ...(selectedKind ? { kind: selectedKind } : {}),
              ...(query ? { name: query } : {}),
            })}`}
            actionLabel={query ? "新增这个条目" : undefined}
          />
        )}
      </section>
    </main>
  );
}
