'use client';

import throttle from 'lodash.throttle'; // lodash throttle function
import dynamic from 'next/dynamic';
import Image from 'next/image';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import AnimatedComponent from '@/app/_components/AnimatedComponent';
import useLocaleNames from '@/app/_hooks/useLocaleNames';
import { ralewaySemiBold } from '@/app/fonts';
import styles from '@/styles/header.module.css';
import LocaleSwitcher from '../LocaleSwitcher';

const HeaderItem = dynamic(() => import('./headerItem'), { ssr: true });

interface menuItemObject {
    name: string;
    anchor: string;
}

export default function Header() {
    const t = useTranslations('header');
    const locale = useLocale();
    const localeNames = useLocaleNames();

    const menuItems: menuItemObject[] = [
        {
            name: t('home'),
            anchor: t('homeAnchor'),
        },
        {
            name: t('about'),
            anchor: t('aboutAnchor'),
        },
        {
            name: t('projects'),
            anchor: t('projectsAnchor'),
        },
        {
            name: t('skills'),
            anchor: t('skillsAnchor'),
        },
        {
            name: t('experience'),
            anchor: t('experienceAnchor'),
        },
    ];

    // Mobile slide-out menu state. Desktop-vs-hamburger visibility is handled in
    // CSS (@media in header.module.css) so there is no pre-hydration flash.
    const [menuOpen, setMenuOpen] = useState(false);
    const openMobileMenu = () => setMenuOpen(true);
    const closeMobileMenu = () => setMenuOpen(false);

    // Lock body scroll while the panel is open, and close it on Escape.
    useEffect(() => {
        if (!menuOpen) return;
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setMenuOpen(false);
        };
        window.addEventListener('keydown', onKeyDown);
        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [menuOpen]);

    const [isVisible, setIsVisible] = useState(true);
    const [isTop, setIsTop] = useState(true);
    const lastScrollY = useRef(0);

    useEffect(() => {
        const controlHeader = throttle(() => {
            if (typeof window !== 'undefined') {
                const currentScrollY = window.scrollY;
                setIsVisible(
                    currentScrollY <= lastScrollY.current ||
                        currentScrollY <= 50
                );
                lastScrollY.current = currentScrollY;
                setIsTop(currentScrollY <= 50);
            }
        }, 100);

        if (typeof window !== 'undefined') {
            window.addEventListener('scroll', controlHeader);
            return () => {
                controlHeader.cancel();
                window.removeEventListener('scroll', controlHeader);
            };
        }
    }, []);

    const headerStyle = {
        transition: 'all 0.5s ease-in-out',
        transform: isVisible ? 'translateY(0)' : 'translateY(-100%)',
        backgroundColor: isTop ? 'transparent' : 'var(--fade_dark_blue)',
        backdropFilter: isTop ? 'unset' : 'blur(8px)',
        boxShadow: isTop ? 'unset' : 'rgba(0, 0, 0, 0.8) 0px 5px 20px',
        height: '100px',
    };

    const calculateDelay = (index: number) => index * 100;

    return (
        <>
            <div
                className={`${styles.content} ${ralewaySemiBold.className}`}
                style={headerStyle}
            >
                <header id="header" className={`${styles.header}`}>
                    <nav className={styles.nav}>
                        <div className={styles.logo}>
                            <Link
                                href="https://ninhache.fr/"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Image
                                    src="/svg/Logo.svg"
                                    alt="logo"
                                    width={190}
                                    height={35}
                                    priority
                                />
                            </Link>
                        </div>
                        <AnimatedComponent delay={100}>
                            <div className={styles.menu}>
                                <ol>
                                    {menuItems.map((item, index) => (
                                        <li key={`${item.name}-${item.anchor}`}>
                                            <HeaderItem
                                                name={item.name}
                                                anchor={item.anchor}
                                                delay={calculateDelay(index)}
                                            />
                                        </li>
                                    ))}
                                    <li>
                                        {/* Wrapped like HeaderItem so "Blog"
                                            fades in with the same staggered
                                            animation as the other nav items
                                            (delay continues the sequence). */}
                                        <AnimatedComponent
                                            delay={calculateDelay(
                                                menuItems.length
                                            )}
                                        >
                                            {/* Hard nav: crosses the CSS-modules
                                                site → Tailwind blog boundary, so
                                                a full load guarantees the blog's
                                                stylesheet is applied. */}
                                            <a
                                                className={styles.not_button}
                                                href={`/${locale}/blog`}
                                            >
                                                {t('blog')}
                                            </a>
                                        </AnimatedComponent>
                                    </li>
                                    <li>
                                        <a
                                            className={`button ${styles.button}`}
                                            href={`/${locale}#${t('contactAnchor')}`}
                                        >
                                            <p>{t('contact')}</p>
                                            <svg
                                                role="button"
                                                aria-label="Open header"
                                                className={`button_arrow ${styles.button_arrow}`}
                                                xmlns="http://www.w3.org/2000/svg"
                                                viewBox="0 0 17.69 17.39"
                                            >
                                                <g>
                                                    <path
                                                        className="path_1"
                                                        d="M8.9 12.4 L8.9 12.4"
                                                    />
                                                    <path
                                                        className="path_2"
                                                        d="M16.2 5 8.9 12.4 1.5 5"
                                                    />
                                                </g>
                                            </svg>
                                        </a>
                                    </li>
                                    <li>
                                        <LocaleSwitcher
                                            localeNames={localeNames}
                                        />
                                    </li>
                                </ol>
                            </div>
                        </AnimatedComponent>

                        <button
                            type="button"
                            className={styles.hamburger_button}
                            aria-label="Open menu"
                            aria-expanded={menuOpen}
                            onClick={openMobileMenu}
                        >
                            <svg
                                className={`${styles.hamburger_icon}`}
                                viewBox="0 0 140 100"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <line x1="10" y1="10" x2="130" y2="10" />
                                <line x1="30" y1="50" x2="130" y2="50" />
                                <line x1="50" y1="90" x2="130" y2="90" />
                            </svg>
                        </button>
                    </nav>
                </header>
            </div>

            {menuOpen && (
                <div
                    className={styles.backdrop}
                    onClick={closeMobileMenu}
                    aria-hidden="true"
                />
            )}

            <div
                id="menu_div"
                className={`${styles.menu_div} ${menuOpen ? styles.menuOpen : styles.menuClosed} ${ralewaySemiBold.className}`}
            >
                <svg
                    role="button"
                    aria-label="close header"
                    onClick={closeMobileMenu}
                    className={`${styles.menu_icon}`}
                    viewBox="0 0 100 100"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <line x1="10" y1="10" x2="90" y2="90" />
                    <line x1="10" y1="90" x2="90" y2="10" />
                </svg>
                <div className={`${styles.menu}`}>
                    <ol>
                        {menuItems.map((item, index) => (
                            <li key={`${item.name}-${item.anchor}`}>
                                <HeaderItem
                                    key={item.name}
                                    name={item.name}
                                    anchor={item.anchor}
                                    delay={calculateDelay(index)}
                                    onClick={closeMobileMenu}
                                />
                            </li>
                        ))}
                        <li>
                            <AnimatedComponent
                                delay={calculateDelay(menuItems.length)}
                            >
                                <a
                                    className={styles.not_button}
                                    href={`/${locale}/blog`}
                                    onClick={closeMobileMenu}
                                >
                                    {t('blog')}
                                </a>
                            </AnimatedComponent>
                        </li>
                        <li>
                            <a
                                className={`button ${styles.button} `}
                                href={`/${locale}#${t('contactAnchor')}`}
                                onClick={closeMobileMenu}
                            >
                                <p>{t('contact')}</p>
                                <svg
                                    className={`button_arrow ${styles.button_arrow}`}
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 17.69 17.39"
                                >
                                    <g>
                                        <path
                                            className="path_1"
                                            d="M8.9 12.4 L8.9 12.4"
                                        />
                                        <path
                                            className="path_2"
                                            d="M16.2 5 8.9 12.4 1.5 5"
                                        />
                                    </g>
                                </svg>
                            </a>
                        </li>
                        <li>
                            <LocaleSwitcher localeNames={localeNames} />
                        </li>
                    </ol>
                </div>
            </div>
        </>
    );
}
