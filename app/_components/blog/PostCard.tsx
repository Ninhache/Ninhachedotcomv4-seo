import { Clock } from 'lucide-react';
import { ralewaySemiBold } from '@/app/fonts';
import { cn } from '@/lib/utils';
import { Link } from '@/navigation';

export type PostCardData = {
    slug: string;
    title: string;
    excerpt: string;
    dateLabel: string;
    readingMinutes: number;
    coverUrl: string | null;
    categories: { slug: string; name: string }[];
};

/**
 * A single article teaser, styled for the bento grid: the whole card is a
 * locale-aware link that fills its grid cell (`h-full`). Content overlays a
 * cover image (or a navy gradient fallback) so cards of different sizes stay
 * visually consistent. `featured` enlarges the title and reveals the excerpt.
 */
export function PostCard({
    post,
    readMinutesLabel,
    featured = false,
}: {
    post: PostCardData;
    readMinutesLabel: string;
    featured?: boolean;
}) {
    return (
        <Link
            href={`/blog/${post.slug}`}
            className="group relative flex h-full min-h-[13rem] flex-col justify-end overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:border-primary/40"
        >
            {post.coverUrl ? (
                <img
                    src={post.coverUrl}
                    alt=""
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-cover opacity-60 transition duration-500 group-hover:scale-105 group-hover:opacity-75"
                />
            ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-secondary via-card to-background" />
            )}
            {/* Legibility gradient so text stays readable over any cover. */}
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-transparent" />

            <div className="relative z-10 flex flex-col gap-2 p-5">
                {post.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {post.categories.map(c => (
                            <span
                                key={c.slug}
                                className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary"
                            >
                                {c.name}
                            </span>
                        ))}
                    </div>
                )}
                <h2
                    className={cn(
                        'font-semibold leading-tight text-foreground transition-colors group-hover:text-primary',
                        ralewaySemiBold.className,
                        featured ? 'text-2xl sm:text-3xl' : 'text-lg'
                    )}
                >
                    {post.title}
                </h2>
                {featured && post.excerpt && (
                    <p className="line-clamp-2 max-w-xl text-sm text-muted-foreground">
                        {post.excerpt}
                    </p>
                )}
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    {post.dateLabel && <span>{post.dateLabel}</span>}
                    <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readingMinutes} {readMinutesLabel}
                    </span>
                </div>
            </div>
        </Link>
    );
}
