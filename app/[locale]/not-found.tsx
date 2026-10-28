import type { Metadata } from 'next';
import { getLocale, getMessages, getTranslations } from 'next-intl/server';
import { NotFoundView } from '@/components/breakout/NotFoundView';

export const metadata: Metadata = {
    title: '404',
    robots: { index: false },
};

export default async function LocaleNotFound() {
    const [locale, messages, t] = await Promise.all([
        getLocale(),
        getMessages(),
        getTranslations('fun.notFound'),
    ]);

    return (
        <NotFoundView
            locale={locale}
            messages={{ fun: messages.fun }}
            copy={{
                title: t('title'),
                text: t('text'),
                home: t('home'),
                blog: t('blog'),
            }}
        />
    );
}
