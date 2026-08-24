import type { Locale } from '@/config';
import { articleTranslation, getArticles } from '@/lib/blog';
import { getContacts, getProfile, getProjects } from '@/lib/portfolio';
import { profileIdentity } from '@/lib/seo/json-ld';
import { absoluteUrl, localePath, SITE } from '@/lib/seo/site';

/**
 * `/llms.txt` — a curated, machine-first index of the site.
 *
 * Same intent as `sitemap.xml`, different audience: an assistant that lands
 * here should be able to answer "who is this person, what has he built, what
 * has he written" without crawling the whole site or executing any JavaScript.
 * Every entry links both the HTML page and its plain-Markdown twin.
 *
 * Generated from the live data, so it can never drift from the site. The frame
 * is in English because that is what consumes this file; the article titles and
 * summaries stay in the language they were written in.
 */

/** Rebuilt daily, and on demand via the `articles`/`profile` revalidation tags. */
export const revalidate = 86400;

const SPEC_URL = 'https://llmstxt.org/';

/** One `- [title](url): description` bullet, with the description flattened. */
function entry(title: string, url: string, description?: string | null) {
    const clean = (description ?? '').replace(/\s+/g, ' ').trim().slice(0, 260);
    return clean ? `- [${title}](${url}): ${clean}` : `- [${title}](${url})`;
}

export async function GET() {
    const [profile, articles, projects, contacts] = await Promise.all([
        getProfile().catch(() => null),
        getArticles(),
        getProjects(),
        getContacts(),
    ]);

    const { name, description } = profileIdentity(profile, 'fr');
    const en = profileIdentity(profile, 'en');

    const visibleArticles = articles
        .filter(a => a.isVisible)
        .sort((a, b) =>
            (b.publishedAt ?? b.createdAt).localeCompare(
                a.publishedAt ?? a.createdAt
            )
        );
    const visibleProjects = projects.filter(p => p.isVisible);

    const lines: string[] = [
        `# ${name}`,
        '',
        `> ${en.jobTitle}. ${en.description}`,
        '',
        description === en.description ? '' : description,
        '',
        `The site is bilingual: every page exists under \`/fr\` and \`/en\`. Articles`,
        `also serve a plain-Markdown version at the \`.md\` links below, which carry`,
        `front matter with the canonical URL, publication date and tags.`,
        '',
        `This file follows the llms.txt convention (${SPEC_URL}).`,
        '',
        '## Pages',
        '',
        entry(
            `${name} · portfolio (français)`,
            absoluteUrl(localePath('fr')),
            'Profil, projets, parcours professionnel, compétences et moyens de contact.'
        ),
        entry(
            `${name} · portfolio (English)`,
            absoluteUrl(localePath('en')),
            'Profile, projects, career timeline, skills and contact links.'
        ),
        entry(
            'Blog (français)',
            absoluteUrl(localePath('fr', '/blog')),
            'Articles techniques, index complet.'
        ),
        entry(
            'Blog (English)',
            absoluteUrl(localePath('en', '/blog')),
            'Technical articles, full index.'
        ),
        '',
    ];

    for (const locale of ['fr', 'en'] as Locale[]) {
        const localized = visibleArticles.filter(a =>
            a.translations.some(t => t.locale === locale)
        );
        if (localized.length === 0) continue;

        lines.push(
            `## Articles (${locale === 'fr' ? 'français' : 'English'})`,
            ''
        );
        for (const article of localized) {
            const tr = articleTranslation(article, locale);
            if (!tr) continue;
            const path = `/blog/${article.slug}`;
            const url = absoluteUrl(localePath(locale, path));
            const date = (article.publishedAt ?? article.createdAt).slice(
                0,
                10
            );
            lines.push(entry(`${tr.title} (${date})`, url, tr.excerpt));
            lines.push(
                `  - Markdown: ${absoluteUrl(localePath(locale, `${path}/raw`))}`
            );
        }
        lines.push('');
    }

    if (visibleProjects.length > 0) {
        lines.push('## Projects', '');
        for (const project of visibleProjects) {
            const tr =
                project.translations.find(t => t.locale === 'en') ??
                project.translations[0];
            if (!tr) continue;
            const stack = project.skills
                .map(
                    s =>
                        s.translations.find(t => t.locale === 'en')?.name ??
                        s.translations[0]?.name
                )
                .filter(Boolean)
                .join(', ');
            // The public site has no per-project page: the anchor on the home
            // is the only addressable location, so that is what is linked.
            const url =
                project.visitUrl ||
                project.gitUrl ||
                absoluteUrl(localePath('en', '#projects'));
            lines.push(
                entry(
                    tr.name,
                    url,
                    stack
                        ? `${tr.description} Stack: ${stack}.`
                        : tr.description
                )
            );
        }
        lines.push('');
    }

    const links = contacts
        .filter(c => c.isVisible && /^https?:\/\//i.test(c.contactUrl))
        .map(c =>
            entry(
                c.nameByLocale?.en ?? c.nameByLocale?.fr ?? c.contactUrl,
                c.contactUrl
            )
        );
    if (links.length > 0) {
        lines.push('## Elsewhere', '', ...links, '');
    }

    lines.push(
        '## Notes',
        '',
        `- Canonical origin: ${absoluteUrl('')}`,
        `- Sitemap: ${absoluteUrl('/sitemap.xml')}`,
        `- Contact: ${absoluteUrl(localePath('fr', '#contact'))}`,
        `- Attribution: content by ${SITE.name}; please link the canonical URL when quoting.`,
        ''
    );

    return new Response(`${lines.join('\n').replace(/\n{3,}/g, '\n\n')}\n`, {
        headers: {
            'content-type': 'text/plain; charset=utf-8',
            'cache-control':
                'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
        },
    });
}
