import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { AccountView } from '@/app/_components/account/AccountView';
import { ReaderSessionProvider } from '@/app/_components/blog/reader-session';
import { ralewaySemiBold } from '@/app/fonts';
import type { Locale } from '@/config';
import { pageMetadata } from '@/lib/seo/metadata';

type Props = {
    params: Promise<{ locale: string }>;
};

export async function generateMetadata(props: Props): Promise<Metadata> {
    const { locale } = await props.params;
    const loc = locale as Locale;
    const t = await getTranslations({ locale: loc, namespace: 'account' });

    return pageMetadata({
        locale: loc,
        path: '/compte',
        title: t('title'),
        description: t('intro'),
        // Nothing here means anything to a crawler: the page is empty until a
        // reader session resolves, and what it then shows belongs to one person.
        robots: { index: false, follow: true },
    });
}

/**
 * Where a reader exercises their rights over their own data, without asking
 * anyone: see what is stored, rename themselves, download a copy, delete the
 * account.
 *
 * The page itself is static; everything on it comes from the reader cookie,
 * read client-side, which is also why it can never be cached with someone's
 * data in it.
 */
export default async function AccountPage(props: Props) {
    const { locale } = await props.params;
    const loc = locale as Locale;
    setRequestLocale(loc);
    const t = await getTranslations({ locale: loc, namespace: 'account' });

    return (
        <main className="mx-auto w-full max-w-3xl px-4 py-16 sm:py-24">
            <h1
                className={`text-3xl text-foreground sm:text-4xl ${ralewaySemiBold.className}`}
            >
                {t('title')}
            </h1>
            <p className="mt-3 text-muted-foreground">{t('intro')}</p>
            <div className="mt-10">
                <ReaderSessionProvider>
                    <AccountView />
                </ReaderSessionProvider>
            </div>
        </main>
    );
}
