import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { JsonLd } from '@/app/_components/seo/JsonLd';
import { calibreSemibold } from '@/app/fonts';
import { FunRoot } from '@/components/fun/FunRoot';
import { type Locale, locales } from '@/config';
import { getContacts, getProfile, getSkillCategories } from '@/lib/portfolio';
import {
    graph,
    personJsonLd,
    profileIdentity,
    websiteJsonLd,
} from '@/lib/seo/json-ld';
import { pageMetadata } from '@/lib/seo/metadata';
import { ogImagePath } from '@/lib/seo/og';
import { siteUrl, TITLE_TEMPLATE } from '@/lib/seo/site';

/**
 * Defaults for every public page.
 *
 * Title and description are read from the back-office `Profile` rather than
 * written here, so the site's own description is content, editable without a
 * deploy (the `profile` tag is already busted by the backend's revalidation
 * webhook). `profileIdentity` falls back to real copy when the API is down —
 * `fetchPublic` never throws, it returns a fallback, and a placeholder here is
 * precisely what used to leak into every share preview.
 */
export async function generateMetadata(props: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await props.params;
    if (!locales.includes(locale as Locale)) return {};
    const loc = locale as Locale;

    const profile = await getProfile();
    const { name, jobTitle, description } = profileIdentity(profile, loc);
    const defaultTitle = `${name} · ${jobTitle}`;

    return {
        ...pageMetadata({
            locale: loc,
            title: defaultTitle,
            description,
            absoluteTitle: true,
            image: ogImagePath('home', loc),
        }),
        // Resolves relative URLs in any metadata that does not go through
        // `pageMetadata` (which emits absolute URLs of its own).
        metadataBase: new URL(siteUrl),
        // `default` covers segments with no metadata of their own; `template`
        // decorates the ones that set a plain string title.
        title: { default: defaultTitle, template: TITLE_TEMPLATE },
    };
}

export function generateStaticParams() {
    return locales.map(locale => ({ locale }));
}

export default async function RootLayout(props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const params = await props.params;
    const { locale } = params;
    const typedLocale = locale as Locale;
    const { children } = props;
    if (locales.includes(typedLocale) === false) {
        return notFound();
    }
    setRequestLocale(typedLocale);

    // Site-wide structured data. Rendered here so the Person and WebSite nodes
    // exist on every public page, letting each page's own graph reference them
    // by `@id` instead of restating them.
    const [profile, contacts, categories, messages] = await Promise.all([
        getProfile(),
        getContacts(),
        getSkillCategories(),
        getMessages(),
    ]);

    return (
        <html lang={typedLocale}>
            <body
                // The font every control labels itself with, published once
                // for the whole public site. It is a variable rather than a
                // class because the primitives in `components/ui` are shared
                // with the back-office, which runs its own root layout, its
                // own fonts, and must keep them: a button reads this variable
                // when there is one and inherits when there is not.
                style={
                    {
                        '--font-ui': calibreSemibold.style.fontFamily,
                    } as React.CSSProperties
                }
            >
                <JsonLd
                    data={graph([
                        websiteJsonLd(profile, typedLocale),
                        personJsonLd(
                            profile,
                            contacts,
                            categories,
                            typedLocale
                        ),
                    ])}
                />
                {children}
                <FunRoot
                    locale={typedLocale}
                    messages={{ fun: messages.fun }}
                />
            </body>
        </html>
    );
}
