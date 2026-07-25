import { Search } from "lucide-react";

import { EmptyState } from "@/components/treez/empty-state";
import { EntityCard } from "@/components/treez/entity-card";
import { Input } from "@/components/ui/input";
import { searchEntities } from "@/lib/treez/api";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const response = q.trim()
    ? await searchEntities(q.trim())
    : { data: [], meta: { total: 0 } };

  return (
    <main className="search-page page-shell">
      <section className="search-hero">
        <p className="eyebrow">SEARCH THE ARCHIVE</p>
        <h1>从一段名称开始</h1>
        <p>搜索四个领域中的作品与创作者；找不到时，可以把它新增为公共条目。</p>
        <form action="/search">
          <Search aria-hidden="true" />
          <Input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="专辑、单曲、艺术家、影视、导演、书、作者、游戏、工作室"
            autoFocus
          />
          <button type="submit">搜索</button>
        </form>
      </section>

      {q && (
        <section className="search-results">
          <div className="section-heading section-heading--bordered">
            <div>
              <p className="eyebrow">RESULTS / {response.meta?.total ?? 0}</p>
              <h2>“{q}”</h2>
            </div>
          </div>
          {response.data.length > 0 ? (
            <div className="entity-grid">
              {response.data.map((entity) => (
                <EntityCard key={entity.id} entity={entity} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="公共档案里还没有它"
              description="登录后新增的作品或创作者会立即公开，也能被其他人评分。"
              actionHref={`/add?name=${encodeURIComponent(q)}`}
              actionLabel="新增这个条目"
            />
          )}
        </section>
      )}
    </main>
  );
}
