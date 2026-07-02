import { cn } from '@/lib/utils';
import { Link } from '@/navigation';

export type CategoryChip = { slug: string; name: string };

/**
 * Category filter chip row for /blog. Server component: each chip is a plain
 * locale-aware link that drives the list via the `?cat=<slug>` search param, so
 * filtering is a real server round-trip (SSR/ISR), not client-only state.
 */
export function CategoryFilter({
    categories,
    active,
    allLabel,
}: {
    categories: CategoryChip[];
    active?: string;
    allLabel: string;
}) {
    if (categories.length === 0) return null;

    const chip = (isActive: boolean) =>
        cn(
            'rounded-full border px-3 py-1 text-sm transition-colors',
            isActive
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
        );

    return (
        <div className="flex flex-wrap gap-2">
            <Link href="/blog" className={chip(!active)}>
                {allLabel}
            </Link>
            {categories.map(c => (
                <Link
                    key={c.slug}
                    href={`/blog?cat=${encodeURIComponent(c.slug)}`}
                    className={chip(active === c.slug)}
                >
                    {c.name}
                </Link>
            ))}
        </div>
    );
}
