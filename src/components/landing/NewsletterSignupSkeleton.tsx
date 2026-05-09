import { Skeleton } from "@/components/ui/skeleton";

export default function NewsletterSignupSkeleton() {
  return (
    <div className="mt-4 flex gap-2" data-testid="newsletter-signup-skeleton" aria-busy="true">
      <Skeleton className="h-9 w-[220px]" />
      <Skeleton className="h-9 w-24" />
    </div>
  );
}
