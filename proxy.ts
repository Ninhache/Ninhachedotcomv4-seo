import { type NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const handleI18n = createMiddleware(routing);

/** The `text/markdown` twins of an article: `/fr/blog/slug/raw` and `/fr/blog/slug.md`. */
const MARKDOWN_TWIN = /^\/(?:en|fr)\/blog\/[^/]+(?:\/raw|\.md)$/;

/** The blog index, whose `?cat=` filter is now a segment of its own. */
const BLOG_INDEX = /^\/(?:en|fr)\/blog$/;

/** A category slug, checked before it is spliced into a path. */
const SLUG = /^[\w-]+$/;

export default function proxy(request: NextRequest) {
    const { pathname, searchParams } = request.nextUrl;

    // `/blog?cat=<slug>` was how the index filtered before each category became
    // a real segment. Crawlers followed those chips for months, so the old
    // address moves rather than 404s. This lives here and not in
    // `next.config.js` because a config redirect forwards the query string to
    // its destination: the visitor would land on `/blog/c/dev?cat=dev`, which
    // is the stale URL wearing the new one's clothes.
    const cat = searchParams.get('cat');
    if (cat && BLOG_INDEX.test(pathname)) {
        const target = request.nextUrl.clone();
        // Anything that is not slug-shaped goes to the unfiltered index; it
        // never reached a real category anyway, and it has no business being
        // spliced into a path.
        target.pathname = SLUG.test(cat) ? `${pathname}/c/${cat}` : pathname;
        target.search = '';
        return NextResponse.redirect(target, 308);
    }

    const response = handleI18n(request);

    // next-intl stamps its own hreflang `Link` header on every response it
    // handles, which silently overwrites the `rel="canonical"` the raw route
    // sets. Those responses are not HTML, so a header is the only place their
    // canonical can live, and it matters more there than alternates do: the
    // twin must point back at the article rather than compete with it.
    if (MARKDOWN_TWIN.test(request.nextUrl.pathname)) {
        response.headers.delete('link');
    }

    return response;
}

export const config = {
    matcher: [
        // Enable a redirect to a matching locale at the root
        '/',

        // Set a cookie to remember the previous locale for
        // all requests that have a locale prefix
        '/(en|fr)/:path*',

        // Enable redirects that add missing locales
        // (e.g. `/pathnames` -> `/en/pathnames`)
        '/((?!_next|_vercel|api|admin|.*\\..*).*)',
    ],
};
