import { Skeleton } from "@/components/ui/skeleton";

export default function UssdSessionsSkeleton() {
  return (
    <div className="space-y-3" data-testid="ussd-sessions-skeleton" aria-busy="true">
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="rounded-lg border border-border">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 border-b p-4 last:border-b-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  );
}
