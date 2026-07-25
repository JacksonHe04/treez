import { listEntities } from "@/lib/treez/api";
import { domainById, type Domain, type EntityKind } from "@/lib/treez/config";

import { DomainDirectory } from "./domain-directory";

type DirectorySearchParams = {
  kind?: EntityKind;
  sort?: string;
  page?: string;
};

export async function DomainPage({
  domain,
  searchParams,
}: {
  domain: Domain;
  searchParams: Promise<DirectorySearchParams>;
}) {
  const query = await searchParams;
  const config = domainById[domain];
  const kind = config.kinds.some((item) => item.id === query.kind)
    ? query.kind
    : undefined;
  const sort = ["recent", "name", "score", "popular"].includes(query.sort ?? "")
    ? (query.sort as "recent" | "name" | "score" | "popular")
    : "recent";
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const pageSize = 48;
  const response = await listEntities({
    domain,
    kind,
    sort,
    limit: pageSize,
    offset: (page - 1) * pageSize,
  });

  return (
    <DomainDirectory
      config={config}
      entities={response.data}
      selectedKind={kind}
      sort={sort}
      total={response.meta?.total ?? response.data.length}
      page={page}
      pageSize={pageSize}
    />
  );
}
