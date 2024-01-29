
"use client"

import AnimatedComponent from '@/app/_components/AnimatedComponent';
import { ralewaySemiBold } from '@/app/fonts';
import styles from '@/styles/header.module.css';
import { useEffect, useRef, useState } from 'react';

import useLocaleNames from '@/app/_hooks/useLocaleNames';
import useMobileView from '@/app/_hooks/useMobileView';
import { Locale } from '@/config';
import throttle from 'lodash.throttle'; // lodash throttle function
import { useLocale, useTranslations } from 'next-intl';
import LocaleSwitcher from '../LocaleSwitcher';
import Image from 'next/image';

export default function Header() {
	const locale = useLocale() as Locale;
	const t = useTranslations("header");
	const localeNames = useLocaleNames();

	const menuItems = [`${t('home')}`, t('about'), t('projects'), t('skills'), t('experience')];

	const isMobile = useMobileView();
	const menuDivRef = useRef<HTMLDivElement>(null);

	const openMobileMenu = () => {
		if (menuDivRef.current) {
			menuDivRef.current.style.transform = "translateX(0px)";
			menuDivRef.current.style.boxShadow = "-10px 0px 30px rgba(0, 0, 0, 0.7)";
		}
	};

	const closeMobileMenu = () => {
		if (menuDivRef.current) {
			menuDivRef.current.style.transform = "translateX(clamp(0px, 100%, 400px))";
			menuDivRef.current.style.boxShadow = "none";
		}
	};

	const [isVisible, setIsVisible] = useState(true);
	const [isTop, setIsTop] = useState(true);
	const lastScrollY = useRef(0);

	const controlHeader = throttle(() => {
		if (typeof window !== 'undefined') {
			const currentScrollY = window.scrollY;
			setIsVisible(currentScrollY <= lastScrollY.current || currentScrollY <= 50);
			lastScrollY.current = currentScrollY;
			setIsTop(currentScrollY <= 50);
		}
	}, 100);

	useEffect(() => {
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
		height: '100px'
	};

	const calculateDelay = (index: number) => index * 100;

	return (
		<>
			<div className={`${styles.content} ${ralewaySemiBold.className}`} style={headerStyle}>
				<header id="header" className={`${styles.header}`}>
					<nav className={styles.nav}>
						<div className={styles.logo}>
							<a href="https://ninhache.fr/" target="_blank" rel="noopener noreferrer">
								<img src="/svg/Logo.svg" alt="logo" width={190} height={35} />
							</a>
						</div>
						{
							!isMobile && (<AnimatedComponent delay={100}>
								<div className={styles.menu}>
									<ol>
										{menuItems.map((item, index) => (
											<HeaderItem key={item} name={item} delay={calculateDelay(index)} />
										))}
										<li>
											<a className={`button ${styles.button}`} href={`#contact`}>
												<p>{t('contact')}</p>
												<svg role='button' aria-label='open header' className={`button_arrow ${styles.button_arrow}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17.69 17.39">
													<g>
														<path className="path_1" d="M8.9 12.4 L8.9 12.4" />
														<path className="path_2" d="M16.2 5 8.9 12.4 1.5 5" />
													</g>
												</svg>
											</a>
										</li>
										<LocaleSwitcher localeNames={localeNames} />
									</ol>
								</div>
							</AnimatedComponent>)
						}

						{
							isMobile && (
								<svg onClick={openMobileMenu} className={`${styles.hamburger_icon}`} viewBox="0 0 140 100" xmlns="http://www.w3.org/2000/svg">
									<line x1="10" y1="10" x2="130" y2="10" />
									<line x1="30" y1="50" x2="130" y2="50" />
									<line x1="50" y1="90" x2="130" y2="90" />
								</svg>
							)
						}

					</nav>
				</header>
			</div>

			<div id="menu_div" className={`${styles.menu_div} ${ralewaySemiBold.className}`} ref={menuDivRef}>
				<svg role='button' aria-label='close header' onClick={closeMobileMenu} className={`${styles.menu_icon}`} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
					<line x1="10" y1="10" x2="90" y2="90" />
					<line x1="10" y1="90" x2="90" y2="10" />
				</svg>
				<div className={`${styles.menu}`}>
					<ol>
						{menuItems.map((item, index) => (
							<HeaderItem key={item} name={item} delay={calculateDelay(index)} onClick={closeMobileMenu} />
						))}
						<li>
							<a className={`button ${styles.button} `} href="#contact">
								<p>{t('contact')}</p>
								<svg className={`button_arrow ${styles.button_arrow}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 17.69 17.39">
									<g>
										<path className="path_1" d="M8.9 12.4 L8.9 12.4" />
										<path className="path_2" d="M16.2 5 8.9 12.4 1.5 5" />
									</g>
								</svg>
							</a>
						</li>
						<li>
							<LocaleSwitcher localeNames={localeNames}/>
						</li>
					</ol>
				</div>
			</div>
		</>


	);
}

interface HeaderItemProps {
	name: string;
	delay: number;
	onClick?: () => void;
}

const HeaderItem: React.FC<HeaderItemProps> = ({ name, delay, onClick }) => {
	const lowerName = name.toLowerCase();
	return (<AnimatedComponent delay={delay}>
		<li onClick={onClick} className={styles[lowerName]}>
			<a className={styles.not_button} href={`#${lowerName}`}>
				{name}
			</a>
		</li>
	</AnimatedComponent>
	)
}
