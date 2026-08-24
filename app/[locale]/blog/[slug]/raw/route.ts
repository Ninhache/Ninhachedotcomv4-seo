import { type Locale, locales } from '@/config';
import { articleTranslation, getArticleBySlug } from '@/lib/blog';
import { toPlainMarkdown } from '@/lib/markdown/to-plain-markdown';
import { absoluteUrl, localePath } from '@/lib/seo/site';

/**
 * Plain-Markdown twin of an article page.
 *
 * The retrieval crawlers behind AI answers (GPTBot, ClaudeBot, OAI-SearchBot,
 * PerplexityBot) do not execute JavaScript and have to reconstruct the prose
 * from HTML. Serving the source directly removes that step entirely: the same
 * text, with an explicit front-matter header giving the canonical URL so an
 * excerpt can still be attributed back to the page.
 *
 * Advertised from three places: `alternates.types['text/markdown']` on the
 * article page, `llms.txt`, and the `/:locale/blog/:slug.md` rewrite.
 */

/** Same window as the article page it mirrors, and busted by the same tag. */
export const revalidate = 86400;

/** YAML front matter, so a reader knows what it is looking at and where it lives. */
function frontMatter(fields: Record<string, string | undefined>): string {
    const lines = Object.entries(fields)
        .filter(([, value]) => value)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`);
    return `---\n${lines.join('\n')}\n---`;
}

export async function GET(
    _request: Request,
    context: { params: Promise<{ locale: string; slug: string }> }
) {
    const { locale, slug } = await context.params;
    if (!(locales as readonly string[]).includes(locale)) {
        return new Response('Not found', { status: 404 });
    }
    const loc = locale as Locale;

    // The public endpoint only serves visible articles, so a draft 404s here
    // exactly as it does on the page. It also strips `previewToken`.
    const article = await getArticleBySlug(slug);
    const tr = article ? articleTranslation(article, loc) : undefined;
    if (!article || !tr) {
        return new Response('Not found', { status: 404 });
    }

    const canonical = absoluteUrl(localePath(loc, `/blog/${article.slug}`));
    const header = frontMatter({
        title: tr.title,
        description: tr.excerpt ?? undefined,
        date: article.publishedAt ?? article.createdAt,
        updated: article.updatedAt,
        locale: loc,
        canonical,
        author: 'Néo Almeida',
        tags: article.tags.length > 0 ? article.tags.join(', ') : undefined,
        categories:
            article.categories && article.categories.length > 0
                ? article.categories.map(c => c.slug).join(', ')
                : undefined,
    });

    const body = `${header}\n\n# ${tr.title}\n\n${toPlainMarkdown(tr.body ?? '', loc)}\n`;

    return new Response(body, {
        headers: {
            'content-type': 'text/markdown; charset=utf-8',
            'cache-control':
                'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
            // The page is the indexable surface; this is the same text in
            // another format and must not compete with it in search results.
            link: `<${canonical}>; rel="canonical"`,
            'x-robots-tag': 'noindex',
        },
    });
}
