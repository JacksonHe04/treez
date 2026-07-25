import { DomainPage } from "@/components/treez/domain-page";
import type { EntityKind } from "@/lib/treez/config";

export const dynamic = "force-dynamic";

export default function FilmPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: EntityKind; sort?: string; page?: string }>;
}) {
  return <DomainPage domain="film" searchParams={searchParams} />;
}
