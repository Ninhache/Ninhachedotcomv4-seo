import { ralewaySemiBold } from '@/app/fonts';
import { Link } from '@/navigation';

export type CategoryChip = { slug: string; name: string };

// Match the portfolio's project-sort chips (styles/projects/project.module.css
// `.choice` / `.selected`): a 2px cyan pill, transparent → filled-cyan when
// active. Inline styles (not Tailwind arbitrary values) so it renders reliably.
const CYAN = '#56dcfc';
const DARK_PURPLE = 'rgb(41, 41, 85)';

/**
 * Category filter chips for /blog, styled like the portfolio's project filter.
 * No "all" chip: everything shows by default (no active chip). Clicking a chip
 * restricts to that category; clicking the active chip clears the filter. Each
 * chip is a locale-aware link, so filtering is a real server round-trip.
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
        <div
            className={ralewaySemiBold.className}
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 16,
            }}
        >
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
                        style={{
                            fontSize: 15,
                            lineHeight: 1,
                            borderRadius: 100,
                            padding: '9px 18px',
                            border: `2px solid ${CYAN}`,
                            transition: 'background-color 0.2s ease-in-out',
                            textDecoration: 'none',
                            color: isActive ? DARK_PURPLE : CYAN,
                            backgroundColor: isActive ? CYAN : 'transparent',
                        }}
                    >
                        {c.name}
                    </Link>
                );
            })}
        </div>
    );
}
