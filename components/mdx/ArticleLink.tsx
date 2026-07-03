import { ArrowRight, BookOpen } from 'lucide-react';
import type { ReactNode } from 'react';
import { ralewaySemiBold } from '@/app/fonts';

/**
 * MDX `<ArticleLink>` — a prominent, card-style cross-link to another blog
 * article, bigger than an inline link. `slug` is the target article's slug (a
 * sibling of the current one, so a relative href keeps the same locale);
 * `title` is the headline to show (or children); `label` is the small kicker
 * (default "Article lié"). Hard `<a>` navigation, consistent with the rest of
 * the blog (which crosses the CSS-modules <-> Tailwind boundary).
 */
export function ArticleLink({
    slug,
    title,
    label = 'Article lié',
    children,
}: {
    slug: string;
    title?: string;
    label?: string;
    children?: ReactNode;
}) {
    return (
        <a
            href={slug}
            className="group not-prose my-6 flex items-center gap-4 rounded-2xl border border-border bg-card p-4 no-underline transition-colors hover:border-primary/40"
        >
            <BookOpen className="h-6 w-6 shrink-0 text-primary" aria-hidden />
            <span className="min-w-0 flex-1">
                <span
                    className={`block text-xs uppercase tracking-wide text-primary ${ralewaySemiBold.className}`}
                >
                    {label}
                </span>
                <span
                    className={`block text-foreground text-lg leading-snug ${ralewaySemiBold.className}`}
                >
                    {title ?? children}
                </span>
            </span>
            <ArrowRight
                className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary"
                aria-hidden
            />
        </a>
    );
}
