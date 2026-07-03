'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { proximaNovaBold } from '@/app/fonts';

/**
 * Blog-subtree footer. Same content + blue bar as the shared home `Footer`, but
 * self-contained Tailwind layout: the shared footer relies on the global
 * `.section`/`.content` classes from `styles/globals.css`, which the blog (Tailwind
 * only) doesn't load — so reusing it there breaks its layout.
 */
export function BlogFooter() {
    const t = useTranslations('footer');

    return (
        <footer
            className={`mt-24 bg-[#197dff] text-white ${proximaNovaBold.className}`}
        >
            <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 px-4 py-16">
                <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
                    <a
                        href="https://github.com/Ninhache/Ninhachedotv4/blob/main/LICENSE"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 opacity-90 transition-opacity hover:opacity-60"
                    >
                        <span className="whitespace-nowrap">
                            © 2025 Almeida Neo
                        </span>
                        <Image
                            src="/svg/License.svg"
                            alt=""
                            width={20}
                            height={20}
                        />
                        <span className="whitespace-nowrap">MIT license</span>
                    </a>
                    <a
                        href="https://github.com/Ninhache/Ninhachedotcomv4-seo"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 opacity-90 transition-opacity hover:opacity-60"
                    >
                        <span>{t('github')}</span>
                        <Image
                            src="/svg/Github.svg"
                            alt=""
                            width={20}
                            height={20}
                        />
                    </a>
                </div>
                <p className="max-w-lg text-center leading-relaxed">
                    {t('text')}
                </p>
            </div>
        </footer>
    );
}
