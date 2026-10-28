import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import {
    getMessages,
    getTranslations,
    setRequestLocale,
} from 'next-intl/server';
import { Honeypot } from '@/components/fun/Honeypot';
import styles from '@/components/fun/honeypot.module.css';

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
    const { locale } = await props.params;
    const t = await getTranslations({ locale, namespace: 'fun.honeypot' });
    return {
        title: { absolute: `${t('title')} ‹ ninhache.fr` },
        robots: { index: false, follow: false },
    };
}

/**
 * The `/wp-admin` honeypot, also served at `/<locale>/admin`. The real
 * back-office is the root `/admin` app, which this never touches.
 */
export default async function HoneypotPage(props: Props) {
    const { locale } = await props.params;
    setRequestLocale(locale);
    const messages = await getMessages();
    return (
        <NextIntlClientProvider
            locale={locale}
            messages={{ fun: messages.fun }}
        >
            <main className={styles.page}>
                <Honeypot locale={locale} />
            </main>
        </NextIntlClientProvider>
    );
}
