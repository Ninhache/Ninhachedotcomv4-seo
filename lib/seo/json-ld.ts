import type {
    Blog,
    BlogPosting,
    BreadcrumbList,
    CollectionPage,
    Graph,
    ItemList,
    Person,
    ProfilePage,
    Thing,
    WebSite,
} from 'schema-dts';
import type { Locale } from '@/config';
import { mediaSrc } from '@/lib/baseurl';
import type {
    ArticleDTO,
    ArticleTranslationDTO,
    ContactDTO,
    ProfileDTO,
    ProjectDTO,
    SkillCategoryDTO,
} from '@/lib/types';
import { absoluteUrl, BCP47, FALLBACK_COPY, localePath, SITE } from './site';

/**
 * Schema.org builders for the site's structured data.
 *
 * Everything is derived from content that already exists in the backend — no
 * SEO-only fields were added to the data model. That has one hard consequence:
 * a property is emitted only when the data genuinely supports it. Inventing
 * structured data that the page does not show is what gets a site's rich
 * results dropped, so `worksFor`, `alumniOf` and friends are deliberately
 * absent rather than guessed at.
 *
 * Stable `@id`s let every page reference the same Person and WebSite nodes
 * instead of restating them, which is what makes the graph joinable.
 */

export const PERSON_ID = `${absoluteUrl('/')}#person`;
export const WEBSITE_ID = `${absoluteUrl('/')}#website`;

/** Wraps a set of nodes into the single `@graph` script a page emits. */
export function graph(nodes: Thing[]): Graph {
    return {
        '@context': 'https://schema.org',
        '@graph': nodes,
    };
}

/**
 * `Profile.profession` is written for the hero, where it reads as a sentence
 * ("Je suis ingénieur logiciel !", "I'm a Software Engineer !"). As a job title
 * in a `<title>` tag or a schema.org `jobTitle` it has to lose the first person
 * and the exclamation mark, hence this normalisation rather than a new column.
 */
