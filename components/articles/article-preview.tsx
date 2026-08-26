'use client';

import { Calendar, Clock } from 'lucide-react';
import readingTime from 'reading-time';
import { ralewaySemiBold } from '@/app/fonts';
import { mediaSrc } from '@/lib/baseurl';
import { useCompiledMdx } from '@/lib/markdown/use-compiled-mdx';

export type ArticlePreviewData = {
    title: string;
    coverUrl?: string;
    publishedAt?: Date;
    body: string;
    categories: string[];
};

/** "2 juillet 2026" — long, FR-first publication date for the preview. */
function formatDate(d?: Date): string {
    if (!d) return 'Brouillon';
    return new Intl.DateTimeFormat('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    }).format(d);
}

/**
 * Client-side preview of a blog article as readers will see it, the admin
 * counterpart to the public `app/[locale]/blog/[slug]/page.tsx`. The MDX body is
 * compiled in the browser by `useCompiledMdx`, the same hook the SEO score panel
 * measures its word counts on: preview and score can therefore never disagree
 * about what the article actually says.
 *
 * Differences from the published page: no Shiki highlighting (server-only), and
 * a compile error (bad JSX) is shown inline instead of crashing.
 */
export function ArticlePreview({ data }: { data: ArticlePreviewData }) {
    const minutes = Math.max(
        1,
        Math.ceil(readingTime(data.body || '').minutes)
    );

    const { rendered, error } = useCompiledMdx(data.body);

    return (
        <div className="dark rounded-lg border bg-[#0b1422] p-6 text-[#e8eef7]">
            {data.categories.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                    {data.categories.map(name => (
                        <span
                            key={name}
                            className="rounded-full bg-[#56dcfc]/15 px-2.5 py-0.5 text-xs font-medium text-[#56dcfc]"
                        >
                            {name}
                        </span>
                    ))}
                </div>
            )}

            <h1
                className={`text-3xl font-bold leading-tight tracking-tight ${ralewaySemiBold.className}`}
            >
                {data.title || 'Titre de l’article'}
            </h1>

            <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-[#8ea3c0]">
                <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {formatDate(data.publishedAt)}
                </span>
                <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {minutes} min de lecture
                </span>
            </div>

            {data.coverUrl && (
                <img
                    src={mediaSrc(data.coverUrl)}
                    alt=""
                    className="mt-6 aspect-[16/9] w-full rounded-xl object-cover"
                />
            )}

            {error ? (
                <div className="mt-8 rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
                    <p className="font-semibold">Erreur de compilation MDX</p>
                    <pre className="mt-2 whitespace-pre-wrap text-xs">
                        {error}
                    </pre>
                </div>
            ) : rendered ? (
                <div className="prose prose-invert mt-8 max-w-none">
                    {rendered}
                </div>
            ) : (
                <p className="mt-8 text-sm text-[#8ea3c0]">
                    Le corps de l’article s’affichera ici.
                </p>
            )}
        </div>
    );
}
