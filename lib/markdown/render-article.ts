import 'server-only';

import readingTime from 'reading-time';
import rehypeAutolinkHeadings from 'rehype-autolink-headings';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';
import rehypeStringify from 'rehype-stringify';
import remarkDirective from 'remark-directive';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import { remarkCallouts } from './remark-callouts';

/** A heading entry for the table of contents. Depth is 2 (h2) or 3 (h3). */
export type TocItem = { id: string; text: string; depth: 2 | 3 };

export type RenderedArticle = {
    /** Sanitized-by-construction HTML (author-authored Markdown → hast → string). */
    html: string;
    /** h2/h3 headings, in document order, for the sticky table of contents. */
    toc: TocItem[];
    /** Whole-minutes reading estimate (>= 1). */
    readingMinutes: number;
    /** Word count of the source, exposed for callers that want raw stats. */
    words: number;
};

/** Flatten a hast element's descendant text nodes into a plain string. */
function textOf(node: any): string {
    if (node.type === 'text') return node.value ?? '';
    if (Array.isArray(node.children)) return node.children.map(textOf).join('');
    return '';
}

/**
 * rehype plugin collecting h2/h3 headings (with the ids `rehype-slug` assigned)
 * into `sink`, in document order. MUST run AFTER `rehype-slug` so the ids it
 * records are byte-identical to the ones rendered into the HTML anchors.
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

// Shiki theme used at build/ISR time. The blog renders on a dark surface, so a
// single dark theme keeps code blocks legible without a client theme toggle.
const CODE_THEME = 'github-dark';

/**
 * Render an article's Markdown body to HTML on the server (build/ISR time only —
 * this module is `server-only`, so none of the `unified`/`remark`/`rehype`/Shiki
 * chain ever reaches the client bundle). Returns the HTML plus a table of
 * contents and a reading-time estimate derived from the same source.
 *
 * Pipeline: GFM + `:::` callouts → hast → heading slugs → autolinked headings →
 * TOC capture → Shiki syntax highlighting → HTML string.
 *
 * @param markdown raw Markdown source (GitHub-flavored + directive callouts)
 */
export async function renderArticle(
    markdown: string
): Promise<RenderedArticle> {
    const toc: TocItem[] = [];
    const stats = readingTime(markdown ?? '');

    const file = await unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkDirective)
        .use(remarkCallouts)
        .use(remarkRehype)
        .use(rehypeSlug)
        .use(rehypeAutolinkHeadings, { behavior: 'wrap' })
        .use(rehypeCollectToc, toc)
        .use(rehypePrettyCode, { theme: CODE_THEME, keepBackground: true })
        .use(rehypeStringify)
        .process(markdown ?? '');

    return {
        html: String(file),
        toc,
        readingMinutes: Math.max(1, Math.ceil(stats.minutes)),
        words: stats.words,
    };
}
