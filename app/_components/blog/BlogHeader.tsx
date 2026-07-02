'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import useLocaleNames from '@/app/_hooks/useLocaleNames';
import { Link } from '@/navigation';
import LocaleSwitcher from '../LocaleSwitcher';

/**
 * Lightweight, reading-focused header for the blog subtree. Distinct from the
 * home `Header` (which is anchor-based and only works on the single-page home):
 * this one is a real cross-route bar — logo links back to the portfolio home,
 * plus the locale switcher. Kept minimal so it doesn't compete with the article.
 */
export function BlogHeader() {
    const t = useTranslations('blog');
    const localeNames = useLocaleNames();

    return (
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
                <Link
                    href="/"
                    className="flex items-center gap-3 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                    <Image
                        src="/svg/Logo.svg"
                        alt="ninhache.fr"
                        width={130}
                        height={24}
                        priority
                    />
                    <span className="hidden sm:inline">← {t('backHome')}</span>
                </Link>
                <div className="flex items-center gap-4">
                    <span className="text-sm font-semibold text-foreground">
                        {t('title')}
                    </span>
                    <LocaleSwitcher localeNames={localeNames} />
                </div>
            </div>
        </header>
    );
}
