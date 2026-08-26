import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import type { ReactNode } from 'react';
import { BlogFooter } from '@/app/_components/blog/BlogFooter';
import Header from '@/app/_components/header/header';
import { PORTFOLIO_THEME } from '@/app/_components/shell/portfolio-theme';
import { calibreRegular } from '@/app/fonts';
import type { ArticleSlugs } from '@/lib/blog';

/**
 * The frame every page outside the one-page portfolio renders inside: next-intl
 * client context, the portfolio body font, the reskinned tokens, the header and
 * the footer.
 *
 * Extracted from the blog layout because the legal pages and the account page
 * need exactly the same frame. Keeping three copies of the token table would
 * mean a colour change landing on two pages out of three.
 *
 * `articleSlugs` is only meaningful under `/blog`: the locale switcher lives in
 * the header, a sibling of the page, so it cannot ask the page for the slug of
 * the article in the other language. Elsewhere the URL is the same in both
 * languages and the list is left empty.
 */
export async function PortfolioShell({
    locale,
    articleSlugs,
    children,
}: {
    locale: string;
    articleSlugs?: ArticleSlugs[];
    children: ReactNode;
}) {
    const messages = await getMessages();

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <div
                className={`dark flex min-h-screen flex-col bg-background text-foreground ${calibreRegular.className}`}
                style={PORTFOLIO_THEME}
            >
                <Header articleSlugs={articleSlugs} />
                <div className="flex-1">{children}</div>
                <BlogFooter />
            </div>
        </NextIntlClientProvider>
    );
}
