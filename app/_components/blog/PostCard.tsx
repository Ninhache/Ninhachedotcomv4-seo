import { Clock } from 'lucide-react';
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
 * A single article teaser on the /blog list. Server component: the whole card is
 * a locale-aware link to the article. `readMinutesLabel` is passed in already
 * localized so this component stays translation-agnostic and presentational.
 */
export function PostCard({
    post,
    readMinutesLabel,
}: {
    post: PostCardData;
    readMinutesLabel: string;
}) {
    return (
        <Link
            href={`/blog/${post.slug}`}
            className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition-colors hover:border-primary/50"
        >
            <div className="aspect-[16/9] w-full overflow-hidden bg-muted">
                {post.coverUrl ? (
                    <img
                        src={post.coverUrl}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center text-4xl text-muted-foreground/30">
                        #
                    </div>
                )}
            </div>
            <div className="flex flex-1 flex-col gap-2 p-4">
                {post.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                        {post.categories.map(c => (
                            <span
                                key={c.slug}
                                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                            >
                                {c.name}
                            </span>
                        ))}
                    </div>
                )}
                <h2 className="text-lg font-semibold leading-tight text-foreground group-hover:text-primary">
                    {post.title}
                </h2>
                <p className="line-clamp-2 flex-1 text-sm text-muted-foreground">
                    {post.excerpt}
                </p>
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
