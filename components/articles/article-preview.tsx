'use client';

import { Calendar, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import readingTime from 'reading-time';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import { ralewaySemiBold } from '@/app/fonts';
import { mediaSrc } from '@/lib/baseurl';
import { remarkCallouts } from '@/lib/markdown/remark-callouts';

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
 * Client-side preview of a blog article as readers will see it — the admin
 * counterpart to the public `app/[locale]/blog/[slug]/page.tsx`. Reuses the same
 * `prose prose-invert` typography + `.callout` styles from globals.css.
 *
 * NOTE: the public page renders Markdown server-side with Shiki syntax
 * highlighting (`lib/markdown/render-article.ts` is `server-only`). Here we use
 * `react-markdown` on the client, so GFM + `:::` callouts render but code blocks
 * are plain (unhighlighted) — the published article will have Shiki.
 */
export function ArticlePreview({ data }: { data: ArticlePreviewData }) {
    const minutes = Math.max(
        1,
        Math.ceil(readingTime(data.body || '').minutes)
    );

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

            {data.body.trim() ? (
                {/* No `prose-pre:bg-transparent` here (unlike the public page):
                    that page relies on Shiki painting the code background, but
                    this client preview has no Shiki — so we keep prose's default
                    dark code-block styling instead of a transparent (broken) one. */}
                <div className="prose prose-invert mt-8 max-w-none">
                    <ReactMarkdown
                        remarkPlugins={[
                            remarkGfm,
                            remarkDirective,
                            remarkCallouts,
                        ]}
                    >
                        {data.body}
                    </ReactMarkdown>
                </div>
            ) : (
                <p className="mt-8 text-sm text-[#8ea3c0]">
                    Le corps de l’article s’affichera ici.
                </p>
            )}
        </div>
    );
}
