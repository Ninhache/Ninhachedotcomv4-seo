import { cn } from '@/lib/utils';
import { Link } from '@/navigation';

export type CategoryChip = { slug: string; name: string };

/**
 * Category filter chips for /blog. There is no "all" chip: by default nothing is
 * selected and every article shows. Clicking a chip restricts to that category
 * (via `?cat=<slug>`); clicking the currently-active chip again clears the
 * filter (back to everything). Each chip is a plain locale-aware link, so
 * filtering is a real server round-trip (SSR/ISR), not client-only state.
 */
export function CategoryFilter({
    categories,
    active,
}: {
    categories: CategoryChip[];
    active?: string;
}) {
    if (categories.length === 0) return null;

    return (
        <div className="flex flex-wrap gap-2">
            {categories.map(c => {
                const isActive = active === c.slug;
                return (
                    <Link
                        key={c.slug}
                        href={
                            isActive
                                ? '/blog'
                                : `/blog?cat=${encodeURIComponent(c.slug)}`
                        }
                        aria-pressed={isActive}
                        className={cn(
                            'rounded-full border px-3 py-1 text-sm transition-colors',
                            isActive
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
                        )}
                    >
                        {c.name}
                    </Link>
                );
            })}
        </div>
    );
}
