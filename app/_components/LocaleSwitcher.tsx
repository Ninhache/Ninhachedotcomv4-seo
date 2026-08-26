'use client';

import Image from 'next/image';
import { useLocale } from 'next-intl';
import { Locale, locales } from '@/config';
import type { ArticleSlugs } from '@/lib/blog';
import { usePathname, useRouter } from '@/navigation';
import styles from '@/styles/localeSwitcher.module.css';

/** `/blog/<slug>`, the one path whose segment is not the same in both locales. */
const ARTICLE_PATH = /^\/blog\/([^/]+)$/;

export default function LocaleSwitcher({
    localeNames,
    articleSlugs,
}: {
    localeNames: Record<Locale, string>;
    /**
     * Every article's slug per locale, passed down on the blog subtree only.
     * Article slugs are localised, so replaying the current path under another
     * locale would land on a slug that does not exist there. The article page
     * would still redirect to the right one, but that is a wasted round trip on
     * a click the reader is watching.
     */
    articleSlugs?: ArticleSlugs[];
}) {
    const locale = useLocale() as Locale;
    const router = useRouter();
    const pathname = usePathname();

    /** The current path as it is spelled in `loc`. */
    const pathIn = (loc: Locale): string => {
        const slug = ARTICLE_PATH.exec(pathname)?.[1];
        if (!slug || !articleSlugs) return pathname;
        const article = articleSlugs.find(slugs =>
            locales.some(l => slugs[l] === slug)
        );
        return article ? `/blog/${article[loc]}` : pathname;
    };

    const switchLocale = (loc: Locale) => {
        router.replace(pathIn(loc), { locale: loc });
    };

    return (
        <div
            className={styles.container}
            style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                paddingLeft: 12,
                paddingRight: 12,
            }}
        >
            <div className={styles.content}>
                <div className={styles.label}>
                    <Image
                        src={`/images/translations/${locale}.jpg`}
                        width={35}
                        height={20}
                        alt={locale}
                        style={{ width: '35px', height: '20px' }}
                    />
                    <p>{localeNames[locale]}</p>
                </div>

                {locales
                    .filter(loc => loc !== locale)
                    .map((loc, index) => (
                        <div
                            key={loc}
                            className={styles.langList}
                            onClick={() => switchLocale(loc)}
                        >
                            <Image
                                src={`/images/translations/${loc}.jpg`}
                                width={35}
                                height={20}
                                alt={loc}
                                style={{ width: '35px', height: '20px' }}
                            />
                            <p className={styles.langItem}>
                                {localeNames[loc]}
                            </p>
                        </div>
                    ))}
            </div>
        </div>
    );
}
