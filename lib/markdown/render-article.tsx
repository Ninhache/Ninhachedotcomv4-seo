import 'server-only';

import { compile, run } from '@mdx-js/mdx';
import {
    transformerNotationDiff,
    transformerNotationFocus,
    transformerNotationHighlight,
    transformerNotationWordHighlight,
} from '@shikijs/transformers';
import type { ReactNode } from 'react';
import * as runtime from 'react/jsx-runtime';
import readingTime from 'reading-time';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import { visit } from 'unist-util-visit';
import { mdxComponents } from '@/components/mdx/mdx-components';
import { remarkCallouts } from './remark-callouts';
import { remarkStripImports } from './remark-strip-imports';

/** A heading entry for the table of contents. Depth is 2 (h2) or 3 (h3). */
export type TocItem = { id: string; text: string; depth: 2 | 3 };

export type RenderedArticle = {
    /** The compiled MDX as a ready-to-render React node (components already bound). */
    Content: ReactNode;
    /** h2/h3 headings, in document order, for the sticky table of contents. */
    toc: TocItem[];
    /** Whole-minutes reading estimate (>= 1). */
    readingMinutes: number;
    /** Word count of the source. */
    words: number;
    /** Set when MDX compilation failed (Content is then an inline error block). */
    error?: string;
};

/** Flatten a hast element's descendant text nodes into a plain string. */
function textOf(node: any): string {
    if (node.type === 'text') return node.value ?? '';
    if (Array.isArray(node.children)) return node.children.map(textOf).join('');
    return '';
}

/**
 * rehype plugin collecting h2/h3 headings (with the ids `rehype-slug` assigned)
 * into `sink`, in document order. MUST run AFTER `rehype-slug`.
 */
function rehypeCollectToc(sink: TocItem[]) {
    return (tree: unknown) => {
        visit(tree as any, 'element', (node: any) => {
            const depth =
                node.tagName === 'h2' ? 2 : node.tagName === 'h3' ? 3 : 0;
            if (depth === 0) return;
            const id = node.properties?.id;
            if (!id) return;
            const text = textOf(node).trim();
            if (text)
                sink.push({ id: String(id), text, depth: depth as 2 | 3 });
        });
    };
}

// Shiki theme used at build/ISR time (server-only). The blog is dark, so a
// single dark theme keeps code legible without a client toggle.
const CODE_THEME = 'github-dark';

/**
 * Compile an article's **MDX** body to a React node on the server (build/ISR
 * time only - `server-only`, so the MDX compiler + Shiki never reach the client
 * bundle). Articles may reference the curated components in
 * `components/mdx/mdx-components.tsx` (`<Callout>`, `<Figure>`, `<Chart>`);
 * imports are stripped so only those are available. `:::` directive callouts
 * still work alongside the JSX.
 *
 * Returns the rendered node plus a TOC and reading-time from the same source.
 * On a compile error (bad JSX), `Content` is an inline error block instead of a
 * thrown 500.
 */
export async function renderArticle(mdx: string): Promise<RenderedArticle> {
    const toc: TocItem[] = [];
    const stats = readingTime(mdx ?? '');
    const readingMinutes = Math.max(1, Math.ceil(stats.minutes));

    try {
        const compiled = await compile(mdx ?? '', {
            outputFormat: 'function-body',
            remarkPlugins: [
                remarkStripImports,
                remarkGfm,
                remarkDirective,
                remarkCallouts,
            ],
            rehypePlugins: [
                rehypeSlug,
                [rehypeAutolinkHeadings, { behavior: 'wrap' }],
                [rehypeCollectToc, toc],
                [
                    rehypePrettyCode,
                    {
                        theme: CODE_THEME,
                        keepBackground: true,
                        // Enable inline notation in code fences:
                        //   // [!code highlight]  // [!code ++] / [!code --]
                        //   // [!code focus]       // [!code word:foo]
                        transformers: [
                            transformerNotationHighlight(),
                            transformerNotationDiff(),
                            transformerNotationFocus(),
                            transformerNotationWordHighlight(),
                        ],
                    },
                ],
            ],
        });

        const { default: MDXContent } = await run(String(compiled), {
            ...runtime,
            baseUrl: import.meta.url,
        });

        return {
            Content: <MDXContent components={mdxComponents} />,
            toc,
            readingMinutes,
            words: stats.words,
        };
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return {
            Content: (
                <div className="not-prose rounded-lg border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-300">
                    <p className="font-semibold">Erreur de compilation MDX</p>
                    <pre className="mt-2 whitespace-pre-wrap text-xs">
                        {message}
                    </pre>
                </div>
            ),
            toc: [],
            readingMinutes,
            words: stats.words,
            error: message,
        };
    }
}
