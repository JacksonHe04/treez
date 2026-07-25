import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <main className="loading-page page-shell" aria-label="正在加载">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-24 w-3/4" />
      <div className="entity-grid">
        {Array.from({ length: 8 }, (_, index) => (
          <Skeleton key={index} className="aspect-[4/5] w-full" />
        ))}
      </div>
    </main>
  );
}
