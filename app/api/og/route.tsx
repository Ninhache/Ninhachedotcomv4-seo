import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import { type Locale, locales } from '@/config';
import {
    articleTranslation,
    categoryName,
    formatArticleDate,
    getArticleBySlug,
} from '@/lib/blog';
import { getProfile } from '@/lib/portfolio';
import { profileIdentity } from '@/lib/seo/json-ld';
import { isOgKind, OG_SIZE } from '@/lib/seo/og';
import { SITE, siteUrl } from '@/lib/seo/site';

/**
 * Social card generator: one endpoint, three templates.
 *
 * Deliberately a route handler rather than the `opengraph-image.tsx` file
 * convention — a single implementation serves the home, the blog index and
 * every article, and `pageMetadata` points both `og:image` and `twitter:image`
 * at it, so the two tags can never drift apart.
 *
 * Security: `kind` is a closed set and every string rendered here is resolved
 * server-side (from the profile, the translations, or the article the slug
 * names). Nothing from the query string reaches the canvas — otherwise this
 * would be an arbitrary-image generator on the site's own domain.
 */

// Satori parses TTF/OTF, never WOFF2. Read from the repo rather than importing
// through next/font: `localFont` yields CSS, not the raw bytes Satori needs.
const FONT_DIR = join(process.cwd(), 'fonts');

const BRAND = {
    navy: '#101d30',
    navyDeep: '#0b1524',
    cyan: '#56dcfc',
    blue: '#197dff',
    white: '#f6f9fc',
    gray: '#8ea9bf',
} as const;

/** A day, matching the article ISR window: the card only changes when the page does. */
export const revalidate = 86400;

type Card = {
    kicker: string;
    title: string;
    subtitle: string;
    /** Bottom-right slot. Empty when the card has no date to show: the
     *  bottom-left already prints the host, and repeating it looked like a bug. */
    stamp: string;
};

async function loadFonts() {
    const [title, body] = await Promise.all([
        readFile(join(FONT_DIR, 'proxima_nova', 'ProximaNovaBold.otf')),
        readFile(join(FONT_DIR, 'raleway', 'Raleway-SemiBold.ttf')),
    ]);
    return [
        {
            name: 'Title',
            data: title,
            weight: 700 as const,
            style: 'normal' as const,
        },
        {
            name: 'Body',
            data: body,
            weight: 600 as const,
            style: 'normal' as const,
        },
    ];
}

/** Resolve the card's copy from the database/translations — never from the query. */
async function resolveCard(
    kind: 'home' | 'blog' | 'article',
    locale: Locale,
    slug: string | null
): Promise<Card> {
    if (kind === 'article' && slug) {
        const article = await getArticleBySlug(slug);
        const tr = article ? articleTranslation(article, locale) : undefined;
        if (article && tr) {
            const category = article.categories?.[0];
            return {
                kicker: category ? categoryName(category, locale) : 'Article',
                title: tr.title,
                subtitle: tr.excerpt ?? '',
                stamp: formatArticleDate(
                    article.publishedAt ?? article.createdAt,
                    locale
                ),
            };
        }
        // Unknown or unpublished slug: fall through to the generic card rather
        // than 500, so a stale share link still gets a valid image.
    }

    const profile = await getProfile().catch(() => null);
    const { name, jobTitle, description, tagline } = profileIdentity(
        profile,
        locale
    );

    if (kind === 'blog') {
        const t = await getTranslations({ locale, namespace: 'blog' });
        return {
            kicker: name,
            title: t('title'),
            subtitle: t('intro'),
            stamp: '',
        };
    }

    return {
        kicker: jobTitle,
        title: name,
        // The hero one-liner rather than the full meta description: the card
        // clamps the subtitle to two lines, and a 300-character paragraph would
        // be cut mid-sentence.
        subtitle: tagline || description,
        stamp: '',
    };
}

/** Long headlines shrink instead of overflowing; the clamp below catches the rest. */
function titleSize(title: string): number {
    if (title.length > 78) return 54;
    if (title.length > 52) return 64;
    if (title.length > 32) return 76;
    return 88;
}

export async function GET(request: Request) {
    const params = new URL(request.url).searchParams;
    const kind = params.get('kind');
    const rawLocale = params.get('locale');

    if (!isOgKind(kind)) {
        return new Response('Unknown card kind', { status: 400 });
    }
    const locale = (locales as readonly string[]).includes(rawLocale ?? '')
        ? (rawLocale as Locale)
        : 'fr';

    const [card, fonts] = await Promise.all([
        resolveCard(kind, locale, params.get('slug')),
        loadFonts(),
    ]);

    return new ImageResponse(
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                padding: '72px 80px',
                backgroundColor: BRAND.navy,
                backgroundImage: `radial-gradient(circle at 88% 8%, ${BRAND.blue}33 0%, ${BRAND.navyDeep}00 55%)`,
                fontFamily: 'Body',
                position: 'relative',
            }}
        >
            {/* Brand rule: the cyan→blue accent used across the site. */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: 12,
                    backgroundImage: `linear-gradient(90deg, ${BRAND.cyan} 0%, ${BRAND.blue} 100%)`,
                }}
            />

            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 64,
                        height: 64,
                        borderRadius: 20,
                        border: `3px solid ${BRAND.cyan}`,
                        color: BRAND.cyan,
                        fontFamily: 'Title',
                        fontSize: 36,
                    }}
                >
                    N
                </div>
                <div
                    style={{
                        display: 'flex',
                        color: BRAND.gray,
                        fontSize: 28,
                        letterSpacing: 1.5,
                        textTransform: 'uppercase',
                    }}
                >
                    {card.kicker || SITE.name}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div
                    style={{
                        display: '-webkit-box',
                        WebkitBoxOrient: 'vertical',
                        WebkitLineClamp: 3,
                        overflow: 'hidden',
                        color: BRAND.white,
                        fontFamily: 'Title',
                        fontSize: titleSize(card.title),
                        lineHeight: 1.1,
                        letterSpacing: -1,
                    }}
                >
                    {card.title}
                </div>
                {card.subtitle ? (
                    <div
                        style={{
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: 2,
                            overflow: 'hidden',
                            color: BRAND.gray,
                            fontSize: 30,
                            lineHeight: 1.4,
                        }}
                    >
                        {card.subtitle}
                    </div>
                ) : null}
            </div>

            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: `2px solid ${BRAND.cyan}33`,
                    paddingTop: 28,
                    color: BRAND.gray,
                    fontSize: 26,
                }}
            >
                <div style={{ display: 'flex', color: BRAND.cyan }}>
                    {siteUrl.replace(/^https?:\/\//, '')}
                </div>
                {card.stamp ? (
                    <div style={{ display: 'flex' }}>{card.stamp}</div>
                ) : null}
            </div>
        </div>,
        {
            ...OG_SIZE,
            fonts,
            headers: {
                'cache-control':
                    'public, max-age=0, s-maxage=86400, stale-while-revalidate=604800',
            },
        }
    );
}
