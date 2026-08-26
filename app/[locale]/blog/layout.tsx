import '@/app/globals.css';
import { setRequestLocale } from 'next-intl/server';
import { PortfolioShell } from '@/app/_components/shell/PortfolioShell';
import type { Locale } from '@/config';
import { articleSlugMap, getArticles } from '@/lib/blog';

/**
 * Blog subtree layout: the shared portfolio shell, plus the per-locale slug
 * table the locale switcher needs to point at the same article in the other
 * language. The list is already ISR-cached under the `articles` tag, so reading
 * it here costs nothing extra.
 */
export default async function BlogLayout(props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await props.params;
    setRequestLocale(locale as Locale);
    const articles = await getArticles();

    return (
        <PortfolioShell locale={locale} articleSlugs={articleSlugMap(articles)}>
            {props.children}
        </PortfolioShell>
    );
}
