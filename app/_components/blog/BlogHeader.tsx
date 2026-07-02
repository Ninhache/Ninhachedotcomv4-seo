'use client';

import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { locales } from '@/config';
import { cn } from '@/lib/utils';
import { Link, usePathname } from '@/navigation';

/**
 * Lightweight, reading-focused header for the blog subtree. Distinct from the
 * home `Header` (anchor-based, single-page only):
 * - the logo is a HARD link back to the portfolio home — it crosses the
 *   CSS-modules ↔ Tailwind boundary, so a full load keeps both styled;
 * - an explicit, always-visible FR/EN toggle (the reused home LocaleSwitcher
 *   only revealed languages on hover, which was unusable here). Switching locale
 *   stays inside the blog, so it's a normal in-app navigation.
 */
export function BlogHeader() {
    const t = useTranslations('blog');
    const locale = useLocale();
    const pathname = usePathname();

    return (
        <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
            <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4">
                <a
                    href={`/${locale}`}
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
                </a>
                <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-foreground">
                        {t('title')}
                    </span>
                    <div className="flex items-center gap-1 rounded-full border border-border p-0.5">
                        {locales.map(loc => (
                            <Link
                                key={loc}
                                href={pathname}
                                locale={loc}
                                aria-current={
                                    loc === locale ? 'true' : undefined
                                }
                                className={cn(
                                    'rounded-full px-2.5 py-0.5 text-xs font-medium uppercase transition-colors',
                                    loc === locale
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:text-foreground'
                                )}
                            >
                                {loc}
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </header>
    );
}
