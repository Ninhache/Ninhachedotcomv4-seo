// Scopes Tailwind + @tailwindcss/typography (.prose) to the /blog subtree. The
// rest of the public site is styled with CSS modules and does NOT load this
// sheet, so importing it here (as the admin does) keeps the two worlds isolated.
import '@/app/globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import type { CSSProperties } from 'react';
import Footer from '@/app/_components/footer';
import Header from '@/app/_components/header/header';
import { calibreRegular } from '@/app/fonts';
import type { Locale } from '@/config';

// Reskin the shadcn tokens to the portfolio's art direction (deep navy + cyan/
// blue accents). Every `bg-card` / `text-primary` / `border-border` in the blog
// then retints to match ninhache.fr, without touching each className.
const PORTFOLIO_THEME = {
    '--background': '#0b1422',
    '--foreground': '#e8eef7',
    '--card': '#101d30',
    '--card-foreground': '#e8eef7',
    '--popover': '#101d30',
    '--popover-foreground': '#e8eef7',
    '--primary': '#56dcfc',
    '--primary-foreground': '#08111d',
    '--secondary': '#16243a',
    '--secondary-foreground': '#e8eef7',
    '--muted': '#16243a',
    '--muted-foreground': '#8ea3c0',
    '--accent': '#197dff',
    '--accent-foreground': '#ffffff',
    '--border': 'rgba(86, 220, 252, 0.14)',
    '--input': 'rgba(86, 220, 252, 0.14)',
    '--ring': '#56dcfc',
} as CSSProperties;

/**
 * Blog subtree layout. Provides the next-intl client context (the blog's
 * interactive pieces — header, TOC, progress bar — use `useTranslations`),
 * applies the portfolio's body font, and reskins the shadcn tokens to the
 * portfolio's navy/cyan palette so the blog shares the site's art direction.
 */
export default async function BlogLayout(props: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await props.params;
    setRequestLocale(locale as Locale);
    const messages = await getMessages();

    return (
        <NextIntlClientProvider locale={locale} messages={messages}>
            <div
                className={`dark flex min-h-screen flex-col bg-background text-foreground ${calibreRegular.className}`}
                style={PORTFOLIO_THEME}
            >
                {/* Header + Footer live in the layout so they're a single shared
                    instance across blog navigation (list ↔ article), instead of
                    re-mounting per page. */}
                <Header />
                <div className="flex-1">{props.children}</div>
                <Footer />
            </div>
        </NextIntlClientProvider>
    );
}