function asJobTitle(profession: string): string {
    const stripped = profession
        .replace(
            /^\s*(?:je\s+suis\s+(?:une?\s+)?|i(?:'m|\s+am)\s+(?:an?\s+)?)/i,
            ''
        )
        .replace(/\s*[!.]+\s*$/, '')
        .trim();
    if (!stripped) return profession.trim();
    return stripped.charAt(0).toUpperCase() + stripped.slice(1);
}

/**
 * Turns the "Who am I?" paragraph into a meta description.
 *
 * It is the only long-form self-description in the data model, so it is the
 * best available source — but it is written for the page: it carries the
 * `<projects>` link marker the public site renders as an anchor, blank lines,
 * and an opening greeting that would waste the characters a search result
 * actually shows. Alias `@@` tokens are already resolved by the backend.
 */
function asDescription(introduction: string, max = 300): string {
    const flat = introduction
        .replace(/<\/?projects>/gi, '')
        .replace(/^\s*(?:hello|hey|hi|salut|bonjour|coucou)\s*!+\s*/i, '')
        .replace(/\s+/g, ' ')
        .trim();
    if (flat.length <= max) return flat;

    const cut = flat.slice(0, max);
    const sentenceEnd = Math.max(
        cut.lastIndexOf('. '),
        cut.lastIndexOf('! '),
        cut.lastIndexOf('? ')
    );
    if (sentenceEnd > max * 0.5) return cut.slice(0, sentenceEnd + 1);
    const wordEnd = cut.lastIndexOf(' ');
    return `${(wordEnd > 0 ? cut.slice(0, wordEnd) : cut).trim()}…`;
}

const profileCopy = (profile: ProfileDTO | null, locale: Locale) => {
    const tr = profile?.translations.find(t => t.locale === locale);
    const profession = tr?.profession?.trim();
    const introduction = tr?.introduction?.trim();
    return {
        name: profile?.name?.trim() || SITE.name,
        jobTitle: profession
            ? asJobTitle(profession)
            : FALLBACK_COPY[locale].jobTitle,
        description:
            (introduction && asDescription(introduction)) ||
            tr?.description?.trim() ||
            FALLBACK_COPY[locale].description,
        /** The hero one-liner, kept verbatim for the OG card's subtitle. */
        tagline: tr?.description?.trim() ?? '',
        image: profile?.imageUrl ? mediaSrc(profile.imageUrl) : SITE.image,
    };
};

/** Public copy for a page title/description, shared by metadata and JSON-LD. */
export function profileIdentity(profile: ProfileDTO | null, locale: Locale) {
    return profileCopy(profile, locale);
}

/**
 * The Person node.
 *
 * `sameAs` comes from the contact links. `Contact` has no platform column, so
 * the only reliable filter is the URL scheme: `mailto:` entries are addresses,
 * not profiles, and schema.org expects profile URLs here.
 */
export function personJsonLd(
    profile: ProfileDTO | null,
    contacts: ContactDTO[],
    categories: SkillCategoryDTO[],
    locale: Locale
): Person {
    const copy = profileCopy(profile, locale);

    const sameAs = contacts
        .filter(c => c.isVisible && /^https?:\/\//i.test(c.contactUrl))
        .map(c => c.contactUrl);

    const knowsAbout = categories
        .filter(c => c.isVisible)
        .flatMap(c => c.skills)
        .filter(s => s.isVisible)
        .map(
            s =>
                s.translations.find(t => t.locale === locale)?.name ??
                s.translations[0]?.name
        )
        .filter((name): name is string => Boolean(name));

    // The backend stores "Almeida Néo" while the site brands itself
    // "Néo Almeida". Declaring the other order as an alternateName is what tells
    // an entity resolver these are one person, not two.
    const alternateName = copy.name === SITE.name ? undefined : SITE.name;

    return {
        '@type': 'Person',
        '@id': PERSON_ID,
        name: copy.name,
        ...(alternateName ? { alternateName } : {}),
        url: absoluteUrl(localePath(locale)),
        jobTitle: copy.jobTitle,
        description: copy.description,
        image: absoluteUrl(copy.image),
        ...(sameAs.length ? { sameAs } : {}),
        ...(knowsAbout.length ? { knowsAbout: [...new Set(knowsAbout)] } : {}),
    };
}

/**
 * The WebSite node.
 *
 * No `potentialAction`/`SearchAction`: the site has no search endpoint, and
 * declaring one that does not exist is a fabrication Google penalises.
 */
export function websiteJsonLd(
    profile: ProfileDTO | null,
    locale: Locale
): WebSite {
    const copy = profileCopy(profile, locale);
    return {
        '@type': 'WebSite',
        '@id': WEBSITE_ID,
        url: absoluteUrl(localePath(locale)),
        name: SITE.siteName,
        description: copy.description,
        inLanguage: BCP47[locale],
        publisher: { '@id': PERSON_ID },
    };
}

/** The home page: a profile page whose main entity is the Person. */
export function profilePageJsonLd(
    profile: ProfileDTO | null,
    locale: Locale
): ProfilePage {
    const copy = profileCopy(profile, locale);
    const url = absoluteUrl(localePath(locale));
    return {
        '@type': 'ProfilePage',
        '@id': `${url}#profilepage`,
        url,
        name: `${copy.name} · ${copy.jobTitle}`,
        description: copy.description,
        inLanguage: BCP47[locale],
        isPartOf: { '@id': WEBSITE_ID },
        about: { '@id': PERSON_ID },
        mainEntity: { '@id': PERSON_ID },
        ...(profile?.updatedAt ? { dateModified: profile.updatedAt } : {}),
    };
}

/**
 * The projects shown on the home page, as an ordered list of CreativeWork.
 *
 * Legitimate because these projects are visibly rendered on that same page;
 * the list only makes machine-readable what a reader already sees.
 */
export function projectListJsonLd(
    projects: ProjectDTO[],
    locale: Locale
): ItemList {
    return {
        '@type': 'ItemList',
        '@id': `${absoluteUrl(localePath(locale))}#projects`,
        itemListElement: projects.map((project, index) => {
            const tr =
                project.translations.find(t => t.locale === locale) ??
                project.translations[0];
            const url = project.visitUrl || project.playUrl || project.gitUrl;
            return {
                '@type': 'ListItem' as const,
                position: index + 1,
                item: {
                    '@type': 'CreativeWork' as const,
                    name: tr?.name ?? '',
                    ...(tr?.description ? { description: tr.description } : {}),
                    ...(url ? { url } : {}),
                    ...(project.gitUrl
                        ? { codeRepository: project.gitUrl }
                        : {}),
                    ...(project.logoUrl
                        ? { image: absoluteUrl(mediaSrc(project.logoUrl)) }
                        : {}),
                    ...(project.startDate
                        ? { dateCreated: project.startDate }
                        : {}),
                    author: { '@id': PERSON_ID },
                },
            };
        }),
    };
}

/** The blog index. `blogPost` references the postings by URL, not by copy. */
export function blogJsonLd(
    articles: ArticleDTO[],
    locale: Locale,
    title: string,
    description: string
): Blog {
    const url = absoluteUrl(localePath(locale, '/blog'));
    return {
        '@type': 'Blog',
        '@id': `${url}#blog`,
        url,
        name: title,
        description,
        inLanguage: BCP47[locale],
        isPartOf: { '@id': WEBSITE_ID },
        author: { '@id': PERSON_ID },
        publisher: { '@id': PERSON_ID },
        blogPost: articles.map(article => ({
            '@type': 'BlogPosting' as const,
            '@id': `${absoluteUrl(localePath(locale, `/blog/${article.slug}`))}#article`,
        })),
    };
}

/**
 * One category view (`/blog/c/<slug>`): a subset of the blog, not a rival blog.
 *
 * Modelled as a `CollectionPage` that `isPartOf` the `Blog` node rather than a
 * second `Blog`, so the graph keeps one blog with many views instead of
 * claiming the site publishes several. The postings are referenced by `@id`,
 * exactly like the index does.
 */
export function articleCollectionJsonLd(args: {
    articles: ArticleDTO[];
    locale: Locale;
    /** Path without the locale segment, e.g. `/blog/c/dev`. */
    path: string;
    name: string;
    description: string;
}): CollectionPage {
    const { articles, locale, path, name, description } = args;
    const url = absoluteUrl(localePath(locale, path));
    return {
        '@type': 'CollectionPage',
        '@id': `${url}#collection`,
        url,
        name,
        description,
        inLanguage: BCP47[locale],
        isPartOf: { '@id': `${absoluteUrl(localePath(locale, '/blog'))}#blog` },
        mainEntity: {
            '@type': 'ItemList',
            itemListElement: articles.map((article, index) => ({
                '@type': 'ListItem' as const,
                position: index + 1,
                item: {
                    '@id': `${absoluteUrl(localePath(locale, `/blog/${article.slug}`))}#article`,
                },
            })),
        },
    };
}

/** A single article. Dates come straight from the backend columns. */
export function blogPostingJsonLd(args: {
    article: ArticleDTO;
    translation: ArticleTranslationDTO;
    locale: Locale;
    /** Minutes, from `reading-time` — rendered on the page too. */
    readingMinutes: number;
    wordCount: number;
}): BlogPosting {
    const { article, translation, locale, readingMinutes, wordCount } = args;
    const url = absoluteUrl(localePath(locale, `/blog/${article.slug}`));
    const section = article.categories?.[0];
    const sectionName =
        section?.translations.find(t => t.locale === locale)?.name ??
        section?.translations[0]?.name;

    return {
        '@type': 'BlogPosting',
        '@id': `${url}#article`,
        url,
        mainEntityOfPage: url,
        headline: translation.title,
        description: translation.excerpt,
        inLanguage: BCP47[locale],
        author: { '@id': PERSON_ID },
        publisher: { '@id': PERSON_ID },
        isPartOf: { '@id': `${absoluteUrl(localePath(locale, '/blog'))}#blog` },
        datePublished: article.publishedAt ?? article.createdAt,
        dateModified: article.updatedAt,
        ...(article.coverImageUrl
            ? { image: absoluteUrl(mediaSrc(article.coverImageUrl)) }
            : {}),
        ...(article.tags.length ? { keywords: article.tags } : {}),
        ...(sectionName ? { articleSection: sectionName } : {}),
        wordCount,
        // ISO 8601 duration, the only format schema.org accepts here.
        timeRequired: `PT${Math.max(1, readingMinutes)}M`,
    };
}

/** Trail of `{ name, path }` (path without the locale segment). */
export function breadcrumbJsonLd(
    items: { name: string; path: string }[],
    locale: Locale
): BreadcrumbList {
    return {
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
            '@type': 'ListItem' as const,
            position: index + 1,
            name: item.name,
            item: absoluteUrl(localePath(locale, item.path)),
        })),
    };
}
