// Scopes Tailwind + @tailwindcss/typography (.prose) to the /blog subtree. The
// rest of the public site is styled with CSS modules and does NOT load this
// sheet, so importing it here (as the admin does) keeps the two worlds isolated.
import '@/app/globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import type { Locale } from '@/config';

/**
 * Blog subtree layout. Provides the next-intl client context (the blog's
 * interactive pieces — header, TOC, progress bar — use `useTranslations`) and
 * fixes the blog to the site's dark palette via the `dark` class so shadcn
 * tokens and `prose-invert` resolve consistently.
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
            <div className="dark min-h-screen bg-background text-foreground">
                {props.children}
            </div>
        </NextIntlClientProvider>
    );
}
