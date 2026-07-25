import { AddEntityForm } from "@/components/treez/add-entity-form";
import { getOptionalTreezViewer } from "@/lib/auth/viewer";
import { domainById, type Domain, type EntityKind } from "@/lib/treez/config";

export const dynamic = "force-dynamic";

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: Domain; kind?: EntityKind }>;
}) {
  const query = await searchParams;
  const viewer = await getOptionalTreezViewer();
  const domain =
    query.domain && query.domain in domainById ? query.domain : "music";
  const kind = query.kind;

  return (
    <main className="add-page page-shell">
      <section className="add-page__intro">
        <p className="eyebrow">ADD TO THE PUBLIC ARCHIVE</p>
        <h1>种下一条新的公共记录</h1>
        <p>
          这里新增的是全站公共条目，不是私密笔记。创建后任何人都可以浏览并评分；
          你的个人判断会在下一步单独留下。
        </p>
      </section>
      <AddEntityForm
        initialDomain={domain}
        initialKind={kind}
        viewer={Boolean(viewer)}
      />
    </main>
  );
}
