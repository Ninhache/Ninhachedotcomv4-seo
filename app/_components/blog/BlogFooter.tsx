'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { proximaNovaBold } from '@/app/fonts';
import { FunButtons } from '@/components/fun/FunButtons';
import { Link } from '@/navigation';

/**
 * Blog-subtree footer. Same content + blue bar as the shared home `Footer`, but
 * self-contained Tailwind layout: the shared footer relies on the global
 * `.section`/`.content` classes from `styles/globals.css`, which the blog (Tailwind
 * only) doesn't load — so reusing it there breaks its layout.
 */
export function BlogFooter() {
    const t = useTranslations('footer');
    const tLegal = useTranslations('legal');

    // Kept short on purpose: three links, the short labels, in the order
    // someone looks for them. The account page is here rather than in the nav
    // because it is where the erasure button lives, and a policy that names it
    // has to be one click away from every page.
    const legalLinks = [
        { href: '/legal/cgu', label: tLegal('cguShort') },
        { href: '/legal/mentions-legales', label: tLegal('mentions') },
        { href: '/legal/confidentialite', label: tLegal('privacyShort') },
        { href: '/compte', label: tLegal('account') },
    ];

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
                <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm">
                    {legalLinks.map(link => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className="opacity-80 underline underline-offset-4 transition-opacity hover:opacity-60"
                        >
                            {link.label}
                        </Link>
                    ))}
                </nav>
                <FunButtons />
            </div>
        </footer>
    );
}
