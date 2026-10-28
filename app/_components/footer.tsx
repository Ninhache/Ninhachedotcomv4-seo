import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { proximaNovaBold } from '@/app/fonts';
import { FunButtons } from '@/components/fun/FunButtons';
import styles from '@/styles/footer.module.css';

export default function Footer() {
    const t = useTranslations('footer');
    const tLegal = useTranslations('legal');
    const locale = useLocale();

    // Hard navigations, like the header's "Blog" link: these pages live in the
    // Tailwind subtree and a client-side transition out of the CSS-modules
    // site would render them before their stylesheet applies.
    const legalLinks = [
        { href: `/${locale}/legal/cgu`, label: tLegal('cguShort') },
        {
            href: `/${locale}/legal/mentions-legales`,
            label: tLegal('mentions'),
        },
        {
            href: `/${locale}/legal/confidentialite`,
            label: tLegal('privacyShort'),
        },
        { href: `/${locale}/compte`, label: tLegal('account') },
    ];

    return (
        <footer
            className={`section ${styles.footer_section} ${proximaNovaBold.className}`}
        >
            <div className={`content ${styles.content}`}>
                <div className={`${styles.footer_content}`}>
                    <Link
                        className={styles.footer_licence}
                        href="https://github.com/Ninhache/Ninhachedotv4/blob/main/LICENSE"
                        target="_blank"
                    >
                        <span>© 2025 Almeida Neo</span>
                        <Image
                            src={`svg/License.svg`}
                            alt="license link"
                            width={`20`}
                            height={`20`}
                            style={{ width: '20px', height: '20px' }}
                        />
                        <span>MIT license</span>
                    </Link>
                    <Link
                        href="https://github.com/Ninhache/Ninhachedotcomv4-seo"
                        target="_blank"
                    >
                        <span>{t('github')}</span>
                        <Image
                            src={`svg/Github.svg`}
                            alt="github link"
                            width={`20`}
                            height={`20`}
                            style={{ width: '20px', height: '20px' }}
                        />
                    </Link>
                </div>
                <div className={`${styles.footer_content}`}>
                    <p>{t('text')}</p>
                </div>
                <div
                    className={`${styles.footer_content} ${styles.footer_legal}`}
                >
                    {legalLinks.map(link => (
                        <a key={link.href} href={link.href}>
                            {link.label}
                        </a>
                    ))}
                </div>
                <div
                    className={`${styles.footer_content} ${styles.footer_legal}`}
                >
                    <FunButtons />
                </div>
            </div>
        </footer>
    );
}
